import { staticPropertyValueOf } from "@/engine/animation/property-value";
import { createId } from "@/lib/id";
import type { AnimatableProperty, AnimationTrack, EasingType, Keyframe } from "@/types/animation";
import type { Transform } from "@/types/layer";

import { createSpringEasing, sampleEasing, springFromIntensity } from "./easing";
import {
  DEFAULT_PRESET_PARAMETERS,
  type MotionDirection,
  type MotionKeyframeSpec,
  type MotionPresetDefinition,
  type MotionPresetParameters,
} from "./preset-types";

/**
 * Turns a motion preset into Framelo keyframes.
 *
 * This is the only bridge between the preset library and the project format,
 * and it is one-way: presets produce ordinary `AnimationTrack`s and then stop
 * existing. Nothing downstream — timeline, evaluator, scrubbing, export —
 * knows a preset was involved, which is what keeps a generated animation as
 * editable as a hand-keyed one and stops this becoming a second engine.
 */

/** How many keyframes a baked spring segment is sampled into. */
const SPRING_SAMPLES = 16;
/** Rotations are direction-flipped; sign on a scale would invert the device. */
const DIRECTIONAL_PROPERTIES: ReadonlySet<AnimatableProperty> = new Set([
  "x",
  "rotationY",
  "rotationZ",
]);

export interface GenerateContext {
  /** The layer's static transform, for resolving relative keyframes. */
  baseTransform: Transform;
  /**
   * The layer's metadata, so a relative keyframe on a text property resolves
   * against the typography the same way a positional one resolves against the
   * transform. A text preset that starts 40px wider has to know the size.
   */
  baseMetadata?: unknown;
  /** Seconds the preset is fitted into. */
  duration: number;
}

export function resolveParameters(
  preset: MotionPresetDefinition,
  overrides?: Partial<MotionPresetParameters>,
): MotionPresetParameters {
  return {
    ...DEFAULT_PRESET_PARAMETERS,
    ...overrides,
    spring: { ...DEFAULT_PRESET_PARAMETERS.spring, ...overrides?.spring },
  };
}

/**
 * Generate the tracks a preset would produce.
 *
 * Pure: same inputs, same output apart from keyframe ids. That is what lets
 * the preview run the real generator rather than an approximation of it — what
 * you watch is exactly what Apply writes.
 */
export function generateTracks(
  preset: MotionPresetDefinition,
  context: GenerateContext,
  overrides?: Partial<MotionPresetParameters>,
): AnimationTrack[] {
  const params = resolveParameters(preset, overrides);
  const span = context.duration > 0 ? context.duration : preset.duration;

  // A delay eats into the span rather than extending it, so a preset can never
  // push keyframes past the end of the composition.
  const delay = clamp(params.delay, 0, Math.max(0, span - 0.1));
  const motionSpan = span - delay;

  const tracks: AnimationTrack[] = [];

  for (const [property, specs] of Object.entries(preset.tracks)) {
    if (!specs || specs.length === 0) continue;

    const key = property as AnimatableProperty;
    const keyframes = buildKeyframes(key, specs, preset, params, context, motionSpan, delay);

    if (keyframes.length > 0) tracks.push({ property: key, keyframes });
  }

  return tracks;
}

function buildKeyframes(
  property: AnimatableProperty,
  specs: MotionKeyframeSpec[],
  preset: MotionPresetDefinition,
  params: MotionPresetParameters,
  context: GenerateContext,
  motionSpan: number,
  delay: number,
): Keyframe[] {
  const resolved = specs.map((spec) => ({
    time: roundTime(delay + spec.at * motionSpan),
    value: resolveValue(property, spec, params, context.baseTransform, context.baseMetadata),
    easing: resolveEasing(spec, preset, params),
  }));

  const useSpring =
    Boolean(preset.supports?.spring) && params.springIntensity > 0 && resolved.length >= 2;

  const keyframes = useSpring ? bakeSpring(resolved, params) : resolved;

  return keyframes.map((entry) => ({
    id: createId("kf"),
    time: entry.time,
    value: round(entry.value),
    easing: entry.easing,
  }));
}

/**
 * Resolve one spec into an absolute value.
 *
 * Intensity scales *travel*, never the destination. A rise-in at intensity 2
 * starts twice as far below, but still ends exactly where the user put the
 * device — scaling the resting value too would move their composition.
 */
function resolveValue(
  property: AnimatableProperty,
  spec: MotionKeyframeSpec,
  params: MotionPresetParameters,
  base: Transform,
  baseMetadata: unknown,
): number {
  let value = spec.value;

  if (spec.scaled) {
    const intensity = clamp(params.intensity, 0, 2);
    if (spec.relative) {
      value *= intensity;
    } else {
      // An absolute scale or opacity: scale the distance from its neutral
      // point, so intensity 0 is "no motion" rather than "collapse to zero".
      const neutral = neutralFor(property);
      value = neutral + (value - neutral) * intensity;
    }
  }

  if (spec.directional && DIRECTIONAL_PROPERTIES.has(property)) {
    value *= directionSign(params.direction);
  }

  return spec.relative ? staticPropertyValueOf(base, baseMetadata, property) + value : value;
}

/** The value a property sits at when nothing is animating it. */
function neutralFor(property: AnimatableProperty): number {
  if (property.startsWith("scale")) return 1;
  if (property === "opacity") return 1;
  // Fully revealed and a normal line height are the resting states; treating
  // them as 0 would make intensity 0 mean "invisible" instead of "no motion".
  if (property === "reveal" || property === "lineHeight") return 1;
  return 0;
}

