import { describe, expect, it } from "vitest";

import { DEVICE_FINISHES, getFinish } from "@/engine/devices/device-definitions";
import {
  LEGACY_MOTION_PRESETS,
  MOTION_PRESETS,
  searchMotionPresets,
} from "@/engine/motion/motion-presets";
import { TEXT_MOTION_PRESETS } from "@/engine/motion/text-presets";
import { presetPreview } from "@/engine/motion/preset-preview";
import { buildDeviceMotion } from "@/engine/templates/device-motion-builder";
import { DEVICE_MOTION_TEMPLATES } from "@/engine/templates/device-motion-templates";
import { PROJECT_TEMPLATES } from "@/engine/templates/project-templates";
import { buildTemplateLayers } from "@/engine/templates/template-builder";
import { createProject } from "@/lib/project-factory";
import { parseProject } from "@/lib/validation/project-schema";
import { useProjectStore } from "@/store/project-store";
import { DEFAULT_DEVICE_APPEARANCE } from "@/types/device";
import { PROJECT_VERSION } from "@/types/project";

/**
 * Invariants that span the whole catalogue.
 *
 * Everything here is the kind of mistake that is invisible in review and
 * obvious in use: two cards with the same name, a retired preset creeping back
 * into a browser, a preview that turned out to write to the project. They are
 * cheap to check and expensive to find by hand.
 */

