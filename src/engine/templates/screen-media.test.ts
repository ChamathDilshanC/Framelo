import { describe, expect, it } from "vitest";
import { videoTimeAt } from "@/engine/scene/screen-videos";
import { validateMediaFile } from "@/lib/validation/upload";
import { PROJECT_TEMPLATES } from "@/engine/templates/project-templates";
import { buildTemplateLayers } from "@/engine/templates/template-builder";
import { createProject } from "@/lib/project-factory";
import { parseProject } from "@/lib/validation/project-schema";
import { useProjectStore } from "@/store/project-store";

const file = (name: string, type: string, size: number) => ({ name, type, size }) as File;

describe("screen video media", () => {
  it("accepts MP4 and WebM and rejects unsupported or oversized media", () => {
    expect(validateMediaFile(file("demo.mp4", "video/mp4", 1000)).ok).toBe(true);
    expect(validateMediaFile(file("demo.webm", "video/webm", 1000)).ok).toBe(true);
    expect(validateMediaFile(file("demo.mov", "video/quicktime", 1000)).ok).toBe(false);
    expect(validateMediaFile(file("huge.mp4", "video/mp4", 151 * 1024 * 1024)).ok).toBe(false);
  });

  it("maps the project playhead to a looping or held video frame", () => {
    expect(videoTimeAt(0, 3, true)).toBe(0);
    expect(videoTimeAt(2.5, 3, true)).toBe(2.5);
    expect(videoTimeAt(3.5, 3, true)).toBe(0.5);
    expect(videoTimeAt(3.5, 3, false)).toBeCloseTo(2.999, 3);
  });

  it("changes only the selected phone and keeps its video settings after reload", () => {
    const project = createProject();
    const store = () => useProjectStore.getState();
    store().loadProject(project);
    store().applyProjectTemplate(PROJECT_TEMPLATES[0], buildTemplateLayers(PROJECT_TEMPLATES[0], project.layers[0]).layers);
    const before = structuredClone(store().project!.layers);
    const rear = before[1];
    store().updateDeviceMetadata(rear.id, { screenAssetId: "mp4-asset", videoLoop: false, videoMuted: true });
    const after = store().project!.layers;
    expect(after[0]).toEqual(before[0]);
    expect(after[2]).toEqual(before[2]);
    expect(after[1].transform).toEqual(rear.transform);
    expect(after[1].animations).toEqual(rear.animations);
    const round = parseProject(JSON.parse(JSON.stringify(store().project)));
    expect(round.ok).toBe(true);
    expect(round.project?.layers[1].metadata?.screenAssetId).toBe("mp4-asset");
    expect(round.project?.layers[1].metadata?.videoLoop).toBe(false);
  });
});
