import { describe, expect, it } from "vitest";

import { MOTION_PRESETS, getMotionPreset, searchMotionPresets } from "@/engine/motion/motion-presets";
import { SIGNATURE_MOTION_PRESETS } from "@/engine/motion/signature-presets";
import { generateTracks } from "@/engine/motion/preset-generator";
import { IDENTITY_TRANSFORM } from "@/types/layer";

/**
 * The signature presets exist to fill gaps, so these tests measure difference.
 *
 * Fifteen presets that all fade something in would satisfy a count and fail
 * the point. What follows checks the mechanisms they were written for, and
 * that none of them collides with the thirty-nine that came before.
 */

const OTHERS = MOTION_PRESETS.filter(
  (preset) => !SIGNATURE_MOTION_PRESETS.some((entry) => entry.id === preset.id),
);

/** Which properties a preset animates, as a comparable key. */
function propertySignature(preset: (typeof MOTION_PRESETS)[number]): string {
  return Object.keys(preset.tracks).sort().join("+");
}

describe("the signature presets", () => {
  it("adds fifteen", () => {
    expect(SIGNATURE_MOTION_PRESETS).toHaveLength(15);
  });

  it("does not collide with any existing preset id", () => {
    const ids = MOTION_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size, "duplicate preset id in the library").toBe(ids.length);
  });

  it("does not reuse a name within what one layer type is offered", () => {
    // Uniqueness only matters where a user could see both cards at once. The
    // device and text libraries each have a "Scale In" by design — same
    // concept, different layer kind — and `appliesTo` keeps them apart, so
    // comparing the whole catalogue would forbid something correct.
    for (const layerType of ["device", "text"] as const) {
      const offered = MOTION_PRESETS.filter(
        (preset) => !preset.appliesTo || preset.appliesTo.includes(layerType),
      );
      const names = offered.map((preset) => preset.name.toLowerCase());
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
      expect(duplicates, `two presets shown for a ${layerType} share a name`).toEqual([]);
    }
  });

  it("gives every one metadata a browser can render", () => {
    for (const preset of SIGNATURE_MOTION_PRESETS) {
      expect(preset.name.length, preset.id).toBeGreaterThan(0);
      expect(preset.description.length, preset.id).toBeGreaterThan(12);
      expect(preset.duration, preset.id).toBeGreaterThan(0);
      expect(preset.tags.length, preset.id).toBeGreaterThanOrEqual(4);
      expect(Object.keys(preset.tracks).length, preset.id).toBeGreaterThan(0);
    }
  });

  it("is findable by searching", () => {
    for (const preset of SIGNATURE_MOTION_PRESETS) {
      const byName = searchMotionPresets("all", preset.name);
      expect(byName.map((entry) => entry.id), preset.id).toContain(preset.id);
    }
  });

  it("generates real keyframes for every track", () => {
    for (const preset of SIGNATURE_MOTION_PRESETS) {
      const tracks = generateTracks(preset, {
        baseTransform: IDENTITY_TRANSFORM,
        duration: preset.duration,
      });

      expect(tracks.length, preset.id).toBe(Object.keys(preset.tracks).length);

      for (const track of tracks) {
        expect(track.keyframes.length, `${preset.id} → ${track.property}`).toBeGreaterThan(1);
        for (const keyframe of track.keyframes) {
          expect(Number.isFinite(keyframe.value), `${preset.id} → ${track.property}`).toBe(true);
          expect(keyframe.time).toBeGreaterThanOrEqual(0);
          expect(keyframe.time).toBeLessThanOrEqual(preset.duration + 0.001);
        }
      }
    }
  });

  it("keeps keyframes in time order", () => {
    for (const preset of SIGNATURE_MOTION_PRESETS) {
      const tracks = generateTracks(preset, {
        baseTransform: IDENTITY_TRANSFORM,
        duration: preset.duration,
      });
      for (const track of tracks) {
        const times = track.keyframes.map((keyframe) => keyframe.time);
        expect([...times].sort((a, b) => a - b), `${preset.id} → ${track.property}`).toEqual(times);
      }
    }
  });
});

