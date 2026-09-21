import { describe, expect, it } from "vitest";

import { getMotionPreset } from "@/engine/motion/motion-presets";
import {
  PROJECT_TEMPLATES,
  TEMPLATE_CATEGORIES,
  activeTemplateCategories,
  getProjectTemplate,
  searchProjectTemplates,
  templateDeviceIds,
} from "@/engine/templates/project-templates";
import { buildTemplateLayers, templateSignature } from "@/engine/templates/template-builder";
import { evaluateTransform } from "@/engine/animation/evaluate";
import { nameFromContent } from "@/engine/text/text-types";
import { getDevice } from "@/devices/registry";
import { createDeviceLayer } from "@/lib/project-factory";
import { IDENTITY_TRANSFORM } from "@/types/layer";

describe("the template catalogue", () => {
  it("preserves mobile and replaces the old studio entries with exactly six scenes", () => {
    expect(PROJECT_TEMPLATES.map((template) => template.id)).toEqual([
      "kinetic-mobile-presentation", "nebula-music-experience", "emerald-finance-showcase",
      "crimson-editorial-tablet", "neon-portfolio-tablet", "midnight-sales-laptop",
      "floating-commerce-laptop", "amber-agency-ecosystem", "lime-digital-campaign",
    ]);
  });

  it("gives every template a unique id", () => {
    const ids = PROJECT_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every template a name, a description and tags", () => {
    for (const template of PROJECT_TEMPLATES) {
      expect(template.name.length, template.id).toBeGreaterThan(0);
      expect(template.description.length, template.id).toBeGreaterThan(10);
      expect(template.tags.length, template.id).toBeGreaterThan(1);
    }
  });

  it("only references presets that exist", () => {
    for (const template of PROJECT_TEMPLATES) {
      for (const presetId of template.motionPresetIds) {
        expect(getMotionPreset(presetId), `${template.id} → ${presetId}`).toBeDefined();
      }
      for (const text of template.textLayers ?? []) {
        for (const presetId of text.motionPresetIds ?? []) {
          expect(getMotionPreset(presetId), `${template.id} text → ${presetId}`).toBeDefined();
        }
      }
    }
  });
});

describe("templates are materially different", () => {
  it("no two share a composition", () => {
    // The signature deliberately excludes colour, so a template that differed
    // from another only in palette collides here — which is the failure this
    // whole suite exists to catch.
    const seen = new Map<string, string>();

    for (const template of PROJECT_TEMPLATES) {
      const signature = templateSignature(template);
      const clash = seen.get(signature);
      expect(clash, `${template.id} composes identically to ${clash}`).toBeUndefined();
      seen.set(signature, template.id);
    }
  });

  it("builds the portrait composition with three independently animated devices", () => {
    const template = PROJECT_TEMPLATES[0];
    expect(template.canvas).toEqual({ width: 1080, height: 1920, fps: 60, duration: 6 });
    const { layers } = buildTemplateLayers(template, null);
    const phones = layers.filter((layer) => layer.type === "device");
    expect(phones).toHaveLength(3);
    expect(new Set(phones.map((layer) => layer.transform.z)).size).toBe(3);
    expect(new Set(phones.map((layer) => layer.metadata?.screenArtwork)).size).toBe(3);
    phones.forEach((layer, index) => {
      const entrance = template.deviceLayers![index].entrance;
      expect(evaluateTransform(layer, 0).opacity).toBe(0);
      expect(evaluateTransform(layer, entrance.start).opacity).toBe(0);
      expect(evaluateTransform(layer, entrance.end)).toEqual(layer.transform);
      expect(evaluateTransform(layer, 6)).toEqual(layer.transform);
      for (let time = entrance.start; time < entrance.end; time += 0.05) {
        const evaluated = evaluateTransform(layer, time);
        expect(evaluated.opacity).toBeGreaterThanOrEqual(0);
        expect(evaluated.opacity).toBeLessThanOrEqual(1);
        expect(evaluated.y).toBeLessThanOrEqual(layer.transform.y);
      }
    });
  });

  it("gives every template at least one text layer", () => {
    // A composition is mostly typography. A template with no words is a
    // background and a device, which is what the old catalogue was.
    for (const template of PROJECT_TEMPLATES) {
      expect(template.textLayers?.length ?? 0, template.id).toBeGreaterThan(0);
    }
  });
});

