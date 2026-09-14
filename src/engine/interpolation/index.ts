import { applyEasing, clamp01 } from "@/engine/easing";
import type { EasingType } from "@/types/animation";

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** Normalised progress of `time` between two keyframe times. */
export function progressBetween(startTime: number, endTime: number, time: number): number {
  const span = endTime - startTime;
  if (span <= 0) return 1;
  return clamp01((time - startTime) / span);
}

export function interpolate(
  from: number,
  to: number,
  startTime: number,
  endTime: number,
  time: number,
  easing: EasingType,
): number {
  const t = applyEasing(easing, progressBetween(startTime, endTime, time));
  return lerp(from, to, t);
}
