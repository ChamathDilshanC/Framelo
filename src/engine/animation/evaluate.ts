import { interpolate } from "@/engine/interpolation";
import { isTransformProperty } from "@/types/animation";
import type {
  AnimatableProperty,
  AnimationTrack,
  Keyframe,
  TextAnimatableProperty,
} from "@/types/animation";
import type { Layer, Transform } from "@/types/layer";

/** Keyframes sorted by time. Callers should keep tracks sorted, this is a safety net. */
export function sortKeyframes(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes].sort((a, b) => a.time - b.time);
}

/**
 * Evaluate a single track at `time`.
 *
 * - No keyframes  -> null (caller falls back to the layer's static transform)
 * - Before first  -> first keyframe value (hold)
 * - After last    -> last keyframe value (hold)
 * - In between    -> eased interpolation of the surrounding pair
 */
export function evaluateTrack(track: AnimationTrack, time: number): number | null {
  const keyframes = track.keyframes;
  if (keyframes.length === 0) return null;
  if (keyframes.length === 1) return keyframes[0].value;

  const sorted = isSorted(keyframes) ? keyframes : sortKeyframes(keyframes);

  const first = sorted[0];
  if (time <= first.time) return first.value;

  const last = sorted[sorted.length - 1];
  if (time >= last.time) return last.value;

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (time >= current.time && time <= next.time) {
      return interpolate(current.value, next.value, current.time, next.time, time, current.easing);
    }
  }

  return last.value;
}

function isSorted(keyframes: Keyframe[]): boolean {
  for (let i = 1; i < keyframes.length; i += 1) {
    if (keyframes[i].time < keyframes[i - 1].time) return false;
  }
  return true;
}

export function findTrack(
  tracks: AnimationTrack[],
  property: AnimatableProperty,
): AnimationTrack | undefined {
  return tracks.find((track) => track.property === property);
}

/**
 * Resolve a layer's transform at `time`: animated properties win, everything
 * else falls back to the layer's static transform.
 */
export function evaluateTransform(layer: Layer, time: number): Transform {
  return evaluateTransformWith(layer.transform, layer.animations, time);
}

/**
 * The same evaluation against tracks supplied by the caller.
 *
 * Exists so a preset preview can be rendered from generated tracks without
 * writing them into the project first — same evaluator, same maths, no second
 * code path to drift.
 */
export function evaluateTransformWith(
  base: Transform,
  tracks: AnimationTrack[],
  time: number,
): Transform {
  const result: Transform = { ...base };

  for (const track of tracks) {
    // Text layers keep typography tracks on this same array. They are not part
    // of the transform, and writing them into it would corrupt the matrix.
    if (!isTransformProperty(track.property)) continue;
    const value = evaluateTrack(track, time);
    if (value === null) continue;
    result[track.property] = value;
  }

  return result;
}

/**
 * Evaluate the typography tracks of a text layer.
 *
 * The same tracks and the same evaluator as the transform — only the
 * projection differs. Properties without a track return `undefined` so the
 * caller falls back to the layer's stored style, exactly as the transform
 * falls back to its static values.
 */
export function evaluateTextProperties(
  tracks: AnimationTrack[],
  time: number,
): Partial<Record<TextAnimatableProperty, number>> {
  const result: Partial<Record<TextAnimatableProperty, number>> = {};

  for (const track of tracks) {
    if (isTransformProperty(track.property)) continue;
    const value = evaluateTrack(track, time);
    if (value === null) continue;
    result[track.property as TextAnimatableProperty] = value;
  }

  return result;
}

/** True when the property has at least one keyframe on this layer. */
export function isPropertyAnimated(layer: Layer, property: AnimatableProperty): boolean {
  const track = findTrack(layer.animations, property);
  return Boolean(track && track.keyframes.length > 0);
}

/** The keyframe sitting exactly on `time` (within a frame tolerance), if any. */
export function keyframeAtTime(
  track: AnimationTrack | undefined,
  time: number,
  tolerance = 0.001,
): Keyframe | undefined {
  if (!track) return undefined;
  return track.keyframes.find((keyframe) => Math.abs(keyframe.time - time) <= tolerance);
}

/** All keyframe times on a layer, de-duplicated and sorted — used by the timeline. */
export function collectKeyframeTimes(layer: Layer): number[] {
  const times = new Set<number>();
  for (const track of layer.animations) {
    for (const keyframe of track.keyframes) times.add(round(keyframe.time));
  }
  return [...times].sort((a, b) => a - b);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
