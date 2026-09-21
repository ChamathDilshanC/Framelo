import { BufferTarget, CanvasSource, Output, Mp4OutputFormat, WebMOutputFormat, Quality, getFirstEncodableVideoCodec } from "mediabunny";
import { waitForDeviceModels } from "@/engine/devices/model-loader";
import { paintBackground } from "@/engine/background/rasterize";
import { captureCanvas } from "@/engine/scene/capture";
import { useEditorStore } from "@/store/editor-store";
import { sanitizeFilename, type ExportRequest, type ExportResult, type ProgressHandler } from "./export-service";

/** End is exclusive; the final sample is shortened for non-frame-aligned ranges. */
export function videoFramePlan(start: number, end: number, fps: number) {
  if (![start, end, fps].every(Number.isFinite) || start < 0 || end <= start || fps < 1 || fps > 120) {
    throw new Error("Choose a valid export range and a frame rate between 1 and 120.");
  }
  const duration = end - start;
  return { count: Math.ceil(duration * fps - 1e-8), duration, fps, start };
}

/** Offline encoding: render time never changes the output frame rate. */
export async function renderVideo(request: ExportRequest, progress: ProgressHandler): Promise<ExportResult> {
  const plan = videoFramePlan(request.startTime ?? 0, request.endTime ?? useEditorStore.getState().duration, request.fps ?? 30);
  const width = Math.round(request.width);
  const height = Math.round(request.height);
  if (width < 2 || height < 2 || width % 2 || height % 2) throw new Error("Video dimensions must be positive even numbers. Choose another resolution or canvas size.");
  const format = request.format === "mp4" ? new Mp4OutputFormat({ fastStart: "in-memory" }) : new WebMOutputFormat();
  const codec = await getFirstEncodableVideoCodec(request.format === "mp4" ? ["avc"] : ["vp9", "vp8"], { width, height, frameRate: plan.fps });
  if (!codec) throw new Error(`This browser cannot encode ${request.format.toUpperCase()} at ${width} × ${height}. Try a lower resolution or another browser.`);
  request.signal?.throwIfAborted();
  progress(0.02);
  await waitForDeviceModels();
  request.signal?.throwIfAborted();
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The export canvas could not be created.");
  const transparent = request.transparent && request.format === "webm";
  const background = document.createElement("canvas");
  background.width = width; background.height = height;
  const backgroundContext = background.getContext("2d");
  if (!backgroundContext) throw new Error("The background canvas could not be created.");
  if (!transparent) {
    backgroundContext.fillStyle = "#000000";
    backgroundContext.fillRect(0, 0, width, height);
    if (request.background) await paintBackground(backgroundContext, request.background, { width, height, assetUrl: request.backgroundAssetUrl });
  }
  const target = new BufferTarget();
  const output = new Output({ format, target });
  const source = new CanvasSource(canvas, { codec, quality: new Quality("high"), alpha: transparent ? "keep" : "discard" });
  output.addVideoTrack(source, { frameRate: plan.fps });
  try {
    await output.start();
    for (let index = 0; index < plan.count; index++) {
      request.signal?.throwIfAborted();
      const timestamp = index / plan.fps;
      // Preserve sub-frame precision: UI scrub rounding can seek just before a video frame boundary.
      useEditorStore.setState({ currentTime: plan.start + timestamp });
      const frame = await captureCanvas({ ...request, transparent: true });
      try {
        request.signal?.throwIfAborted();
        context.clearRect(0, 0, width, height);
        if (!transparent) context.drawImage(background, 0, 0);
        context.drawImage(frame, 0, 0);
        await source.add(timestamp, Math.min(1 / plan.fps, plan.duration - timestamp), { keyFrame: index % (plan.fps * 2) === 0 });
      } finally {
        frame.width = frame.height = 1;
      }
      progress(0.05 + 0.9 * (index + 1) / plan.count);
    }
    request.signal?.throwIfAborted();
    await output.finalize();
    request.signal?.throwIfAborted();
    if (!target.buffer) throw new Error("The encoder did not produce a video.");
    const mimeType = request.format === "mp4" ? "video/mp4" : "video/webm";
    const blob = new Blob([target.buffer], { type: mimeType });
    progress(1);
    return { blob, url: URL.createObjectURL(blob), filename: `${sanitizeFilename(request.name)}.${request.format}`, mimeType, bytes: blob.size };
  } catch (error) {
    if (output.state !== "finalized" && output.state !== "canceled") await output.cancel().catch(() => {});
    throw error;
  } finally {
    canvas.width = canvas.height = 1;
    background.width = background.height = 1;
  }
}
