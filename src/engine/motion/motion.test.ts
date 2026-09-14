import { describe, expect, it } from "vitest";

import { evaluateTrack } from "@/engine/animation/evaluate";
import { createSpringEasing, sampleEasing, simulateSpring, springFromIntensity } from "@/engine/motion/easing";
import {
  activeMotionCategories,
  getMotionPreset,
  isLegacyPreset,
  LEGACY_MOTION_PRESETS,
  MOTION_PRESETS,
  searchMotionPresets,
} from "@/engine/motion/motion-presets";
import {
  generateTracks,
  mergePresetTracks,
  planDuration,
  presetProperties,
} from "@/engine/motion/preset-generator";
import { MOTION_CATEGORIES } from "@/engine/motion/preset-types";
import { PROJECT_TEMPLATES } from "@/engine/templates/project-templates";
import { EASING_TYPES } from "@/types/animation";
import { IDENTITY_TRANSFORM } from "@/types/layer";

const BASE = IDENTITY_TRANSFORM;

function generate(id: string, duration?: number, overrides?: Parameters<typeof generateTracks>[2]) {
  const preset = getMotionPreset(id);
  if (!preset) throw new Error(`Missing preset ${id}`);
  return generateTracks(
    preset,
    { baseTransform: BASE, duration: duration ?? preset.duration },
    overrides,
  );
}

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------

