"use client";

import { Canvas } from "@react-three/fiber";
import { Frame, Maximize2, Move3d, RotateCcw } from "lucide-react";
import * as React from "react";
import * as THREE from "three";

import { DEVICE_TONE_MAPPING_EXPOSURE } from "@/components/devices/DeviceLighting";

import { BackgroundRenderer } from "@/components/canvas/BackgroundRenderer";
import { ContextRecovery } from "@/components/canvas/ContextRecovery";
import { pickDeviceAt } from "@/engine/scene/device-picking";
import { useAssetStore } from "@/store/asset-store";
import { useProjectStore } from "@/store/project-store";
import { Scene } from "@/components/canvas/Scene";
import { TextCanvasOverlay } from "@/components/text/TextCanvasOverlay";
import { ViewportOverlay } from "@/components/canvas/ViewportOverlay";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { DeviceLoading } from "@/components/devices/DeviceLoading";
import type { DeviceLayerStatus } from "@/components/devices/DeviceRenderer";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useBackgroundAssetUrl } from "@/lib/hooks/use-background-asset";
import { notify } from "@/lib/toast";
import { useWebGLAvailable } from "@/lib/webgl";
import type { BackgroundConfig } from "@/types/background";
import type { Layer } from "@/types/layer";
import type { CanvasConfig } from "@/types/project";

interface EditorCanvasProps {
  canvas: CanvasConfig;
  background: BackgroundConfig;
  layers: Layer[];
}

/**
 * The viewport. The WebGL canvas is letterboxed to the composition aspect so
 * what you see is exactly what gets exported.
 */
export function EditorCanvas({ canvas, background, layers }: EditorCanvasProps) {
  const webglAvailable = useWebGLAvailable();
  const [contextLost, setContextLost] = React.useState(false);
  const [rendererVersion, setRendererVersion] = React.useState(0);
  const handleContextLost = React.useCallback(() => setContextLost(true), []);
  const restoreViewport = React.useCallback(() => {
    // Rebuild GPU-only resources (including the studio environment) as well
    // as the renderer. Project data and the saved orbit pose stay in stores.
    setRendererVersion((version) => version + 1);
    setContextLost(false);
  }, []);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null);
  const updateDeviceMetadata = useProjectStore((state) => state.updateDeviceMetadata);
  const { deviceStatus, handleDeviceStatus } = useDeviceStatus();
  const backgroundAssetUrl = useBackgroundAssetUrl(background);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const frame = useFittedFrame(containerRef, canvas.width / canvas.height);

  const transparent = background.type === "transparent";

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 items-center justify-center p-6 lg:p-10"
      >
        <div
          className="relative overflow-hidden rounded-md border border-line shadow-2xl shadow-black/50"
          style={{ width: frame.width, height: frame.height }}
          onDragOver={(event) => {
            if (!Array.from(event.dataTransfer.types).includes("application/x-framelo-screen-asset")) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
            const canvasElement = event.currentTarget.querySelector("canvas");
            setDropTargetId(canvasElement ? pickDeviceAt(event.clientX, event.clientY, canvasElement, layers) : null);
          }}
          onDragLeave={() => setDropTargetId(null)}
          onDrop={(event) => {
            const assetId = event.dataTransfer.getData("application/x-framelo-screen-asset");
            if (!assetId) return;
            event.preventDefault();
            const canvasElement = event.currentTarget.querySelector("canvas");
            const deviceId = canvasElement ? pickDeviceAt(event.clientX, event.clientY, canvasElement, layers) : null;
            setDropTargetId(null);
            if (!deviceId || !useAssetStore.getState().getAsset(assetId)) return;
            updateDeviceMetadata(deviceId, { screenAssetId: assetId });
            notify.success("Applied to device screen", layers.find((layer) => layer.id === deviceId)?.name);
          }}
        >
          {transparent ? <TransparencyGrid /> : null}
          <BackgroundRenderer
            background={background}
            assetUrl={backgroundAssetUrl}
            className="absolute inset-0"
          />

          <ErrorBoundary
            key={rendererVersion}
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-canvas p-6">
                <Alert tone="danger" title="The 3D viewport could not start" className="max-w-sm">
                  WebGL is unavailable or was lost. Reload the page, or enable hardware
                  acceleration in your browser settings.
                </Alert>
              </div>
            }
          >
            {webglAvailable && frame.width > 0 ? (
              <Canvas
                className="!absolute inset-0"
                dpr={[1, 2]}
                frameloop={contextLost ? "never" : "always"}
                gl={{
                  antialias: true,
                  alpha: true,
                  // Required so the export service can read pixels back.
                  preserveDrawingBuffer: true,
                  toneMapping: THREE.ACESFilmicToneMapping,
                }}
                onCreated={({ gl }) => {
                  // Always transparent: the background is its own DOM layer.
                  gl.setClearColor(0x000000, 0);
                  // Neutral exposure. This was 1.25 to make brushed metal read
                  // like a product photo, but combined with the light rig it
                  // clipped mid-tones to white, so a chosen body colour never
                  // showed. Brightness belongs in the rig, where the total is
                  // visible in one place.
                  gl.toneMappingExposure = DEVICE_TONE_MAPPING_EXPOSURE;
                }}
              >
                <ContextRecovery onLost={handleContextLost} onRestored={restoreViewport} />
                <React.Suspense fallback={null}>
                  <Scene
                    layers={layers}
                    onScreenError={setScreenError}
                    onDeviceStatusChange={handleDeviceStatus}
                    dropTargetId={dropTargetId}
                  />
                </React.Suspense>
              </Canvas>
            ) : (
              webglAvailable ? <CanvasFallback /> : (
                <div className="absolute inset-0 flex items-center justify-center bg-canvas p-6">
                  <Alert
                    tone="danger"
                    title="3D viewport unavailable"
                    className="max-w-sm"
                  >
                    WebGL is disabled in this browser environment. Enable hardware
                    acceleration or use a WebGL-enabled browser to preview and export
                    3D device scenes.
                  </Alert>
                </div>
              )
            )}
          </ErrorBoundary>

          {contextLost ? (
            <div role="status" className="absolute inset-0 z-30 flex items-center justify-center bg-canvas p-6">
              <Alert tone="warning" title="Restoring the 3D viewport" className="max-w-sm">
                <p>The graphics connection was interrupted. Your project is safe.</p>
                <button type="button" onClick={restoreViewport}
                  className="mt-3 rounded-sm bg-accent px-3 py-1.5 text-accent-ink">
                  Restore viewport
                </button>
              </Alert>
            </div>
          ) : null}

          {deviceStatus?.model === "loading" ? (
            <DeviceLoading deviceName={deviceStatus.deviceName} />
          ) : null}

          {/*
            Above the WebGL surface, below the viewport chrome. The text
            itself is rendered in the scene; this is the selection box, the
            handles and the editing field that sit on top of it.
          */}
          <TextCanvasOverlay layers={layers} frame={frame} />

          <ViewportOverlay canvas={canvas} />
          {dropTargetId ? <div className="pointer-events-none absolute inset-0 z-10 rounded-md border-2 border-accent/80 bg-accent/5">
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-sm bg-surface/90 px-2 py-1 text-[10px] text-accent">
              Drop onto {layers.find((layer) => layer.id === dropTargetId)?.name}
            </span>
          </div> : null}
        </div>
      </div>

      {deviceStatus?.usingFallback && deviceStatus.modelError ? (
        <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-6">
          <Alert tone="warning" title="Showing the fallback device" className="pointer-events-auto max-w-md">
            {deviceStatus.modelError} The editor stays fully usable — transforms, keyframes and
            export all work on the fallback.
          </Alert>
        </div>
      ) : null}

      {screenError ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex justify-center px-6">
          <Alert tone="warning" title="Screen media failed to load" className="pointer-events-auto max-w-md">
            {screenError} The device still renders with an empty screen.
          </Alert>
        </div>
      ) : null}

      <ViewportHints />
    </div>
  );
}

