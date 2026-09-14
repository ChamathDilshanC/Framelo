import { describe, expect, it } from "vitest";

import { applyEasing, EASING_FUNCTIONS, getEasingFunction } from "@/engine/easing";
import { EASING_TYPES } from "@/types/animation";

describe("easing", () => {
  it("exposes a function for every declared easing type", () => {
    for (const type of EASING_TYPES) {
      expect(typeof getEasingFunction(type)).toBe("function");
    }
  });

  it("anchors every curve at 0 and 1", () => {
    for (const type of EASING_TYPES) {
      expect(applyEasing(type, 0)).toBeCloseTo(0, 6);
      expect(applyEasing(type, 1)).toBeCloseTo(1, 6);
    }
  });

  it("clamps progress outside [0, 1]", () => {
    expect(applyEasing("linear", -3)).toBe(0);
    expect(applyEasing("linear", 4)).toBe(1);
  });

  it("keeps linear proportional", () => {
    expect(applyEasing("linear", 0.25)).toBeCloseTo(0.25, 6);
  });

  it("starts slow for easeIn and fast for easeOut", () => {
    expect(EASING_FUNCTIONS.easeIn(0.5)).toBeLessThan(0.5);
    expect(EASING_FUNCTIONS.easeOut(0.5)).toBeGreaterThan(0.5);
    expect(EASING_FUNCTIONS.easeInOut(0.5)).toBeCloseTo(0.5, 6);
  });

  /**
   * Overshoot curves are deliberately not monotonic — a value passing its
   * target and settling back is what separates designed motion from a tween.
   * They are held to a different contract: anchored, bounded, and they must
   * actually overshoot, or they are just a slower ease.
   */
  const OVERSHOOT: ReadonlySet<string> = new Set(["back", "elastic", "spring"]);

  it.each(EASING_TYPES.filter((type) => !OVERSHOOT.has(type)))(
    "%s advances monotonically",
    (type) => {
      let previous = -Infinity;
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const value = applyEasing(type, t);
        expect(value).toBeGreaterThanOrEqual(previous);
        previous = value;
      }
    },
  );

  it.each(EASING_TYPES.filter((type) => OVERSHOOT.has(type)))(
    "%s overshoots and settles",
    (type) => {
      const samples: number[] = [];
      for (let t = 0; t <= 1.0001; t += 0.01) samples.push(applyEasing(type, t));

      // It has to actually leave the range, or it is not an overshoot curve.
      expect(Math.max(...samples)).toBeGreaterThan(1);

      // And it has to stay sane: an easing that swings far past its target
      // reads as a glitch, not as motion.
      expect(Math.max(...samples)).toBeLessThan(1.35);
      expect(Math.min(...samples)).toBeGreaterThan(-0.35);
    },
  );

  it("keeps every curve finite across the range", () => {
    for (const type of EASING_TYPES) {
      for (let t = 0; t <= 1.0001; t += 0.01) {
        expect(Number.isFinite(applyEasing(type, t))).toBe(true);
      }
    }
  });
});
