import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import { createProject } from "@/lib/project-factory";
import { exportService, type ExportRequest } from "./export-service";
import { videoFramePlan } from "./video-export";

const mocks = vi.hoisted(() => ({ add: vi.fn(), cancel: vi.fn(), finalize: vi.fn(), capture: vi.fn(), codec: vi.fn(), capturedTimes: [] as number[] }));
vi.mock("@/engine/devices/model-loader", () => ({ waitForDeviceModels: vi.fn(async () => {}) }));
vi.mock("@/engine/scene/capture", () => ({ captureCanvas: mocks.capture, captureFrame: vi.fn(async () => new Blob(["png"], { type: "image/png" })) }));
vi.mock("mediabunny", () => ({
  BufferTarget: class { buffer = new ArrayBuffer(16); },
  CanvasSource: class { add = mocks.add; },
  Quality: class {}, Mp4OutputFormat: class {}, WebMOutputFormat: class {},
  getFirstEncodableVideoCodec: mocks.codec,
  Output: class {
    state = "pending";
    addVideoTrack() {}
    async start() { this.state = "started"; }
    async cancel() { this.state = "canceled"; mocks.cancel(); }
    async finalize() { mocks.finalize(); this.state = "finalized"; }
  },
}));
const request: ExportRequest = { format: "mp4", width: 1920, height: 1080, transparent: false, name: "Motion", fps: 30, startTime: 2, endTime: 2.1 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.capturedTimes.length = 0;
  mocks.codec.mockResolvedValue("avc");
  mocks.add.mockResolvedValue(undefined);
  mocks.capture.mockImplementation(async () => { mocks.capturedTimes.push(useEditorStore.getState().currentTime); return { width: 1920, height: 1080 }; });
  vi.stubGlobal("document", { fonts: { ready: Promise.resolve() }, createElement: () => ({ width: 0, height: 0, getContext: () => ({ clearRect() {}, fillRect() {}, drawImage() {} }) }) });
  useProjectStore.getState().loadProject(createProject());
  useEditorStore.setState({ currentTime: 1.5, isPlaying: true, isExporting: false, duration: 6 });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("frame-by-frame export", () => {
  it("uses exact frame timestamps and an exclusive work-area end", async () => {
    const project = useProjectStore.getState().project;
    const result = await exportService.run(request);
    expect(result.filename).toBe("Motion.mp4");
    expect(result.mimeType).toBe("video/mp4");
    expect(mocks.capturedTimes).toEqual([2, 2 + 1/30, 2 + 2/30]);
    expect(mocks.add.mock.calls.map(call => call[0])).toEqual([0, 1/30, 2/30]);
    expect(mocks.finalize).toHaveBeenCalledOnce();
    expect(useEditorStore.getState()).toMatchObject({ currentTime: 1.5, isPlaying: true, isExporting: false });
    expect(useProjectStore.getState().project).toBe(project);
    exportService.release(result);
  });
  it("cancels without finalizing and restores playback", async () => {
    const controller = new AbortController();
    mocks.add.mockImplementationOnce(async () => controller.abort());
    await expect(exportService.run({ ...request, signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(mocks.add).toHaveBeenCalledOnce();
    expect(mocks.cancel).toHaveBeenCalledOnce();
    expect(mocks.finalize).not.toHaveBeenCalled();
    expect(useEditorStore.getState()).toMatchObject({ currentTime: 1.5, isPlaying: true, isExporting: false });
  });
  it("reports unsupported encoding before rendering", async () => {
    mocks.codec.mockResolvedValue(null);
    await expect(exportService.run(request)).rejects.toThrow("cannot encode MP4");
    expect(mocks.capture).not.toHaveBeenCalled();
    expect(useEditorStore.getState().isExporting).toBe(false);
  });
  it("cleans up an encoder failure", async () => {
    mocks.add.mockRejectedValueOnce(new Error("Encoder lost"));
    await expect(exportService.run(request)).rejects.toThrow("Encoder lost");
    expect(mocks.cancel).toHaveBeenCalledOnce();
    expect(useEditorStore.getState().currentTime).toBe(1.5);
  });
  it("exports WebM with the proper MIME and extension", async () => {
    const result = await exportService.run({ ...request, format: "webm", transparent: true });
    expect(result.filename).toBe("Motion.webm");
    expect(result.blob.type).toBe("video/webm");
    expect(mocks.capture.mock.calls[0][0].transparent).toBe(true);
    exportService.release(result);
  });
  it("supports all five exposed formats", () => {
    for (const format of ["png", "jpg", "webp", "mp4", "webm"] as const) expect(exportService.isSupported(format)).toBe(true);
  });
  it("retains a partial final frame without extending the requested duration", () => {
    const plan = videoFramePlan(1, 1.105, 30);
    expect(plan.count).toBe(4);
    expect(plan.duration).toBeCloseTo(0.105);
    expect(videoFramePlan(0, 6, 60).count).toBe(360);
    expect(() => videoFramePlan(1, 1, 30)).toThrow();
    expect(() => videoFramePlan(0, 6, 0)).toThrow();
  });
});
