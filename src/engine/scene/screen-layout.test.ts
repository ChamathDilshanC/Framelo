import { describe, expect, it } from "vitest";

import { computeScreenLayout } from "@/engine/scene/screen-layout";

const SCREEN_W = 1.376;
const SCREEN_H = 2.916;
const SCREEN_ASPECT = SCREEN_W / SCREEN_H;

describe("computeScreenLayout", () => {
  it("stretches to the screen in fill mode", () => {
    const layout = computeScreenLayout("fill", SCREEN_W, SCREEN_H, 1.78);
    expect(layout.planeWidth).toBe(SCREEN_W);
    expect(layout.planeHeight).toBe(SCREEN_H);
    expect(layout.repeat).toEqual([1, 1]);
  });

  it("falls back to the plain screen when the image aspect is unknown", () => {
    const layout = computeScreenLayout("cover", SCREEN_W, SCREEN_H, undefined);
    expect(layout.repeat).toEqual([1, 1]);
  });

  it("crops the sides for a wide image in cover mode", () => {
    const layout = computeScreenLayout("cover", SCREEN_W, SCREEN_H, 1.78);
    expect(layout.repeat[0]).toBeLessThan(1);
    expect(layout.repeat[1]).toBe(1);
    expect(layout.offset[0]).toBeCloseTo((1 - layout.repeat[0]) / 2, 6);
  });

  it("crops top and bottom for an extra-tall image in cover mode", () => {
    const layout = computeScreenLayout("cover", SCREEN_W, SCREEN_H, SCREEN_ASPECT / 2);
    expect(layout.repeat[0]).toBe(1);
    expect(layout.repeat[1]).toBeLessThan(1);
  });

  it("leaves the image uncropped in cover mode when aspects match", () => {
    const layout = computeScreenLayout("cover", SCREEN_W, SCREEN_H, SCREEN_ASPECT);
    expect(layout.repeat[0]).toBeCloseTo(1, 6);
    expect(layout.repeat[1]).toBeCloseTo(1, 6);
  });

  it("letterboxes by shrinking the plane in contain mode", () => {
    const layout = computeScreenLayout("contain", SCREEN_W, SCREEN_H, 1.78);
    expect(layout.repeat).toEqual([1, 1]);
    expect(layout.planeWidth).toBe(SCREEN_W);
    expect(layout.planeHeight).toBeCloseTo(SCREEN_W / 1.78, 6);
    expect(layout.planeHeight).toBeLessThan(SCREEN_H);
  });

  it("never exceeds the screen bounds", () => {
    for (const aspect of [0.2, 0.5, 1, 1.78, 3]) {
      const layout = computeScreenLayout("contain", SCREEN_W, SCREEN_H, aspect);
      expect(layout.planeWidth).toBeLessThanOrEqual(SCREEN_W + 1e-9);
      expect(layout.planeHeight).toBeLessThanOrEqual(SCREEN_H + 1e-9);
    }
  });
});
