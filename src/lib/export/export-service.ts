import { waitForDeviceModels } from "@/engine/devices/model-loader";
import { captureFrame, type CaptureMimeType } from "@/engine/scene/capture";
import { useEditorStore } from "@/store/editor-store";
import { presetPreview } from "@/engine/motion/preset-preview";
import type { BackgroundConfig } from "@/types/background";

export type ExportFormat = "png" | "jpg" | "webp" | "webm" | "mp4" | "gif";

const IMAGE_MIME_TYPES: Record<string, CaptureMimeType> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

/** Formats that carry an alpha channel. */
const ALPHA_FORMATS = new Set<ExportFormat>(["png", "webp", "webm"]);

export function supportsTransparency(format: ExportFormat): boolean {
  return ALPHA_FORMATS.has(format);
}

export interface ExportRequest {
  format: ExportFormat;
  width: number;
  height: number;
  transparent: boolean;
  /** Base filename, without extension. */
  name: string;
  quality?: number;
  fps?: number;
  startTime?: number;
  endTime?: number;
  signal?: AbortSignal;
  /**
   * The composition background. Backgrounds are a DOM layer behind the canvas,
   * so export has to paint them back underneath the 3D frame.
   */
  background?: BackgroundConfig;
  backgroundAssetUrl?: string | null;
}

export interface ExportResult {
  blob: Blob;
  url: string;
  filename: string;
  mimeType: string;
  bytes: number;
}

export type ProgressHandler = (progress: number) => void;

export class ExportNotSupportedError extends Error {
  constructor(public readonly format: ExportFormat) {
    super(`${format.toUpperCase()} export is not available in this version yet.`);
    this.name = "ExportNotSupportedError";
  }
}

interface Exporter {
  readonly formats: ExportFormat[];
  readonly supported: boolean;
  run(request: ExportRequest, onProgress: ProgressHandler): Promise<ExportResult>;
}

/**
 * Still-image exporter. Renders the live scene at the requested resolution.
 *
 * The export is a render of the real viewport, so whatever the editor shows —
 * the photorealistic device, its screen image, the lighting, the shadow and the
 * background — is what lands in the file.
 */
const imageExporter: Exporter = {
  formats: ["png", "jpg", "webp"],
  supported: true,
  async run(request, onProgress) {
    const mimeType = IMAGE_MIME_TYPES[request.format] ?? "image/png";
    onProgress(0.05);

    // Exporting mid-download would capture an empty stage or the fallback
    // device. The frame is only worth reading back once the models are in.
    await waitForDeviceModels();
    onProgress(0.15);

    const blob = await captureFrame({
      width: Math.round(request.width),
      height: Math.round(request.height),
      // JPEG has no alpha channel, so transparency only applies to PNG and WebP.
      transparent: request.transparent && supportsTransparency(request.format),
      mimeType,
      quality: request.quality ?? 0.92,
      background: request.background,
      backgroundAssetUrl: request.backgroundAssetUrl,
    });

    onProgress(0.9);

    const url = URL.createObjectURL(blob);
    onProgress(1);

    return {
      blob,
      url,
      filename: `${sanitizeFilename(request.name)}.${request.format}`,
      mimeType,
      bytes: blob.size,
    };
  },
};

const videoExporter: Exporter = {
  formats: ["webm", "mp4"],
  supported: true,
  async run(request, onProgress) {
    const { renderVideo } = await import("./video-export");
    return renderVideo(request, onProgress);
  },
};

const EXPORTERS: Exporter[] = [imageExporter, videoExporter];

function findExporter(format: ExportFormat): Exporter | undefined {
  return EXPORTERS.find((exporter) => exporter.formats.includes(format));
}

export const exportService = {
  isSupported(format: ExportFormat): boolean {
    return findExporter(format)?.supported ?? false;
  },

  async run(request: ExportRequest, onProgress: ProgressHandler = () => {}): Promise<ExportResult> {
    const exporter = findExporter(request.format);
    if (!exporter) throw new ExportNotSupportedError(request.format);
    if (!exporter.supported) throw new ExportNotSupportedError(request.format);
    const editor = useEditorStore.getState();
    if (editor.isExporting) throw new Error("An export is already running.");
    request.signal?.throwIfAborted();
    presetPreview.stop();
    useEditorStore.setState({ isExporting: true, isPlaying: false });
    try {
      await document.fonts?.ready;
      const result = await exporter.run(request, onProgress);
      if (request.signal?.aborted) {
        URL.revokeObjectURL(result.url);
        request.signal.throwIfAborted();
      }
      return result;
    } finally {
      useEditorStore.setState({ currentTime: editor.currentTime, isPlaying: editor.isPlaying, isExporting: false });
    }
  },

  download(result: ExportResult): void {
    const link = document.createElement("a");
    link.href = result.url;
    link.download = result.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  release(result: ExportResult): void {
    URL.revokeObjectURL(result.url);
  },
};

export function sanitizeFilename(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  return cleaned || "framelo-export";
}