describe("motion preset catalogue", () => {
  it("ships a library, not a handful", () => {
    expect(MOTION_PRESETS.length).toBeGreaterThanOrEqual(30);
  });

  it("has unique ids", () => {
    const ids = MOTION_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(MOTION_PRESETS)("$id is fully described", (preset) => {
    expect(preset.version).toBeGreaterThanOrEqual(1);
    expect(preset.name.length).toBeGreaterThan(0);
    expect(preset.description.length).toBeGreaterThan(0);
    expect(preset.duration).toBeGreaterThan(0);
    expect(preset.tags.length).toBeGreaterThan(0);
    expect(MOTION_CATEGORIES).toContain(preset.category);
    expect(Object.keys(preset.tracks).length).toBeGreaterThan(0);
  });

  it("keeps every keyframe normalised to [0, 1]", () => {
    for (const preset of MOTION_PRESETS) {
      for (const specs of Object.values(preset.tracks)) {
        for (const spec of specs ?? []) {
          expect(spec.at).toBeGreaterThanOrEqual(0);
          expect(spec.at).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("only names easings the project format can store", () => {
    for (const preset of MOTION_PRESETS) {
      for (const specs of Object.values(preset.tracks)) {
        for (const spec of specs ?? []) {
          if (spec.easing) expect(EASING_TYPES).toContain(spec.easing);
        }
      }
    }
  });

  it("covers every category it advertises", () => {
    for (const category of activeMotionCategories()) {
      expect(MOTION_PRESETS.some((preset) => preset.category === category)).toBe(true);
    }
  });

  /**
   * The product quality bar, enforced. "Subtle and premium" is easy to agree
   * with and easy to drift away from one preset at a time.
   */
  it("keeps motion inside the library's restraint", () => {
    for (const preset of MOTION_PRESETS) {
      for (const [property, specs] of Object.entries(preset.tracks)) {
        for (const spec of specs ?? []) {
          if (property.startsWith("rotation")) {
            // A rotation past a quarter turn has to be the point of the preset,
            // declared in its tags — otherwise it is a preset that got away
            // from its author.
            const declaredTurn =
              preset.tags.includes("360") ||
              preset.tags.includes("180") ||
              preset.tags.includes("flip");
            // Reported as an object so a failure names the offending preset
            // rather than just a number.
            expect({
              preset: preset.id,
              property,
              exceeded: Math.abs(spec.value) > (declaredTurn ? 360 : 45),
            }).toMatchObject({ preset: preset.id, property, exceeded: false });
          }
          if (property.startsWith("scale")) {
            expect(spec.value).toBeGreaterThan(0.5);
            expect(spec.value).toBeLessThan(1.6);
          }
          if (property === "opacity") {
            expect(spec.value).toBeGreaterThanOrEqual(0);
            expect(spec.value).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it("makes every looping preset actually seamless", () => {
    for (const preset of MOTION_PRESETS.filter((entry) => entry.loop)) {
      for (const [property, specs] of Object.entries(preset.tracks)) {
        const list = specs ?? [];
        if (list.length < 2) continue;

        const first = list[0];
        const last = list[list.length - 1];

        // A turntable ends a full revolution on, which is the same pose.
        const isRevolution = Math.abs(last.value - first.value) === 360;
        if (isRevolution) continue;

        expect({ preset: preset.id, property, first: first.value, last: last.value }).toMatchObject({
          preset: preset.id,
          property,
          first: first.value,
          last: first.value,
        });
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

describe("search", () => {
  it("finds presets by tag across different names", () => {
    const ids = searchMotionPresets("all", "spin").map((preset) => preset.id);

    expect(ids).toContain("device-spin");
    expect(ids).toContain("half-spin");
    // Neither of these has "spin" in its name — the tags carry them.
    expect(ids).toContain("turntable");
    expect(ids).toContain("product-turn");
  });

  it("finds presets by description", () => {
    expect(searchMotionPresets("all", "weightless").length).toBeGreaterThan(0);
  });

  it("filters by category", () => {
    const entrance = searchMotionPresets("entrance", "");
    expect(entrance.length).toBeGreaterThan(0);
    expect(entrance.every((preset) => preset.category === "entrance")).toBe(true);
  });

  it("returns nothing for nonsense", () => {
    expect(searchMotionPresets("all", "zzzznotapreset")).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Screen Fade and other retired presets
// ---------------------------------------------------------------------------

describe("retired presets", () => {
  it("no longer lists Screen Fade", () => {
    expect(MOTION_PRESETS.some((preset) => preset.id === "screen-fade")).toBe(false);
    expect(searchMotionPresets("all", "screen fade")).toHaveLength(0);
    expect(searchMotionPresets("all", "fade").some((p) => p.id === "screen-fade")).toBe(false);
  });

  it("still resolves the id so an old reference cannot dangle", () => {
    const legacy = getMotionPreset("screen-fade");
    expect(legacy).toBeDefined();
    expect(legacy?.name).toBe("Screen Fade");
    expect(isLegacyPreset("screen-fade")).toBe(true);
  });

  it("still generates the motion it always did", () => {
    const tracks = generate("screen-fade");
    const opacity = tracks.find((track) => track.property === "opacity");

    expect(opacity).toBeDefined();
    expect(evaluateTrack(opacity!, 0)).toBe(0);
    expect(evaluateTrack(opacity!, 2)).toBe(1);
  });

  it.each(LEGACY_MOTION_PRESETS)("$id is retired, not listed", (preset) => {
    expect(isLegacyPreset(preset.id)).toBe(true);
    expect(MOTION_PRESETS.some((entry) => entry.id === preset.id)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

describe("preset generation", () => {
  it("produces keyframes for every preset without throwing", () => {
    for (const preset of MOTION_PRESETS) {
      const tracks = generate(preset.id);
      expect(tracks.length).toBeGreaterThan(0);

      for (const track of tracks) {
        expect(track.keyframes.length).toBeGreaterThan(0);
        for (const keyframe of track.keyframes) {
          expect(Number.isFinite(keyframe.value)).toBe(true);
          expect(keyframe.time).toBeGreaterThanOrEqual(0);
          expect(keyframe.time).toBeLessThanOrEqual(preset.duration + 0.001);
        }
      }
    }
  });

  it("gives every keyframe a unique id", () => {
    const ids = MOTION_PRESETS.flatMap((preset) =>
      generate(preset.id).flatMap((track) => track.keyframes.map((keyframe) => keyframe.id)),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("scales keyframe times to the requested duration", () => {
    const tracks = generate("device-spin", 2);
    const rotation = tracks.find((track) => track.property === "rotationY")!;

    expect(rotation.keyframes[0].time).toBe(0);
    expect(rotation.keyframes[rotation.keyframes.length - 1].time).toBeCloseTo(2, 3);
  });

  it("resolves relative keyframes against the layer transform", () => {
    const preset = getMotionPreset("slide-in-left")!;
    const tracks = generateTracks(preset, {
      baseTransform: { ...BASE, x: 2 },
      duration: preset.duration,
    });

    const x = tracks.find((track) => track.property === "x")!;
    expect(x.keyframes[0].value).toBeCloseTo(-2, 4); // 2 + (-4)
    expect(x.keyframes[x.keyframes.length - 1].value).toBeCloseTo(2, 4);
  });

  it("scales travel with intensity but never the resting value", () => {
    const preset = getMotionPreset("rise-in")!;
    const context = { baseTransform: BASE, duration: preset.duration };

    const soft = generateTracks(preset, context, { intensity: 0.5 });
    const strong = generateTracks(preset, context, { intensity: 2 });

    const softY = soft.find((track) => track.property === "y")!.keyframes;
    const strongY = strong.find((track) => track.property === "y")!.keyframes;

    // Starts further away...
    expect(Math.abs(strongY[0].value)).toBeGreaterThan(Math.abs(softY[0].value));
    // ...and still lands exactly where the user put the device.
    expect(softY[softY.length - 1].value).toBeCloseTo(0, 4);
    expect(strongY[strongY.length - 1].value).toBeCloseTo(0, 4);
  });

  it("mirrors directional presets", () => {
    const preset = getMotionPreset("cinematic-reveal")!;
    const context = { baseTransform: BASE, duration: preset.duration };

    const left = generateTracks(preset, context, { direction: "left" });
    const right = generateTracks(preset, context, { direction: "right" });

    const leftX = left.find((track) => track.property === "x")!.keyframes[0].value;
    const rightX = right.find((track) => track.property === "x")!.keyframes[0].value;

    expect(Math.sign(leftX)).toBe(-Math.sign(rightX));
  });

  it("applies a delay without pushing keyframes past the end", () => {
    const preset = getMotionPreset("rise-in")!;
    const tracks = generateTracks(
      preset,
      { baseTransform: BASE, duration: preset.duration },
      { delay: 1 },
    );

    for (const track of tracks) {
      expect(track.keyframes[0].time).toBeCloseTo(1, 3);
      for (const keyframe of track.keyframes) {
        expect(keyframe.time).toBeLessThanOrEqual(preset.duration + 0.001);
      }
    }
  });

  it("only honours an easing override where the preset offers one", () => {
    // Turntable declares no easing support: forcing `elastic` onto a seamless
    // revolution would put a visible hitch in every loop.
    const turntable = generate("turntable", undefined, { easing: "elastic" });
    const rotation = turntable.find((track) => track.property === "rotationY")!;
    expect(rotation.keyframes.every((keyframe) => keyframe.easing === "linear")).toBe(true);

    const riseIn = generate("rise-in", undefined, { easing: "sharp" });
    expect(riseIn.some((track) => track.keyframes.some((k) => k.easing === "sharp"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Spring
// ---------------------------------------------------------------------------

describe("spring", () => {
  it("settles exactly on target", () => {
    const { samples } = simulateSpring({ mass: 1, stiffness: 170, damping: 22 });
    expect(samples.length).toBeGreaterThan(5);
    expect(samples[samples.length - 1]).toBe(1);
  });

  it("terminates even for a spring that barely damps", () => {
    const { samples, settleTime } = simulateSpring({ mass: 4, stiffness: 400, damping: 0.5 });
    expect(samples.length).toBeGreaterThan(0);
    expect(settleTime).toBeLessThanOrEqual(12.001);
  });

  it("maps an intensity dial onto a stable band", () => {
    for (const intensity of [0, 0.25, 0.5, 0.75, 1]) {
      const spring = springFromIntensity(intensity);
      const easing = createSpringEasing(spring);

      expect(easing(0)).toBe(0);
      expect(easing(1)).toBe(1);

      const samples = sampleEasing(easing, 40);
      // Stable means it converges and does not fly off.
      expect(Math.max(...samples)).toBeLessThan(1.5);
      expect(Math.min(...samples)).toBeGreaterThan(-0.2);
    }
  });

  it("bakes into ordinary keyframes rather than a new easing", () => {
    const preset = getMotionPreset("rise-in")!;
    const context = { baseTransform: BASE, duration: preset.duration };

    const plain = generateTracks(preset, context, { springIntensity: 0 });
    const sprung = generateTracks(preset, context, { springIntensity: 0.8 });

    const plainY = plain.find((track) => track.property === "y")!;
    const sprungY = sprung.find((track) => track.property === "y")!;

    // The spring becomes more keyframes, not a new concept the evaluator has
    // to learn — so it scrubs, exports and edits like anything else.
    expect(sprungY.keyframes.length).toBeGreaterThan(plainY.keyframes.length);
    expect(EASING_TYPES).toContain(sprungY.keyframes[0].easing);

    // And it still starts and ends exactly where it should.
    expect(sprungY.keyframes[0].value).toBeCloseTo(plainY.keyframes[0].value, 3);
    expect(sprungY.keyframes[sprungY.keyframes.length - 1].value).toBeCloseTo(0, 3);
  });

  it("is ignored by presets that do not offer it", () => {
    const plain = generate("turntable", undefined, { springIntensity: 1 });
    const rotation = plain.find((track) => track.property === "rotationY")!;
    expect(rotation.keyframes).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Duration planning
// ---------------------------------------------------------------------------

describe("duration planning", () => {
  it("reports no conflict when the preset fits", () => {
    const plan = planDuration(getMotionPreset("rise-in")!, 10);
    expect(plan.conflict).toBe(false);
    expect(plan.resultingDuration).toBe(10);
  });

  it("compresses the preset when fitting", () => {
    const preset = getMotionPreset("turntable-loop")!;
    const plan = planDuration(preset, 5, "fit");

    expect(plan.conflict).toBe(true);
    expect(plan.resultingDuration).toBe(5);
    expect(plan.presetSpan).toBe(5);
  });

  it("grows the composition when extending", () => {
    const preset = getMotionPreset("turntable-loop")!;
    const plan = planDuration(preset, 5, "extend");

    expect(plan.resultingDuration).toBe(preset.duration);
    expect(plan.presetSpan).toBe(preset.duration);
  });
});

// ---------------------------------------------------------------------------
// Stacking
// ---------------------------------------------------------------------------

describe("preset stacking", () => {
  it("keeps both presets when they touch different properties", () => {
    const scaleIn = generate("scale-in");
    const spin = generate("device-spin");

    const first = mergePresetTracks([], scaleIn);
    const second = mergePresetTracks(first.tracks, spin);

    const properties = second.tracks.map((track) => track.property);
    expect(properties).toContain("scaleX");
    expect(properties).toContain("rotationY");
    expect(second.replaced).toHaveLength(0);
  });

  it("replaces only the properties that actually collide", () => {
    const spin = generate("device-spin");
    const halfSpin = generate("half-spin");

    const first = mergePresetTracks([], spin);
    const second = mergePresetTracks(first.tracks, halfSpin);

    expect(second.replaced).toEqual(["rotationY"]);
    expect(second.tracks.filter((track) => track.property === "rotationY")).toHaveLength(1);
  });

  it("reports the properties a preset will write", () => {
    expect(presetProperties(getMotionPreset("device-spin")!)).toEqual(["rotationY"]);
  });
});

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

describe("project templates", () => {
  it("has unique ids", () => {
    const ids = PROJECT_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only references motion presets that exist", () => {
    for (const template of PROJECT_TEMPLATES) {
      for (const presetId of template.motionPresetIds) {
        expect({ template: template.id, presetId, found: Boolean(getMotionPreset(presetId)) })
          .toMatchObject({ found: true });
      }
    }
  });

  it("never starts a new project on a retired preset", () => {
    for (const template of PROJECT_TEMPLATES) {
      for (const presetId of template.motionPresetIds) {
        expect(isLegacyPreset(presetId)).toBe(false);
      }
    }
  });

  it("describes a complete starting project", () => {
    for (const template of PROJECT_TEMPLATES) {
      expect(template.canvas.width).toBeGreaterThan(0);
      expect(template.canvas.height).toBeGreaterThan(0);
      expect(template.canvas.duration).toBeGreaterThan(0);
      expect(template.deviceId.length).toBeGreaterThan(0);
      expect(template.background.type.length).toBeGreaterThan(0);
    }
  });

  it("stacks its presets without losing any of them", () => {
    // Stacking remains supported independently of the curated catalogue.
    const template = { ...PROJECT_TEMPLATES[0], motionPresetIds: ["depth-push", "light-sweep"] };

    const tracks = template.motionPresetIds.reduce<ReturnType<typeof generate>>(
      (accumulated, presetId) =>
        mergePresetTracks(accumulated, generate(presetId, template.canvas.duration)).tracks,
      [],
    );

    expect(tracks.length).toBeGreaterThan(1);
  });
});
