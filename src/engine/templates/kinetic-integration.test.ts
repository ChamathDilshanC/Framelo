import { describe, expect, it } from "vitest";
import { PROJECT_TEMPLATES } from "@/engine/templates/project-templates";
import { buildTemplateLayers } from "@/engine/templates/template-builder";
import { templateScreenUrl } from "@/engine/templates/screen-artwork";
import { createProject } from "@/lib/project-factory";
import { parseProject } from "@/lib/validation/project-schema";
import { useProjectStore } from "@/store/project-store";

const store = () => useProjectStore.getState();
const template = PROJECT_TEMPLATES[0];

describe("kinetic template project integration", () => {
  it("replaces the composition in one undo step and resets an old work area", () => {
    const original = createProject();
    original.canvas.workArea = { in: 4, out: 5, enabled: true };
    store().loadProject(original);
    store().applyProjectTemplate(template, buildTemplateLayers(template, original.layers[0]).layers);
    const applied = structuredClone(store().project);
    expect(applied?.canvas.workArea).toEqual({ in: 0, out: 6, enabled: false });
    expect(applied?.layers).toHaveLength(6);
    store().undo();
    expect(store().project?.layers).toEqual(original.layers);
    expect(store().project?.canvas).toEqual(original.canvas);
    store().redo();
    expect(store().project?.layers).toEqual(applied?.layers);
    expect(store().project?.background).toEqual(applied?.background);
  });

  it("replaces each screen independently and persists every layer and keyframe", () => {
    const original = createProject();
    store().loadProject(original);
    store().applyProjectTemplate(template, buildTemplateLayers(template, original.layers[0]).layers);
    const devices = store().project!.layers.filter((layer) => layer.type === "device");
    devices.forEach((device, index) => {
      expect(templateScreenUrl(device.metadata?.screenArtwork)).toMatch(/^\/templates\/kinetic\//);
      store().updateDeviceMetadata(device.id, { screenAssetId: `upload-${index}` });
    });
    const result = parseProject(JSON.parse(JSON.stringify(store().project)));
    expect(result.ok, result.error).toBe(true);
    expect(result.project?.layers).toEqual(store().project?.layers);
    expect(result.project?.background).toEqual(template.background);
    result.project!.layers.filter((layer) => layer.type === "device").forEach((device, index) => {
      expect(device.metadata?.screenAssetId).toBe(`upload-${index}`);
      expect(device.animations).toEqual(devices[index].animations);
    });
    store().updateDeviceMetadata(devices[1].id, { screenAssetId: null });
    expect(store().project?.layers[0].metadata?.screenAssetId).toBe("upload-0");
    expect(store().project?.layers[1].metadata?.screenArtwork).toBe("manifesto");
  });
});
