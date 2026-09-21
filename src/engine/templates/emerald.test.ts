import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { evaluateTransform } from "@/engine/animation/evaluate";
import { createProject } from "@/lib/project-factory";
import { parseProject } from "@/lib/validation/project-schema";
import { useProjectStore } from "@/store/project-store";
import { validatePatternCss } from "@/engine/background/css-safety";

import { EMERALD_TEMPLATE } from "./emerald-template";
import { templateScreenUrl } from "./screen-artwork";
import { buildTemplateLayers } from "./template-builder";

const store = () => useProjectStore.getState();

/** Poster pixels → world units on the 1080 × 1350 canvas, as the template does. */
const UNIT = (2 * 7.6 * Math.tan((16 * Math.PI) / 180)) / 1350;
const HALF_WIDTH = (1080 * UNIT) / 2;
const HALF_HEIGHT = (1350 * UNIT) / 2;

describe("Emerald's editable composition", () => {
  it("is a real scene: a device, typography and ornament, never a flat image", () => {
    const { layers, deviceLayerId } = buildTemplateLayers(EMERALD_TEMPLATE, null);

    const devices = layers.filter((layer) => layer.type === "device");
    const texts = layers.filter((layer) => layer.type === "text");
    const images = layers.filter((layer) => layer.type === "image");

    expect(devices).toHaveLength(1);
    expect(devices[0].id).toBe(deviceLayerId);
    expect(texts.length).toBe(EMERALD_TEMPLATE.textLayers!.length);
    expect(images.length).toBe(EMERALD_TEMPLATE.imageLayers!.length);

    // Every headline, every ornament: named, unlocked and editable.
    for (const layer of layers) {
      expect(layer.locked, layer.name).toBe(false);
      expect(layer.visible, layer.name).toBe(true);
      expect(layer.name.length, layer.id).toBeGreaterThan(0);
    }
    expect(new Set(layers.map((layer) => layer.name)).size).toBe(layers.length);
  });

  it("ships every bundled asset it references", () => {
    const screen = templateScreenUrl(EMERALD_TEMPLATE.deviceLayers![0].screenArtwork);
    expect(screen).toBe("/templates/emerald/finance.svg");
    expect(existsSync(`public${screen}`)).toBe(true);

    for (const spec of EMERALD_TEMPLATE.imageLayers!) {
      expect(existsSync(`public${spec.src}`), spec.src).toBe(true);
    }
  });

  it("holds a background the CSS validator accepts unchanged", () => {
    // Stored pattern CSS is re-validated on every load, so a template whose
    // gradients the validator strips would look different after a reload than
    // it did when it was applied.
    const background = EMERALD_TEMPLATE.background;
    expect(background.type).toBe("pattern");
    if (background.type !== "pattern") return;

    const checked = validatePatternCss(background.css);
    expect(checked.errors).toEqual({});
    expect(checked.css).toEqual(background.css);
  });

  it("places one oversized phone upper-right, behind the typography", () => {
    const { layers, deviceLayerId } = buildTemplateLayers(EMERALD_TEMPLATE, null);
    const phone = layers.find((layer) => layer.id === deviceLayerId)!;

    // Large enough to dominate: a device is three world units tall at scale 1,
    // and the whole poster is only ~4.36.
    expect(phone.transform.scaleX).toBeGreaterThan(1.2);
    expect(phone.transform.x).toBeGreaterThan(0.4);
    expect(phone.transform.rotationY).toBeGreaterThan(10);
    expect(phone.transform.rotationZ).toBeLessThan(0);

    // Behind every word, so the headline can cross it the way the poster does.
    const front = layers.filter((layer) => layer.type !== "device");
    for (const layer of front) {
      if (layer.name.startsWith("Background")) {
        expect(layer.transform.z, layer.name).toBeLessThan(phone.transform.z);
      } else {
        expect(layer.transform.z, layer.name).toBeGreaterThan(phone.transform.z);
      }
    }
  });

  it("keeps the headline, copy and call to action inside the left half of the canvas", () => {
    const { layers } = buildTemplateLayers(EMERALD_TEMPLATE, null);

    for (const name of ["Headline", "Body copy", "CTA container", "CTA label"]) {
      const layer = layers.find((entry) => entry.name === name)!;
      expect(layer, name).toBeDefined();
      expect(layer.transform.x, name).toBeLessThan(0);
      expect(Math.abs(layer.transform.x), name).toBeLessThan(HALF_WIDTH);
      expect(Math.abs(layer.transform.y), name).toBeLessThan(HALF_HEIGHT);
    }

    const headline = layers.find((entry) => entry.name === "Headline")!;
    expect(headline.metadata?.content).toBe("What if you\nhad access to\nthis service?");
    expect(headline.metadata?.textAlign).toBe("left");
  });

  it("animates in over the first three seconds and then holds", () => {
    const { layers } = buildTemplateLayers(EMERALD_TEMPLATE, null);

    for (const layer of layers) {
      expect(evaluateTransform(layer, 0).opacity, layer.name).toBe(0);
      expect(layer.animations.length, layer.name).toBeGreaterThan(0);

      // Settled by three seconds, and still settled at the end — apart from
      // the one layer that is allowed a deliberate slow drift.
      const drifts = layer.name === "Background / emerald atmosphere";
      if (!drifts) {
        expect(evaluateTransform(layer, 3), layer.name).toEqual(layer.transform);
        expect(evaluateTransform(layer, 6), layer.name).toEqual(layer.transform);
      }

      for (let time = 0; time <= 6; time += 0.1) {
        const opacity = evaluateTransform(layer, time).opacity;
        expect(opacity, `${layer.name} @ ${time}`).toBeGreaterThanOrEqual(0);
        expect(opacity, `${layer.name} @ ${time}`).toBeLessThanOrEqual(
          drifts ? 0.4 : layer.transform.opacity,
        );
      }
    }
  });

  it("starts the phone larger and further upper-right, with no bounce anywhere", () => {
    const { layers, deviceLayerId } = buildTemplateLayers(EMERALD_TEMPLATE, null);
    const phone = layers.find((layer) => layer.id === deviceLayerId)!;

    const start = evaluateTransform(phone, 0);
    expect(start.opacity).toBe(0);
    expect(start.x).toBeGreaterThan(phone.transform.x);
    expect(start.y).toBeGreaterThan(phone.transform.y);
    expect(start.scaleX).toBeGreaterThan(phone.transform.scaleX);

    // Eased, never overshooting: a value that passed its target and came back
    // is a bounce, which this composition deliberately has none of.
    for (let time = 0; time <= 1.6; time += 0.02) {
      const at = evaluateTransform(phone, time);
      expect(at.scaleX, `scale @ ${time}`).toBeGreaterThanOrEqual(phone.transform.scaleX - 1e-9);
      expect(at.x, `x @ ${time}`).toBeGreaterThanOrEqual(phone.transform.x - 1e-9);
    }

    for (const layer of layers) {
      for (const track of layer.animations) {
        for (const keyframe of track.keyframes) {
          expect(keyframe.easing, `${layer.name} → ${track.property}`).toBe("expo");
          expect(Number.isFinite(keyframe.value)).toBe(true);
        }
      }
    }
  });

  it("replaces the screen with an image or a video without touching anything else", () => {
    store().loadProject(createProject("Emerald test"));
    const { layers, deviceLayerId } = buildTemplateLayers(EMERALD_TEMPLATE, null);
    store().applyProjectTemplate(EMERALD_TEMPLATE, layers);

    const before = structuredClone(store().project!);
    expect(before.canvas).toMatchObject({ width: 1080, height: 1350, duration: 6 });

    for (const assetId of ["png-test", "webp-test", "mp4-test", "webm-test"]) {
      store().updateDeviceMetadata(deviceLayerId, { screenAssetId: assetId });
      const after = store().project!;

      expect(after.background).toEqual(before.background);
      expect(after.canvas).toEqual(before.canvas);
      for (const layer of after.layers) {
        const original = before.layers.find((entry) => entry.id === layer.id)!;
        expect(layer.transform, layer.name).toEqual(original.transform);
        expect(layer.animations, layer.name).toEqual(original.animations);
        if (layer.type !== "device") expect(layer, layer.name).toEqual(original);
      }

      const device = after.layers.find((layer) => layer.id === deviceLayerId)!;
      expect(device.metadata?.screenAssetId).toBe(assetId);
      // The bundled artwork stays as the fallback, so clearing the upload
      // brings the placeholder dashboard back rather than a blank screen.
      expect(device.metadata?.screenArtwork).toBe("emerald");
    }
  });

  it("survives a save, a reload and an undo as ordinary project data", () => {
    store().loadProject(createProject("Emerald persistence"));
    const { layers, deviceLayerId } = buildTemplateLayers(EMERALD_TEMPLATE, null);
    store().applyProjectTemplate(EMERALD_TEMPLATE, layers);
    store().updateDeviceMetadata(deviceLayerId, { screenAssetId: "uploaded", screenFit: "contain" });

    const applied = structuredClone(store().project!);
    const restored = parseProject(JSON.parse(JSON.stringify(applied)));
    expect(restored.ok, restored.error).toBe(true);

    expect(restored.project?.layers).toEqual(applied.layers);
    expect(restored.project?.background).toEqual(applied.background);
    expect(restored.project?.canvas).toEqual(applied.canvas);
    expect(restored.project?.templateId).toBe("emerald-finance-showcase");
    expect(restored.project?.editorState?.selectedLayerId).toBe(deviceLayerId);

    store().undo();
    store().redo();
    expect(store().project?.layers).toEqual(applied.layers);
  });
});
