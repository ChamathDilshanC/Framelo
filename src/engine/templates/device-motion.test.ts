import { describe, expect, it } from "vitest";

import { EASING_TYPES } from "@/types/animation";
import {
  DEVICE_MOTION_TEMPLATES,
  MOTION_ORIGINS,
  getDeviceMotionTemplate,
  searchDeviceMotionTemplates,
} from "@/engine/templates/device-motion-templates";
import {
  buildDeviceMotion,
  deviceMotionSignature,
} from "@/engine/templates/device-motion-builder";
import { MOTION_PRESETS } from "@/engine/motion/motion-presets";
import { createDeviceLayer } from "@/lib/project-factory";
import { IDENTITY_TRANSFORM } from "@/types/layer";

/**
 * The catalogue's quality bar, enforced.
 *
 * Almost everything here measures *difference*. "Fifteen templates exist" is a
 * test that passes on fifteen copies of one animation, which is precisely the
 * outcome these tests are here to prevent — so the count is one assertion and
 * the other twenty are about whether the fifteen are actually fifteen things.
 */

const DEVICE = createDeviceLayer();

/** Which properties a template animates, as a comparable key. */
function propertySignature(template: (typeof DEVICE_MOTION_TEMPLATES)[number]): string {
  return Object.keys(template.tracks).sort().join("+");
}

