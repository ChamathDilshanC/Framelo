import type * as THREE from "three";
import { waitForSceneTextures } from "./texture-cache";

import { prepareScreenVideosForCapture } from "@/engine/scene/screen-videos";
import { useEditorStore } from "@/store/editor-store";
import { paintBackground } from "@/engine/background/rasterize";
import { setTextTextureSharpness } from "@/engine/text/text-renderer";
import type { BackgroundConfig } from "@/types/background";

export interface SceneHandle {
  gl: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  /** Re-applies the editor's current frame after an off-size render. */
  invalidate: () => void;
}

let handle: SceneHandle | null = null;

/**
 * Bridge between the R3F canvas and non-React callers (the export service).
 * The canvas registers itself on mount and clears on unmount.
 */
export const sceneRegistry = {
  register(next: SceneHandle) {
    handle = next;
  },
  clear() {
    handle = null;
  },
  get(): SceneHandle | null {
    return handle;
  },
  isReady(): boolean {
    return handle !== null;
  },
};

export type CaptureMimeType = "image/png" | "image/jpeg" | "image/webp";

export interface CaptureOptions {
  width: number;
  height: number;
  transparent: boolean;
  mimeType?: CaptureMimeType;
  quality?: number;
  /**
   * The composition background. Backgrounds live in the DOM behind the WebGL
   * canvas, so export has to paint them back in underneath the 3D frame.
   */
  background?: BackgroundConfig;
  /** Object URL for an image background. */
  backgroundAssetUrl?: string | null;
}

export class SceneNotReadyError extends Error {
  constructor() {
    super("The 3D viewport is not ready yet");
    this.name = "SceneNotReadyError";
  }
}

/**
 * Render the live scene at an arbitrary resolution and read it back as a blob.
 *
 * The renderer is resized for one frame and restored immediately, so the
 * interactive viewport is never left at export resolution. The 3D frame is then
 * composited over the painted background, which is what makes an export match
 * the editor rather than approximate it.
 *
 * Requires `preserveDrawingBuffer` on the canvas.
 */
export async function captureFrame(options: CaptureOptions): Promise<Blob> {
  const output = await captureCanvas(options);
  return toBlob(output, options.mimeType ?? "image/png", options.quality);
}

/** Reusable frame surface for image and frame-by-frame video encoders. */
export async function captureCanvas(options: CaptureOptions): Promise<HTMLCanvasElement> {
  const current = handle;
  if (!current) throw new SceneNotReadyError();

  await prepareScreenVideosForCapture(useEditorStore.getState().currentTime);
  await waitForSceneTextures();
  // Texture promises resolve before React commits the image planes.
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  const { gl, scene, camera } = current;
  const canvas = gl.domElement;

  const previousSize = { width: canvas.width, height: canvas.height };
  const previousPixelRatio = gl.getPixelRatio();
  const previousAlpha = gl.getClearAlpha();
  const previousAspect = isPerspective(camera) ? camera.aspect : null;

  const width = Math.max(1, Math.round(options.width));
  const height = Math.max(1, Math.round(options.height));

  const frame = document.createElement("canvas");
  frame.width = width;
  frame.height = height;

  try {
    // An export renders the composition at its own resolution, where the
    // sharpest sampling of a text texture is bilinear rather than mipmapped.
    // Restored in the `finally` below, so the viewport is never left with the
    // filtering that would make it shimmer.
    setTextTextureSharpness(true);

    gl.setPixelRatio(1);
    gl.setSize(width, height, false);

    if (isPerspective(camera)) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    // The scene itself is always drawn on transparent: the background is a
    // separate layer, both here and in the editor.
    gl.setClearAlpha(0);
    gl.render(scene, camera);

    // Copied synchronously, in the same tick as the render.
    //
    // The editor's render loop is always running, so the drawing buffer only
    // holds this frame until R3F's next animation frame. Anything asynchronous
    // here — `createImageBitmap`, an await, a microtask that yields — races
    // that redraw and can capture a half-drawn scene.
    frame.getContext("2d")?.drawImage(canvas, 0, 0, width, height);
  } finally {
    setTextTextureSharpness(false);
    gl.setPixelRatio(previousPixelRatio);
    gl.setSize(
      previousSize.width / previousPixelRatio,
      previousSize.height / previousPixelRatio,
      false,
    );
    gl.setClearAlpha(previousAlpha);

    if (isPerspective(camera) && previousAspect !== null) {
      camera.aspect = previousAspect;
      camera.updateProjectionMatrix();
    }

    current.invalidate();
  }

  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;

  const ctx = output.getContext("2d");
  if (!ctx) throw new Error("A 2D canvas could not be created for the export");

  if (!options.transparent && options.background) {
    await paintBackground(ctx, options.background, {
      width,
      height,
      assetUrl: options.backgroundAssetUrl,
    });
  }

  ctx.drawImage(frame, 0, 0, width, height);
  frame.width = frame.height = 1;

  return output;
}

function isPerspective(camera: THREE.Camera): camera is THREE.PerspectiveCamera {
  return (camera as THREE.PerspectiveCamera).isPerspectiveCamera === true;
}

function toBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.type === mimeType) resolve(blob);
        else if (blob) reject(new Error(`This browser cannot encode ${mimeType}. Choose PNG instead.`));
        else reject(new Error("The canvas could not be encoded"));
      },
      mimeType,
      quality,
    );
  });
}
