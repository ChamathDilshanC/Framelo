import { describe, expect, it } from "vitest";
import { NEBULA_TEMPLATE } from "./nebula-template";
import { buildTemplateLayers } from "./template-builder";
import { evaluateTransform } from "@/engine/animation/evaluate";
import { createProject } from "@/lib/project-factory";
import { parseProject } from "@/lib/validation/project-schema";
import { useProjectStore } from "@/store/project-store";
import { templateScreenUrl } from "./screen-artwork";

describe("Nebula's editable composition", () => {
  it("holds the phone independently in front of the hand and background word", () => {
    const { layers, deviceLayerId } = buildTemplateLayers(NEBULA_TEMPLATE, null);
    const phone = layers.find((layer) => layer.id === deviceLayerId)!;
    const hand = layers.find((layer) => layer.name === "Hand / warm silhouette")!;
    const word = layers.find((layer) => layer.metadata?.content === "NEBULA")!;
    expect(layers.filter((layer) => layer.type === "device")).toHaveLength(1);
    expect(hand.type).toBe("image");
    expect(word.transform.z).toBeLessThan(hand.transform.z);
    expect(hand.transform.z).toBeLessThan(phone.transform.z);
    expect(templateScreenUrl(phone.metadata?.screenArtwork)).toBe("/templates/nebula/player.svg");
    for (const layer of layers) {
      expect(evaluateTransform(layer, 0).opacity).toBe(0);
      expect(evaluateTransform(layer, 3)).toEqual(layer.transform);
      if (layer.name !== "Background / breathing glow") expect(evaluateTransform(layer, 6)).toEqual(layer.transform);
      for (let time = 0; time <= 6; time += 0.1) {
        expect(evaluateTransform(layer, time).opacity).toBeGreaterThanOrEqual(0);
        expect(evaluateTransform(layer, time).opacity).toBeLessThanOrEqual(layer.name === "Background / breathing glow" ? 0.095 : layer.transform.opacity);
      }
    }
  });

  it("replaces image/video screens without touching composition, and survives save/reload", () => {
    const project = createProject("Nebula test");
    useProjectStore.getState().loadProject(project);
    const { layers, deviceLayerId } = buildTemplateLayers(NEBULA_TEMPLATE, null);
    useProjectStore.getState().applyProjectTemplate(NEBULA_TEMPLATE, layers);
    const before = structuredClone(useProjectStore.getState().project!);
    for (const assetId of ["jpg-test", "mp4-test"]) {
      useProjectStore.getState().updateDeviceMetadata(deviceLayerId, { screenAssetId: assetId });
      const after = useProjectStore.getState().project!;
      expect(after.background).toEqual(before.background);
      for (const layer of after.layers) {
        const original = before.layers.find((entry) => entry.id === layer.id)!;
        if (layer.type !== "device") expect(layer).toEqual(original);
        expect(layer.transform).toEqual(original.transform);
        expect(layer.animations).toEqual(original.animations);
      }
      const restored = parseProject(JSON.parse(JSON.stringify(after)));
      expect(restored.ok, restored.error).toBe(true);
      expect(restored.project?.layers).toEqual(after.layers);
      expect(restored.project?.canvas).toMatchObject({ width: 1080, height: 1350, duration: 6 });
    }
  });
});
