import { applyEasing, type EasingFunction } from "@/engine/easing";
import type { EasingType } from "@/types/animation";

import type { SpringParameters } from "./preset-types";

/**
 * Spring motion, baked into keyframes.
 *
 * A spring is a differential equation, not a curve: its shape depends on mass,
 * stiffness and damping, so it cannot be expressed as one of the named easings
 * the project format stores. Rather than teaching the evaluator about physics —
 * which would be a second animation engine — the spring is *simulated here* and
 * sampled into ordinary keyframes with linear segments between them.
 *
 * Everything downstream (the timeline, the evaluator, scrubbing, export) then
 * works on the result with no knowledge that a spring was involved.
 */

/** Fixed step for the integrator. Small enough that the shape is stable. */
const SIMULATION_STEP = 1 / 240;
/** Give up rather than spin if a configuration never settles. */
const MAX_SIMULATION_SECONDS = 12;

const REST_DISPLACEMENT = 0.0005;
const REST_VELOCITY = 0.005;

/**
 * Integrate a unit spring from 0 to 1.
 *
 * Returns normalised progress over its own settle time, so the caller can map
 * it onto any segment length. Semi-implicit Euler at a fine fixed step: stable
 * for the stiffness range the UI exposes, and deterministic, which matters
 * because the output becomes keyframes someone can edit afterwards.
 */
export function simulateSpring(spring: SpringParameters): {
  samples: number[];
  /** Seconds the spring took to come to rest. */
  settleTime: number;
} {
  const mass = Math.max(0.1, spring.mass);
  const stiffness = Math.max(1, spring.stiffness);
  const damping = Math.max(0, spring.damping);

  const samples: number[] = [];
  let position = 0;
  let velocity = 0;
  let elapsed = 0;

  // Checked before stepping, so the loop cannot run past the documented cap.
  while (elapsed + SIMULATION_STEP <= MAX_SIMULATION_SECONDS) {
    const springForce = -stiffness * (position - 1);
    const dampingForce = -damping * velocity;
    const acceleration = (springForce + dampingForce) / mass;

    velocity += acceleration * SIMULATION_STEP;
    position += velocity * SIMULATION_STEP;
    elapsed += SIMULATION_STEP;

    samples.push(position);

    if (Math.abs(1 - position) < REST_DISPLACEMENT && Math.abs(velocity) < REST_VELOCITY) {
      break;
    }
  }

  // Land exactly on target: a spring that stops at 0.9997 leaves the device a
  // hair off where the user set it, and that error is permanent.
  if (samples.length > 0) samples[samples.length - 1] = 1;

  return { samples, settleTime: elapsed };
}

/**
 * A spring as an easing function over [0, 1].
 *
 * Useful for previewing the curve; the generator bakes keyframes instead, so
 * the shape survives into the project file.
 */
export function createSpringEasing(spring: SpringParameters): EasingFunction {
  const { samples } = simulateSpring(spring);
  if (samples.length === 0) return (t) => t;

  return (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const index = Math.min(samples.length - 1, Math.floor(t * (samples.length - 1)));
    return samples[index];
  };
}

/**
 * Spring parameters for a 0–1 "spring intensity" dial.
 *
 * The full mass/stiffness/damping triple is meaningless to most people and easy
 * to make unusable, so the main UI exposes one number and this maps it onto a
 * band that is always stable: from a soft, slow settle to a taut, snappy one.
 * The raw triple stays available behind Advanced for anyone who wants it.
 */
export function springFromIntensity(intensity: number, base?: SpringParameters): SpringParameters {
  const t = Math.min(1, Math.max(0, intensity));

  return {
    mass: base?.mass ?? 1,
    // Softer springs feel floaty, stiffer ones feel mechanical; this band
    // stays on the tasteful side of both ends.
    stiffness: base?.stiffness ?? 90 + t * 180,
    // Damping tracks stiffness so the overshoot stays roughly constant rather
    // than exploding as the spring gets stiffer.
    damping: base?.damping ?? 18 + t * 12,
  };
}

/**
 * Sample an easing curve into evenly spaced points.
 *
 * Used to bake a curve the project format cannot name into keyframes it can.
 */
export function sampleEasing(easing: EasingFunction, steps: number): number[] {
  const count = Math.max(2, Math.round(steps));
  const values: number[] = [];

  for (let i = 0; i < count; i += 1) {
    values.push(easing(i / (count - 1)));
  }

  // Anchor the ends exactly; floating point drift at the boundary would show
  // up as the device not quite reaching its keyframed value.
  values[0] = 0;
  values[count - 1] = 1;
  return values;
}

/** The named curve, for previewing an easing choice in the UI. */
export function sampleNamedEasing(easing: EasingType, steps: number): number[] {
  return sampleEasing((t) => applyEasing(easing, t), steps);
}