describe("the device motion catalogue", () => {
  it("has fifteen templates", () => {
    expect(DEVICE_MOTION_TEMPLATES.length).toBeGreaterThanOrEqual(15);
  });

  it("gives every template a unique id", () => {
    const ids = DEVICE_MOTION_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every template a unique name", () => {
    const names = DEVICE_MOTION_TEMPLATES.map((template) => template.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("describes every template well enough to choose from", () => {
    for (const template of DEVICE_MOTION_TEMPLATES) {
      expect(template.name.length, template.id).toBeGreaterThan(0);
      expect(template.description.length, template.id).toBeGreaterThan(15);
      expect(template.duration, template.id).toBeGreaterThan(0);
      expect(template.tags.length, template.id).toBeGreaterThanOrEqual(4);
      expect(template.easing.length, template.id).toBeGreaterThan(0);
      expect(Object.keys(template.tracks).length, template.id).toBeGreaterThan(0);
    }
  });

  it("only names easings the evaluator can resolve", () => {
    const known = new Set<string>(EASING_TYPES);

    for (const template of DEVICE_MOTION_TEMPLATES) {
      for (const [property, specs] of Object.entries(template.tracks)) {
        for (const spec of specs ?? []) {
          if (!spec.easing) continue;
          expect(known.has(spec.easing), `${template.id} → ${property}: ${spec.easing}`).toBe(true);
        }
      }
      // The card lists these; an easing named there that does not exist would
      // be a claim about motion the template does not actually have.
      for (const name of template.easing) {
        expect(known.has(name), `${template.id} claims easing "${name}"`).toBe(true);
      }
    }
  });

  it("is findable by name, by origin and by tag", () => {
    for (const template of DEVICE_MOTION_TEMPLATES) {
      expect(
        searchDeviceMotionTemplates("all", template.name).map((entry) => entry.id),
        template.id,
      ).toContain(template.id);
    }

    expect(searchDeviceMotionTemplates("all", "vertigo").map((e) => e.id)).toContain("dm-dolly-zoom");
    expect(searchDeviceMotionTemplates("all", "orbit").map((e) => e.id)).toContain("dm-orbit-hero");
  });

  it("resolves every template by id", () => {
    for (const template of DEVICE_MOTION_TEMPLATES) {
      expect(getDeviceMotionTemplate(template.id)?.name).toBe(template.name);
    }
    expect(getDeviceMotionTemplate("no-such-template")).toBeUndefined();
  });
});

describe("no two templates are the same animation", () => {
  it("no two animate the same set of properties", () => {
    // The blunt instrument, and the most useful one. Two templates that move
    // exactly the same properties are almost always the same idea twice.
    const seen = new Map<string, string>();

    for (const template of DEVICE_MOTION_TEMPLATES) {
      const signature = propertySignature(template);
      const clash = seen.get(signature);
      expect(clash, `${template.id} animates the same properties as ${clash}`).toBeUndefined();
      seen.set(signature, template.id);
    }
  });

  it("no two share a choreography", () => {
    const seen = new Map<string, string>();

    for (const template of DEVICE_MOTION_TEMPLATES) {
      const signature = deviceMotionSignature(template);
      const clash = seen.get(signature);
      expect(clash, `${template.id} is choreographed identically to ${clash}`).toBeUndefined();
      seen.set(signature, template.id);
    }
  });

  it("covers every movement direction the brief asks for", () => {
    const covered = new Set(DEVICE_MOTION_TEMPLATES.map((template) => template.origin));
    for (const origin of MOTION_ORIGINS) {
      expect(covered.has(origin), `nothing covers "${origin}"`).toBe(true);
    }
  });

  it("spreads across categories rather than piling into entrances", () => {
    const categories = new Set(DEVICE_MOTION_TEMPLATES.map((template) => template.category));
    expect(categories.size).toBeGreaterThanOrEqual(4);
  });

  it("covers a real range of running times", () => {
    const durations = DEVICE_MOTION_TEMPLATES.map((template) => template.duration);
    // A one-and-a-half-second snap and a seven-second hero shot are different
    // tools. Fifteen two-second animations would be one tool fifteen times.
    expect(Math.min(...durations)).toBeLessThanOrEqual(1.6);
    expect(Math.max(...durations)).toBeGreaterThanOrEqual(6);
  });

  it("rests in materially different poses", () => {
    const poses = DEVICE_MOTION_TEMPLATES.map((template) =>
      [
        Math.round(template.pose.rotationX ?? 0),
        Math.round(template.pose.rotationY ?? 0),
        Math.round(template.pose.rotationZ ?? 0),
      ].join(","),
    );
    expect(new Set(poses).size).toBeGreaterThanOrEqual(6);
  });

  it("uses more than one easing family across the library", () => {
    const families = new Set(DEVICE_MOTION_TEMPLATES.flatMap((template) => template.easing));
    expect(families.size).toBeGreaterThanOrEqual(6);
  });

  it("does not collide with a motion preset id", () => {
    // They are separate libraries with separate browsers, but an id shared
    // between them would make "apply dolly-zoom" ambiguous the first time
    // anything looked one up without knowing which catalogue it came from.
    const presetIds = new Set(MOTION_PRESETS.map((preset) => preset.id));
    const shared = DEVICE_MOTION_TEMPLATES.filter((template) => presetIds.has(template.id));
    expect(shared.map((template) => template.id)).toEqual([]);
  });
});

describe("mechanisms the library was written for", () => {
  it("lands with a squash, on exactly one template", () => {
    // Scale axes parting company is expensive to read and cheap to overuse.
    const squashing = DEVICE_MOTION_TEMPLATES.filter((template) => {
      const x = template.tracks.scaleX;
      const y = template.tracks.scaleY;
      if (!x || !y) return false;
      return x.some((spec, index) => y[index] && y[index].value !== spec.value);
    });

    expect(squashing.map((template) => template.id)).toEqual(["dm-vertical-drop"]);
  });

  it("anticipates before it arrives", () => {
    // Magnetic Landing moves away from its target before moving to it.
    const magnetic = getDeviceMotionTemplate("dm-magnetic-landing")!;
    const x = magnetic.tracks.x!;
    expect(Math.abs(x[1].value)).toBeGreaterThan(Math.abs(x[0].value));
  });

  it("runs depth and scale against each other for the vertigo shot", () => {
    const dolly = getDeviceMotionTemplate("dm-dolly-zoom")!;
    expect(dolly.tracks.z![0].value).toBeLessThan(0);
    expect(dolly.tracks.scaleX![0].value).toBeGreaterThan(1);
  });

  it("travels on an arc rather than a line for the orbit", () => {
    // X and Z out of phase is what separates an arc from a diagonal slide. If
    // both axes moved on the same curve this would be Diagonal Reveal in Z.
    const orbit = getDeviceMotionTemplate("dm-orbit-hero")!;
    const x = orbit.tracks.x!;
    const z = orbit.tracks.z!;

    const xProgress = (x[0].value - x[1].value) / (x[0].value - x[2].value);
    const zProgress = (z[0].value - z[1].value) / (z[0].value - z[2].value);
    expect(Math.abs(xProgress - zProgress)).toBeGreaterThan(0.15);
  });

  it("closes the loop on the one template meant to repeat", () => {
    const turn = getDeviceMotionTemplate("dm-product-turn")!;
    for (const [property, specs] of Object.entries(turn.tracks)) {
      if (property === "rotationY") continue; // a full revolution, by design
      const first = specs![0];
      const last = specs![specs!.length - 1];
      expect(last.value, `product-turn → ${property} does not close its loop`).toBe(first.value);
    }
  });

  it("is genuinely multi-stage where it says it is", () => {
    const showcase = getDeviceMotionTemplate("dm-premium-showcase")!;
    const beats = Object.values(showcase.tracks).map((specs) => specs!.length);
    expect(Math.max(...beats)).toBeGreaterThanOrEqual(5);
    expect(Object.keys(showcase.tracks).length).toBeGreaterThanOrEqual(6);
  });
});

describe("building a template", () => {
  it("produces real keyframes for every declared track", () => {
    for (const template of DEVICE_MOTION_TEMPLATES) {
      const build = buildDeviceMotion(template, DEVICE);

      expect(build.tracks.length, template.id).toBe(Object.keys(template.tracks).length);

      for (const track of build.tracks) {
        expect(track.keyframes.length, `${template.id} → ${track.property}`).toBeGreaterThan(1);
        for (const keyframe of track.keyframes) {
          expect(Number.isFinite(keyframe.value), `${template.id} → ${track.property}`).toBe(true);
          expect(keyframe.time).toBeGreaterThanOrEqual(0);
          expect(keyframe.time).toBeLessThanOrEqual(template.duration + 0.001);
        }
      }
    }
  });

  it("keeps keyframes in time order", () => {
    for (const template of DEVICE_MOTION_TEMPLATES) {
      for (const track of buildDeviceMotion(template, DEVICE).tracks) {
        const times = track.keyframes.map((keyframe) => keyframe.time);
        expect([...times].sort((a, b) => a - b), `${template.id} → ${track.property}`).toEqual(times);
      }
    }
  });

  it("takes the template's own running time by default", () => {
    for (const template of DEVICE_MOTION_TEMPLATES) {
      expect(buildDeviceMotion(template, DEVICE).duration, template.id).toBe(template.duration);
    }
  });

  it("compresses into a shorter composition when asked to", () => {
    const template = getDeviceMotionTemplate("dm-premium-showcase")!;
    const build = buildDeviceMotion(template, DEVICE, { fitToDuration: 3 });

    expect(build.duration).toBe(3);
    for (const track of build.tracks) {
      for (const keyframe of track.keyframes) {
        expect(keyframe.time).toBeLessThanOrEqual(3.001);
      }
    }
  });

  it("settles on the pose the template declares", () => {
    for (const template of DEVICE_MOTION_TEMPLATES) {
      const build = buildDeviceMotion(template, DEVICE);
      const pose = { ...IDENTITY_TRANSFORM, ...template.pose };
      expect(build.transform, template.id).toEqual(pose);
    }
  });

  it("can keep the device where the user put it", () => {
    const placed = {
      ...DEVICE,
      transform: { ...DEVICE.transform, x: 2.5, y: -0.5 },
    };
    const template = getDeviceMotionTemplate("dm-orbit-hero")!;
    const build = buildDeviceMotion(template, placed, { keepPosition: true });

    expect(build.transform.x).toBe(2.5);
    expect(build.transform.y).toBe(-0.5);
    // But the rotation is still the template's — that is the part a
    // choreography cannot work without.
    expect(build.transform.rotationY).toBe(template.pose.rotationY);
  });

  it("measures relative keyframes from the pose, not from the origin", () => {
    // A relative track that resolved against zero would put every template's
    // resting value in the wrong place the moment a pose had a non-zero axis.
    const template = getDeviceMotionTemplate("dm-premium-showcase")!;
    const build = buildDeviceMotion(template, DEVICE);

    const rotation = build.tracks.find((track) => track.property === "rotationY")!;
    const last = rotation.keyframes[rotation.keyframes.length - 1];
    expect(last.value).toBeCloseTo(template.pose.rotationY!, 4);
  });

  it("works with no layer at all", () => {
    const build = buildDeviceMotion(DEVICE_MOTION_TEMPLATES[0], null);
    expect(build.tracks.length).toBeGreaterThan(0);
  });

  it("does not share mutable state between two builds", () => {
    const first = buildDeviceMotion(DEVICE_MOTION_TEMPLATES[2], DEVICE);
    const second = buildDeviceMotion(DEVICE_MOTION_TEMPLATES[2], DEVICE);

    first.tracks[0].keyframes[0].value = 999;
    expect(second.tracks[0].keyframes[0].value).not.toBe(999);
    expect(first.tracks[0].keyframes[0].id).not.toBe(second.tracks[0].keyframes[0].id);
  });

  it("never leaves opacity outside what the project format allows", () => {
    // The schema rejects an opacity above 1, so a template that overshot it
    // would produce a composition that could not be saved.
    for (const template of DEVICE_MOTION_TEMPLATES) {
      const opacity = buildDeviceMotion(template, DEVICE).tracks.find(
        (track) => track.property === "opacity",
      );
      for (const keyframe of opacity?.keyframes ?? []) {
        expect(keyframe.value, template.id).toBeGreaterThanOrEqual(0);
        expect(keyframe.value, template.id).toBeLessThanOrEqual(1);
      }
    }
  });
});
