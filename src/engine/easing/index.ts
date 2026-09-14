import type { EasingType } from "@/types/animation";

export type EasingFunction = (t: number) => number;

/**
 * Easing functions operate on a normalised progress value in [0, 1].
 *
 * This is the single registry the whole app eases through: the evaluator, the
 * timeline and the motion library all resolve names here, so there is exactly
 * one definition of what "smooth" means.
 *
 * Curves that overshoot (back, elastic, spring) deliberately return values
 * outside [0, 1]. That is the point — a value settling from 1.04 back to 1 is
 * what makes motion read as designed rather than tweened.
 */
export const EASING_FUNCTIONS: Record<EasingType, EasingFunction> = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),

  /**
   * The workhorse. A gentler ease-out than `easeOut`: it leaves quickly but
   * spends longer arriving, which is what makes a settle feel considered
   * rather than abrupt.
   */
  smooth: (t) => 1 - Math.pow(1 - t, 4),

  /** Decisive. For accents and quick state changes, not for hero motion. */
  sharp: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),

  /** A small anticipation, then a small overshoot. Kept subtle on purpose. */
  back: (t) => {
    const overshoot = 1.7;
    const c = overshoot + 1;
    return 1 + c * Math.pow(t - 1, 3) + overshoot * Math.pow(t - 1, 2);
  },

  /**
   * Decaying oscillation. Use sparingly — it reads as playful, not premium.
   *
   * Damped harder than the textbook curve, which peaks around 1.37: a 37%
   * overshoot on a product mockup reads as a glitch. This settles at ~1.26,
   * which still bounces but stays inside the library's quality bar.
   */
  elastic: (t) => {
    if (t === 0 || t === 1) return t;
    const period = (2 * Math.PI) / 3;
    return Math.pow(2, -14 * t) * Math.sin((t * 10 - 0.75) * period) + 1;
  },

  /**
   * A critically-damped-ish spring: one small overshoot, then a clean settle.
   * Tuned to land by t = 1 so it can be used on a keyframe segment without
   * leaving the value short of its target.
   */
  spring: (t) => {
    if (t === 0 || t === 1) return t;
    return 1 - Math.exp(-6 * t) * Math.cos(9 * t);
  },

  /**
   * Exponential in-out. The most aggressive non-overshoot curve here: it
   * barely moves for the first third and then covers most of the distance at
   * once, which is what makes a push or a depth move read as fast without the
   * start being abrupt.
   */
  expo: (t) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },

  /**
   * Circular in-out. Follows the arc of a circle, so it leaves slowly, runs
   * at near-constant speed through the middle and arrives slowly — mechanical
   * in a good way, and the right curve for an orbit or a turn.
   */
  circ: (t) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
  },

  /** Quintic in-out: one step past `sharp`, for long travels that need to settle. */
  quint: (t) =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
};

export function getEasingFunction(easing: EasingType): EasingFunction {
  return EASING_FUNCTIONS[easing] ?? EASING_FUNCTIONS.linear;
}

export function applyEasing(easing: EasingType, t: number): number {
  return getEasingFunction(easing)(clamp01(t));
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