describe("applying a template", () => {
  const device = createDeviceLayer();

  it("builds a device layer plus the template's text layers", () => {
    for (const template of PROJECT_TEMPLATES) {
      const { layers } = buildTemplateLayers(template, device);
      const texts = layers.filter((layer) => layer.type === "text");

      expect(layers.some((layer) => layer.type === "device"), template.id).toBe(true);
      expect(texts.length, template.id).toBe(template.textLayers?.length ?? 0);
    }
  });

  it("keeps the user's uploaded screen image", () => {
    // The single most annoying thing a template could do is discard the
    // screenshot somebody just uploaded because they tried a layout.
    const withScreen = {
      ...device,
      metadata: { ...device.metadata, screenAssetId: "asset_abc" },
    };

    for (const template of PROJECT_TEMPLATES) {
      const { layers } = buildTemplateLayers(template, withScreen);
      expect(layers.find((layer) => layer.type === "device")?.metadata?.screenAssetId, template.id).toBe("asset_abc");
    }
  });

  it("keeps the device layer's id, so undo lands on the same layer", () => {
    const { layers, deviceLayerId } = buildTemplateLayers(PROJECT_TEMPLATES[0], device);
    expect(deviceLayerId).toBe(device.id);
    expect(layers[0].id).toBe(device.id);
  });

  it("works with no existing device at all", () => {
    const { layers } = buildTemplateLayers(PROJECT_TEMPLATES[0], null);
    expect(layers[0].type).toBe("device");
    expect(layers[0].id.length).toBeGreaterThan(0);
  });

  it("produces real keyframes, not a reference to a preset", () => {
    for (const template of PROJECT_TEMPLATES) {
      const { layers } = buildTemplateLayers(template, device);

      const animated = layers.filter((layer) => layer.animations.length > 0);
      expect(animated.length, template.id).toBeGreaterThan(0);

      for (const layer of animated) {
        for (const track of layer.animations) {
          expect(track.keyframes.length, `${template.id} → ${track.property}`).toBeGreaterThan(0);
          for (const keyframe of track.keyframes) {
            expect(Number.isFinite(keyframe.value), `${template.id} → ${track.property}`).toBe(true);
            expect(keyframe.time).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });

  it("gives every layer a distinct id", () => {
    for (const template of PROJECT_TEMPLATES) {
      const { layers } = buildTemplateLayers(template, device);
      const ids = layers.map((layer) => layer.id);
      expect(new Set(ids).size, template.id).toBe(ids.length);
    }
  });

  it("does not share mutable state between two applications", () => {
    const first = buildTemplateLayers(PROJECT_TEMPLATES[0], device);
    const second = buildTemplateLayers(PROJECT_TEMPLATES[0], device);

    first.layers[0].transform.x = 999;
    expect(second.layers[0].transform.x).not.toBe(999);

    if (first.layers[1] && second.layers[1]) {
      expect(first.layers[1].id).not.toBe(second.layers[1].id);
    }
  });

  it("puts text in front of the device unless the template says otherwise", () => {
    for (const template of PROJECT_TEMPLATES) {
      const { layers } = buildTemplateLayers(template, device);
      for (const layer of layers.filter((entry) => entry.type === "text")) {
        // Matched by layer name, not by content: two layers in a composition
        // may legitimately say the same words — a brand mark at the top and
        // again at the bottom — and names are the thing the builder keeps
        // unique.
        const spec = template.textLayers?.find(
          (entry) => (entry.name ?? nameFromContent(entry.content)) === layer.name,
        );
        expect(layer.transform.z, template.id).toBe(spec?.transform.z ?? 0.6);
      }
    }
  });

  it("starts from the identity transform for anything a template leaves unset", () => {
    const { layers } = buildTemplateLayers(PROJECT_TEMPLATES[0], device);
    expect(layers[0].transform.opacity).toBe(IDENTITY_TRANSFORM.opacity);
    expect(layers[0].transform.opacity).toBe(1);
  });
});


describe("the category system the browser filters on", () => {
  it("gives every template a category from the catalogue's own list", () => {
    for (const template of PROJECT_TEMPLATES) {
      expect(TEMPLATE_CATEGORIES, template.id).toContain(template.category);
    }
  });

  it("only offers categories that have something in them", () => {
    const active = activeTemplateCategories();
    expect(active.length).toBeGreaterThan(0);
    for (const category of active) {
      expect(searchProjectTemplates(category, "").length, category).toBeGreaterThan(0);
    }
  });

  it("puts each template in the category its devices actually describe", () => {
    // The category is metadata, never inferred from the name — but it still
    // has to agree with what the composition contains, or the tabs lie.
    for (const template of PROJECT_TEMPLATES) {
      const categories = new Set(
        templateDeviceIds(template).map((id) => getDevice(id).category),
      );

      if (template.category === "multi-device") {
        expect(templateDeviceIds(template).length, template.id).toBeGreaterThan(1);
        continue;
      }

      const expected = { mobile: "phone", tablet: "tablet", laptop: "laptop" }[template.category];
      expect([...categories], template.id).toEqual([expected]);
    }
  });

  it("shows everything under All and only the category under a category", () => {
    expect(searchProjectTemplates("all", "")).toEqual(PROJECT_TEMPLATES);

    for (const category of activeTemplateCategories()) {
      const results = searchProjectTemplates(category, "");
      expect(results.length, category).toBeGreaterThan(0);
      for (const template of results) expect(template.category).toBe(category);
    }
  });

  it("searches names, descriptions, tags and the category label", () => {
    expect(searchProjectTemplates("all", "emerald").map((entry) => entry.id)).toContain(
      "emerald-finance-showcase",
    );
    expect(searchProjectTemplates("tablet", "Tablet").map((entry) => entry.id)).toEqual([
      "crimson-editorial-tablet", "neon-portfolio-tablet",
    ]);
    expect(searchProjectTemplates("mobile", "ipad")).toEqual([]);
    expect(searchProjectTemplates("all", "   ")).toEqual(PROJECT_TEMPLATES);
  });

  it("resolves a template by id, and nothing by an id it does not know", () => {
    expect(getProjectTemplate("emerald-finance-showcase")?.name).toBe("Emerald Finance Showcase");
    expect(getProjectTemplate("no-such-template")).toBeUndefined();
  });

  it("lists every device a composition places, without repeats", () => {
    expect(templateDeviceIds(PROJECT_TEMPLATES[0])).toEqual(["iphone-17-pro"]);
    expect(templateDeviceIds(getProjectTemplate("amber-agency-ecosystem")!)).toEqual([
      "macbook",
      "ipad",
      "iphone-17-pro",
    ]);
  });
});
