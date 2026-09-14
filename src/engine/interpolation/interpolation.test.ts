import { describe, expect, it } from "vitest";

import { interpolate, lerp, progressBetween } from "@/engine/interpolation";

describe("interpolation", () => {
  it("lerps between two values", () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
    expect(lerp(-10, 10, 0.25)).toBe(-5);
  });

  it("normalises progress between keyframe times", () => {
    expect(progressBetween(0, 2, 1)).toBe(0.5);
    expect(progressBetween(1, 3, 1)).toBe(0);
    expect(progressBetween(1, 3, 3)).toBe(1);
  });

  it("treats a zero-length span as complete", () => {
    expect(progressBetween(2, 2, 2)).toBe(1);
  });

  it("matches the worked example from the architecture doc", () => {
    // Keyframe A = 0 at t=0, Keyframe B = 100 at t=2, linear → 50 at t=1
    expect(interpolate(0, 100, 0, 2, 1, "linear")).toBe(50);
  });

  it("applies easing to the interpolation", () => {
    expect(interpolate(0, 100, 0, 2, 1, "easeIn")).toBeLessThan(50);
    expect(interpolate(0, 100, 0, 2, 1, "easeOut")).toBeGreaterThan(50);
  });
});