/**
 * Tracks the device model's load state and announces the transitions.
 *
 * Toasts fire on the edge, not on every render: a model that loads once should
 * say so once, and a fallback should be announced when it takes over rather
 * than every time the layer re-renders.
 */
function useDeviceStatus() {
  const [deviceStatus, setDeviceStatus] = React.useState<DeviceLayerStatus | null>(null);
  const announced = React.useRef<string | null>(null);

  const handleDeviceStatus = React.useCallback((status: DeviceLayerStatus) => {
    setDeviceStatus(status);

    const key = `${status.layerId}:${status.deviceName}:${status.model}`;
    if (announced.current === key) return;
    announced.current = key;

    if (status.model === "ready") {
      notify.success(`${status.deviceName} loaded`, "Photorealistic model ready.");
    } else if (status.model === "error") {
      notify.error(
        "Unable to load the 3D device",
        status.modelError ?? "Using fallback model.",
      );
    }
  }, []);

  return { deviceStatus, handleDeviceStatus };
}

/** Measures the container and returns the largest box of `aspect` that fits. */
function useFittedFrame(
  ref: React.RefObject<HTMLDivElement | null>,
  aspect: number,
): { width: number; height: number } {
  const [box, setBox] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ width, height });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return React.useMemo(() => {
    if (box.width <= 0 || box.height <= 0) return { width: 0, height: 0 };
    const byWidth = { width: box.width, height: box.width / aspect };
    if (byWidth.height <= box.height) {
      return { width: Math.floor(byWidth.width), height: Math.floor(byWidth.height) };
    }
    return { width: Math.floor(box.height * aspect), height: Math.floor(box.height) };
  }, [box, aspect]);
}

function CanvasFallback() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-canvas">
      <Spinner />
      <p className="text-[11px] text-ink-subtle">Preparing viewport…</p>
    </div>
  );
}

function TransparencyGrid() {
  return (
    <div
      aria-hidden
      className="absolute inset-0"
      style={{
        // Themed: a dark checkerboard under a light editor would read as a
        // deliberate background rather than as "there isn't one".
        backgroundImage:
          "linear-gradient(45deg, var(--framelo-checker-b) 25%, transparent 25%), linear-gradient(-45deg, var(--framelo-checker-b) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--framelo-checker-b) 75%), linear-gradient(-45deg, transparent 75%, var(--framelo-checker-b) 75%)",
        backgroundSize: "16px 16px",
        backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
        backgroundColor: "var(--framelo-checker-a)",
      }}
    />
  );
}

function ViewportHints() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 hidden justify-center xl:flex">
      <p className="flex items-center gap-4 text-[10px] text-ink-subtle">
        <span className="flex items-center gap-1">
          <Move3d className="h-3 w-3" /> Drag to orbit
        </span>
        <span className="flex items-center gap-1">
          <Maximize2 className="h-3 w-3" /> Scroll to zoom
        </span>
        <span className="flex items-center gap-1">
          <RotateCcw className="h-3 w-3" /> 0 resets view
        </span>
        <span className="flex items-center gap-1">
          <Frame className="h-3 w-3" /> F fits frame
        </span>
      </p>
    </div>
  );
}