describe("each one earns its place", () => {
  it("no two signature presets animate the same property set", () => {
    const seen = new Map<string, string>();
    for (const preset of SIGNATURE_MOTION_PRESETS) {
      const signature = propertySignature(preset);
      const clash = seen.get(signature);
      expect(clash, `${preset.id} animates the same properties as ${clash}`).toBeUndefined();
      seen.set(signature, preset.id);
    }
  });

  it("uses mechanisms the original library did not have", () => {
    // Anticipation: moving away from the target before moving to it. Detected
    // by a track whose first value is *further* from its resting value than a
    // later one, before settling.
    const magnetic = getMotionPreset("magnetic-rise")!;
    const y = magnetic.tracks.y!;
    expect(Math.abs(y[1].value)).toBeGreaterThan(Math.abs(y[0].value));

    // Counter-motion: depth and scale moving in opposite directions.
    const dolly = getMotionPreset("dolly-zoom")!;
    expect(dolly.tracks.z![0].value).toBeLessThan(0);
    expect(dolly.tracks.scaleX![0].value).toBeGreaterThan(1);

    // Squash: the scale axes part company, which no earlier preset did.
    const land = getMotionPreset("spring-land")!;
    const squashX = land.tracks.scaleX!.find((spec) => spec.at > 0 && spec.at < 1)!;
    const squashY = land.tracks.scaleY!.find((spec) => spec.at > 0 && spec.at < 1)!;
    expect(squashX.value).not.toBe(squashY.value);

    // A resting pose that is not square to camera.
    const pose = getMotionPreset("rotational-hero")!;
    const final = pose.tracks.rotationY!.at(-1)!;
    expect(final.at).toBe(1);
    expect(Math.abs(final.value)).toBeGreaterThan(5);

    // Diagonal travel: two position axes moving together on entry.
    const corner = getMotionPreset("corner-reveal")!;
    expect(corner.tracks.x![0].value).not.toBe(0);
    expect(corner.tracks.y![0].value).not.toBe(0);
  });

  it("only duplicates an older preset's property set where the motion differs", () => {
    // Sharing a property set with an older preset is allowed — there are only
    // so many properties — but the *timing* must not also match, or the two
    // are the same animation under two names.
    for (const preset of SIGNATURE_MOTION_PRESETS) {
      const signature = propertySignature(preset);
      const twins = OTHERS.filter((other) => propertySignature(other) === signature);

      for (const twin of twins) {
        const same =
          twin.duration === preset.duration &&
          JSON.stringify(twin.tracks) === JSON.stringify(preset.tracks);
        expect(same, `${preset.id} is identical to ${twin.id}`).toBe(false);
      }
    }
  });

  it("spreads across categories instead of piling into entrances", () => {
    const categories = new Set(SIGNATURE_MOTION_PRESETS.map((preset) => preset.category));
    expect(categories.size).toBeGreaterThanOrEqual(4);
  });

  it("covers a real range of durations", () => {
    const durations = SIGNATURE_MOTION_PRESETS.map((preset) => preset.duration);
    // A sub-second snap and a seven-second ambient loop are different tools.
    expect(Math.min(...durations)).toBeLessThan(1);
    expect(Math.max(...durations)).toBeGreaterThan(5);
  });

  it("declares loops honestly", () => {
    for (const preset of SIGNATURE_MOTION_PRESETS.filter((entry) => entry.loop)) {
      for (const [property, specs] of Object.entries(preset.tracks)) {
        const first = specs![0];
        const last = specs![specs!.length - 1];
        // A loop that does not end where it started shows a seam every cycle.
        expect(last.value, `${preset.id} → ${property} does not close its loop`).toBe(first.value);
      }
    }
  });
});
