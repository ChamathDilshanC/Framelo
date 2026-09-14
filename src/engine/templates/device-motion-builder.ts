import { generateTracks, planDuration } from "@/engine/motion/preset-generator";
import type {
  MotionPresetDefinition,
  MotionPresetParameters,
} from "@/engine/motion/preset-types";
import type { AnimationTrack } from "@/types/animation";
import { IDENTITY_TRANSFORM, type Layer, type Transform } from "@/types/layer";

import type { DeviceMotionTemplate } from "./device-motion-templates";

/**
 * Turning a choreography into keyframes.
 *
 * Pure, and pointedly so: no store, no React, no side effects. That is what
 * lets the test suite assert that fifteen templates genuinely differ — it can
 * build all fifteen and compare what came out — rather than assert that fifteen
 * buttons exist, which is the failure mode this whole feature is at risk of.
 *
 * It also means Preview and Apply run the *same* function. A preview that
 * approximated the real thing would eventually drift from it, and the first
 * anyone would know is when a shot they approved exported differently.
 */

export interface DeviceMotionBuild {
  /** The resting pose. Relative keyframes are measured from here. */
  transform: Transform;
  tracks: AnimationTrack[];
  /** Composition length the choreography needs. */
  duration: number;
}

export interface BuildDeviceMotionOptions {
  /**
   * Fit the choreography into the composition instead of taking its own length.
   *
   * Off by default. A device motion template is a finished shot with a designed
   * running time — Cinematic Push is six seconds because six seconds is how
   * long that push takes to land — so it sets the duration rather than being
   * squeezed into whatever was there. The caller can override when the user has
   * said they would rather keep their composition length.
   */
  fitToDuration?: number;
  /** Parameter overrides, for the intensity control on the card. */
  parameters?: Partial<MotionPresetParameters>;
  /**
   * Keep the layer where the user put it.
   *
   * The pose is a rotation and a scale decision, not a placement one, so a
   * device deliberately parked at the left of frame stays there: only the
   * rotation and scale of the template pose are taken, and X/Y/Z are kept.
   */
  keepPosition?: boolean;
}

export function buildDeviceMotion(
  template: DeviceMotionTemplate,
  layer: Layer | null,
  options: BuildDeviceMotionOptions = {},
): DeviceMotionBuild {
  const base = layer?.transform ?? IDENTITY_TRANSFORM;

  const transform: Transform = options.keepPosition
    ? { ...base, ...withoutPosition(template.pose) }
    : { ...IDENTITY_TRANSFORM, ...template.pose };

  const duration =
    options.fitToDuration && options.fitToDuration > 0
      ? planDuration(asPreset(template), options.fitToDuration, "fit").presetSpan
      : template.duration;

  const tracks = generateTracks(
    asPreset(template),
    { baseTransform: transform, baseMetadata: layer?.metadata, duration },
    options.parameters,
  );

  return { transform, tracks, duration };
}

const POSITION_AXES = ["x", "y", "z"] as const;

function withoutPosition(pose: Partial<Transform>): Partial<Transform> {
  const rest: Partial<Transform> = { ...pose };
  for (const axis of POSITION_AXES) delete rest[axis];
  return rest;
}

/**
 * A choreography, in the shape the generator already understands.
 *
 * This adapter is the reason there is no second animation engine. A device
 * motion template carries more than a preset does — a pose, a camera, optional
 * text — but the *movement* part of it is the same normalised track data, so it
 * goes through the same generator and comes out as ordinary Framelo keyframes
 * that the timeline, the evaluator and the exporter cannot tell apart from
 * hand-keyed ones.
 */
function asPreset(template: DeviceMotionTemplate): MotionPresetDefinition {
  return {
    version: template.version,
    id: template.id,
    name: template.name,
    // Choreographies are device work by definition; the field exists for the
    // generator's benefit and is never shown.
    category: "product",
    duration: template.duration,
    description: template.description,
    tags: template.tags,
    tracks: template.tracks,
    supports: { intensity: true, direction: true, delay: true },
    appliesTo: ["device"],
  };
}

/**
 * A fingerprint of what a choreography actually does.
 *
 * Exists for the catalogue test, and its shape is the argument: it records the
 * properties animated, the *shape* of each track (how many beats, where they
 * fall, which way the values go) and the pose — because those are what make two
 * pieces of motion feel the same or different. Names, descriptions, tags and
 * categories are excluded on purpose: a template that differed from another
 * only in its label must collide here.
 */
export function deviceMotionSignature(template: DeviceMotionTemplate): string {
  const tracks = Object.entries(template.tracks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([property, specs]) => {
      const beats = (specs ?? []).map(
        (spec) => `${Math.round(spec.at * 20)}@${Math.round(spec.value * 4)}`,
      );
      return `${property}:${beats.join(",")}`;
    });

  const pose = { ...IDENTITY_TRANSFORM, ...template.pose };

  return JSON.stringify({
    tracks,
    pose: [
      Math.round(pose.rotationX),
      Math.round(pose.rotationY),
      Math.round(pose.rotationZ),
      Math.round(pose.scaleX * 20),
    ],
    duration: Math.round(template.duration * 4),
  });
}

/** Which properties a choreography writes, for conflict warnings before applying. */
export function deviceMotionProperties(template: DeviceMotionTemplate): string[] {
  return Object.keys(template.tracks);
}