describe("names are unique where a user can see two at once", () => {
  it("no two device motion templates share a name", () => {
    const names = DEVICE_MOTION_TEMPLATES.map((template) => template.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("no two project templates share a name", () => {
    const names = PROJECT_TEMPLATES.map((template) => template.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("no two presets offered for the same layer kind share a name", () => {
    // Scoped by layer kind rather than across the whole library: the device and
    // text catalogues may each have a "Scale In" — same concept, different
    // layer — and `appliesTo` keeps those two cards from ever appearing side by
    // side. Comparing the whole catalogue would forbid something correct.
    for (const layerType of ["device", "text"] as const) {
      const offered = MOTION_PRESETS.filter(
        (preset) => !preset.appliesTo || preset.appliesTo.includes(layerType),
      );
      const names = offered.map((preset) => preset.name.toLowerCase());
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
      expect(duplicates, `two presets shown for a ${layerType} share a name`).toEqual([]);
    }
  });

  it("no text preset shares a name with another text preset", () => {
    const names = TEXT_MOTION_PRESETS.map((preset) => preset.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("the text library covers the animations the brief lists", () => {
    const names = TEXT_MOTION_PRESETS.map((preset) => preset.name.toLowerCase());
    for (const wanted of [
      "fade in",
      "slide up",
      "slide down",
      "slide left",
      "slide right",
      "typewriter",
      "word reveal",
      "letter reveal",
      "line reveal",
      "mask reveal",
      "tracking reveal",
      "letter scatter",
      "glitch lite",
      "bounce in",
      "blur reveal",
    ]) {
      expect(names, `no text preset called "${wanted}"`).toContain(wanted);
    }
  });
});

describe("retired presets stay retired", () => {
  it("keeps Screen Fade out of the browser", () => {
    expect(MOTION_PRESETS.some((preset) => preset.id === "screen-fade")).toBe(false);
    expect(searchMotionPresets("all", "fade").some((preset) => preset.id === "screen-fade")).toBe(
      false,
    );
    expect(searchMotionPresets("all", "screen").some((preset) => preset.id === "screen-fade")).toBe(
      false,
    );
  });

  it("keeps Screen Fade out of the template catalogues too", () => {
    // Templates reference presets by id, so a template naming a legacy preset
    // would put it back in front of users through a side door.
    const legacy = new Set(LEGACY_MOTION_PRESETS.map((preset) => preset.id));

    for (const template of PROJECT_TEMPLATES) {
      for (const presetId of template.motionPresetIds) {
        expect(legacy.has(presetId), `${template.id} uses retired ${presetId}`).toBe(false);
      }
      for (const text of template.textLayers ?? []) {
        for (const presetId of text.motionPresetIds ?? []) {
          expect(legacy.has(presetId), `${template.id} text uses retired ${presetId}`).toBe(false);
        }
      }
    }
  });

  it("still resolves a retired preset for a project that already used one", () => {
    // Retired means "not offered", never "not understood". A project saved with
    // Screen Fade applied holds plain keyframes and opens regardless, but the
    // id still has to resolve for anything that reports what was applied.
    expect(LEGACY_MOTION_PRESETS.some((preset) => preset.id === "screen-fade")).toBe(true);
  });
});

describe("previewing never writes to the project", () => {
  it("leaves the project untouched while a device motion preview runs", () => {
    const project = createProject("Preview safety");
    useProjectStore.getState().loadProject(project);

    const before = JSON.stringify(useProjectStore.getState().project);
    const device = useProjectStore.getState().project!.layers[0];

    for (const template of DEVICE_MOTION_TEMPLATES) {
      const build = buildDeviceMotion(template, device);
      presetPreview.start({
        layerId: device.id,
        presetId: template.id,
        presetName: template.name,
        tracks: build.tracks,
        duration: build.duration,
      });
    }

    expect(presetPreview.get()).not.toBeNull();
    expect(JSON.stringify(useProjectStore.getState().project)).toBe(before);
    expect(useProjectStore.getState().saveStatus).toBe("saved");

    presetPreview.stop();
    expect(presetPreview.get()).toBeNull();
    expect(JSON.stringify(useProjectStore.getState().project)).toBe(before);
  });

  it("builds a template without touching the store either", () => {
    const project = createProject("Build safety");
    useProjectStore.getState().loadProject(project);
    const before = JSON.stringify(useProjectStore.getState().project);

    for (const template of PROJECT_TEMPLATES) {
      buildTemplateLayers(template, useProjectStore.getState().project!.layers[0]);
    }

    expect(JSON.stringify(useProjectStore.getState().project)).toBe(before);
  });
});

describe("device appearance", () => {
  it("offers every finish the brief asks for", () => {
    const ids = DEVICE_FINISHES.map((finish) => finish.id);
    for (const wanted of [
      "natural",
      "light",
      "dark",
      "black",
      "white",
      "gold",
      "silver",
      "blue",
      "custom",
    ]) {
      expect(ids, `no "${wanted}" finish`).toContain(wanted);
    }
  });

  it("gives every finish a real material description, not just a colour", () => {
    for (const finish of DEVICE_FINISHES) {
      expect(finish.label.length, finish.id).toBeGreaterThan(0);
      expect(finish.tint).toMatch(/^#[0-9a-f]{6}$/i);
      // These go into the PBR material, so a finish with no roughness or
      // metalness would be a flat paint chip rather than a surface.
      expect(finish.roughness, finish.id).toBeGreaterThan(0);
      expect(finish.metalness, finish.id).toBeGreaterThanOrEqual(0);
      expect(finish.mix, finish.id).toBeGreaterThan(0);
      expect(finish.mix, finish.id).toBeLessThanOrEqual(1);
    }
  });

  it("never uses pure black or pure white", () => {
    // Both destroy the shading information the finish is applied on top of, and
    // the device stops reading as an object.
    for (const finish of DEVICE_FINISHES) {
      expect(finish.tint.toLowerCase(), finish.id).not.toBe("#000000");
      expect(finish.tint.toLowerCase(), finish.id).not.toBe("#ffffff");
    }
  });

  it("persists a finish through a save and reload", () => {
    const project = createProject("Finish test");
    project.layers[0].metadata = {
      ...project.layers[0].metadata,
      deviceAppearance: { finish: "blue", bodyColor: DEFAULT_DEVICE_APPEARANCE.bodyColor },
    };

    const round = parseProject(JSON.parse(JSON.stringify(project)));
    expect(round.ok).toBe(true);
    expect(round.project?.layers[0].metadata?.deviceAppearance).toMatchObject({ finish: "blue" });
  });

  it("persists a custom body colour", () => {
    const project = createProject("Custom colour");
    project.layers[0].metadata = {
      ...project.layers[0].metadata,
      deviceAppearance: { finish: "custom", bodyColor: "#3a4a8b" },
    };

    const round = parseProject(JSON.parse(JSON.stringify(project)));
    expect(round.project?.layers[0].metadata?.deviceAppearance).toMatchObject({
      finish: "custom",
      bodyColor: "#3a4a8b",
    });
  });

  it("falls back to a real finish for an id it does not know", () => {
    expect(getFinish("chartreuse").id).toBe(DEVICE_FINISHES[0].id);
  });
});

describe("a shared project carries everything needed to render it", () => {
  it("round-trips a fully-dressed composition", () => {
    // A share link is a project row read by someone who has none of this
    // person's local state, so anything the renderer needs has to be in the
    // JSON. This builds one of everything and checks it all survives.
    const project = createProject("Share test");
    const template = PROJECT_TEMPLATES[0];
    const { layers } = buildTemplateLayers(template, project.layers[0]);

    project.layers = layers;
    project.background = template.background;
    project.canvas = { ...project.canvas, ...template.canvas, workArea: { in: 1, out: 3, enabled: true } };
    project.templateId = template.id;
    project.deviceMotionTemplateId = "dm-orbit-hero";
    project.exportSettings = {
      format: "png",
      resolutionId: "1440p",
      transparent: false,
      range: "work-area",
    };

    const round = parseProject(JSON.parse(JSON.stringify(project)));
    expect(round.ok, round.error).toBe(true);

    const restored = round.project!;
    expect(restored.version).toBe(PROJECT_VERSION);
    expect(restored.background).toEqual(template.background);
    expect(restored.canvas.workArea).toEqual({ in: 1, out: 3, enabled: true });
    expect(restored.templateId).toBe(template.id);
    expect(restored.deviceMotionTemplateId).toBe("dm-orbit-hero");
    expect(restored.exportSettings?.resolutionId).toBe("1440p");

    // The layers: device with its finish, text with its typography, and every
    // keyframe on both.
    expect(restored.layers).toHaveLength(layers.length);
    expect(restored.layers[0].metadata?.deviceAppearance).toBeDefined();

    const keyframesIn = (list: typeof layers) =>
      list.reduce(
        (sum, layer) =>
          sum + layer.animations.reduce((inner, track) => inner + track.keyframes.length, 0),
        0,
      );
    expect(keyframesIn(restored.layers)).toBe(keyframesIn(layers));

    const text = restored.layers.find((layer) => layer.type === "text");
    expect(text?.metadata?.fontId).toBeDefined();
    expect(text?.metadata?.content).toBeDefined();
  });

  it("opens a project written before the work area existed", () => {
    // v2 had no `workArea`, no `templateId` and no `exportSettings`. Absent is
    // already the correct answer for all three, so the migration's job is to
    // not reject the project — which is exactly what a stricter schema would do.
    const project = createProject("Old project");
    project.version = 2;

    const round = parseProject(JSON.parse(JSON.stringify(project)));
    expect(round.ok, round.error).toBe(true);
    expect(round.project?.version).toBe(PROJECT_VERSION);
    expect(round.project?.canvas.workArea).toBeUndefined();
  });

  it("still refuses a project from a future version", () => {
    const project = { ...createProject(), version: PROJECT_VERSION + 1 };
    const round = parseProject(JSON.parse(JSON.stringify(project)));

    expect(round.ok).toBe(false);
    expect(round.error).toContain("Unsupported project version");
  });
});