function directionSign(direction: MotionDirection): number {
  // "center" keeps the preset's designed sign; the others mirror it.
  if (direction === "right" || direction === "bottom") return -1;
  if (direction === "left" || direction === "top") return 1;
  return 1;
}

function resolveEasing(
  spec: MotionKeyframeSpec,
  preset: MotionPresetDefinition,
  params: MotionPresetParameters,
): EasingType {
  // An easing override only applies where the preset offers the control —
  // forcing `linear` onto a turntable's already-linear track is harmless, but
  // forcing `elastic` onto one would ruin a seamless loop.
  if (params.easing && preset.supports?.easing) return params.easing;
  return spec.easing ?? "easeInOut";
}

interface ResolvedKeyframe {
  time: number;
  value: number;
  easing: EasingType;
}

/**
 * Replace the first segment with a sampled spring.
 *
 * A spring's shape depends on mass, stiffness and damping, which the project
 * format has no way to store. Rather than teaching the evaluator physics, the
 * spring is simulated and written out as ordinary keyframes with linear
 * segments — so it scrubs, exports and edits like anything else, and the user
 * can drag the resulting keyframes afterwards.
 *
 * Only the first segment is sprung: that is where the motion arrives, and
 * springing every segment would turn a considered settle into a wobble.
 */
function bakeSpring(
  keyframes: ResolvedKeyframe[],
  params: MotionPresetParameters,
): ResolvedKeyframe[] {
  const [from, to, ...rest] = keyframes;
  if (!to) return keyframes;

  const spring = springFromIntensity(params.springIntensity, params.spring);
  const curve = createSpringEasing(spring);
  const samples = sampleEasing(curve, SPRING_SAMPLES);

  const span = to.time - from.time;
  if (span <= 0) return keyframes;

  const baked: ResolvedKeyframe[] = samples.map((progress, index) => ({
    time: roundTime(from.time + (index / (samples.length - 1)) * span),
    value: from.value + (to.value - from.value) * progress,
    easing: "linear" as const,
  }));

  // The final sample *is* the original keyframe, so its easing has to carry
  // over or the next segment loses the preset's intent.
  baked[baked.length - 1] = { ...baked[baked.length - 1], easing: to.easing };

  return [...baked, ...rest];
}

// ---------------------------------------------------------------------------
// Fitting a preset to a composition
// ---------------------------------------------------------------------------

export type DurationStrategy = "fit" | "extend";

export interface DurationPlan {
  /** True when the preset is longer than the composition. */
  conflict: boolean;
  presetDuration: number;
  projectDuration: number;
  /** Composition length after applying the chosen strategy. */
  resultingDuration: number;
  /** Seconds the preset itself is fitted into. */
  presetSpan: number;
}

/**
 * Work out how a preset and a composition length fit together.
 *
 * Silently stretching someone's five-second composition to twelve because they
 * clicked Turntable Loop is the kind of "helpful" that loses work, so the
 * decision is surfaced rather than made.
 */
export function planDuration(
  preset: MotionPresetDefinition,
  projectDuration: number,
  strategy: DurationStrategy = "fit",
): DurationPlan {
  const presetDuration = preset.duration;
  const conflict = presetDuration > projectDuration + 0.001;

  if (!conflict) {
    return {
      conflict: false,
      presetDuration,
      projectDuration,
      resultingDuration: projectDuration,
      presetSpan: presetDuration,
    };
  }

  if (strategy === "extend") {
    return {
      conflict: true,
      presetDuration,
      projectDuration,
      resultingDuration: presetDuration,
      presetSpan: presetDuration,
    };
  }

  // "Fit" compresses the preset proportionally: every keyframe keeps its
  // relative position, so the motion's shape survives even though it plays
  // faster.
  return {
    conflict: true,
    presetDuration,
    projectDuration,
    resultingDuration: projectDuration,
    presetSpan: projectDuration,
  };
}

// ---------------------------------------------------------------------------
// Merging into an existing layer
// ---------------------------------------------------------------------------

export interface MergeResult {
  tracks: AnimationTrack[];
  /** Properties that already had keyframes and were overwritten. */
  replaced: AnimatableProperty[];
}

/**
 * Merge generated tracks into a layer's existing animation.
 *
 * Properties the preset does not touch are left completely alone — that is
 * what makes presets stackable: Scale In then Device Spin gives you both,
 * because one owns `scale*` and the other owns `rotationY`.
 *
 * Where they do collide the incoming track wins, and the caller is told which
 * properties were overwritten so the user can be warned before it happens
 * rather than after.
 */
export function mergePresetTracks(
  existing: AnimationTrack[],
  incoming: AnimationTrack[],
): MergeResult {
  const incomingProperties = new Set(incoming.map((track) => track.property));

  const replaced = existing
    .filter((track) => incomingProperties.has(track.property) && track.keyframes.length > 0)
    .map((track) => track.property);

  const untouched = existing.filter((track) => !incomingProperties.has(track.property));

  return { tracks: [...untouched, ...incoming], replaced };
}

/** Properties a preset will write, for conflict checks before applying. */
export function presetProperties(preset: MotionPresetDefinition): AnimatableProperty[] {
  return Object.keys(preset.tracks) as AnimatableProperty[];
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function roundTime(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}
