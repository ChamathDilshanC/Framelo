import { describe, expect, it } from "vitest";

import {
  collectKeyframeTimes,
  evaluateTrack,
  evaluateTransform,
  isPropertyAnimated,
  keyframeAtTime,
} from "@/engine/animation/evaluate";
import type { AnimationTrack } from "@/types/animation";
import { IDENTITY_TRANSFORM, type Layer } from "@/types/layer";

function track(keyframes: AnimationTrack["keyframes"]): AnimationTrack {
  return { property: "rotationY", keyframes };
}

function layerWith(tracks: AnimationTrack[]): Layer {
  return {
    id: "layer_1",
    name: "Device",
    type: "device",
    visible: true,
    locked: false,
    transform: { ...IDENTITY_TRANSFORM },
    animations: tracks,
  };
}

describe("evaluateTrack", () => {
  it("returns null for an empty track", () => {
    expect(evaluateTrack(track([]), 1)).toBeNull();
  });

  it("holds a single keyframe value at any time", () => {
    const single = track([{ id: "a", time: 2, value: 45, easing: "linear" }]);
    expect(evaluateTrack(single, 0)).toBe(45);
    expect(evaluateTrack(single, 10)).toBe(45);
  });

  it("interpolates between surrounding keyframes", () => {
    // 0 degrees at 0s, 360 at 2s -> 180 at 1s
    const spin = track([
      { id: "a", time: 0, value: 0, easing: "linear" },
      { id: "b", time: 2, value: 360, easing: "linear" },
    ]);
    expect(evaluateTrack(spin, 1)).toBeCloseTo(180, 6);
    expect(evaluateTrack(spin, 0.5)).toBeCloseTo(90, 6);
  });

  it("holds before the first and after the last keyframe", () => {
    const spin = track([
      { id: "a", time: 1, value: 10, easing: "linear" },
      { id: "b", time: 3, value: 30, easing: "linear" },
    ]);
    expect(evaluateTrack(spin, 0)).toBe(10);
    expect(evaluateTrack(spin, 9)).toBe(30);
  });

  it("uses the easing of the segment starting keyframe", () => {
    const eased = track([
      { id: "a", time: 0, value: 0, easing: "easeIn" },
      { id: "b", time: 2, value: 100, easing: "linear" },
    ]);
    expect(evaluateTrack(eased, 1)).toBeLessThan(50);
  });

  it("handles unsorted keyframes", () => {
    const unsorted = track([
      { id: "b", time: 2, value: 100, easing: "linear" },
      { id: "a", time: 0, value: 0, easing: "linear" },
    ]);
    expect(evaluateTrack(unsorted, 1)).toBeCloseTo(50, 6);
  });

  it("picks the correct segment with three keyframes", () => {
    const multi = track([
      { id: "a", time: 0, value: 0, easing: "linear" },
      { id: "b", time: 1, value: 100, easing: "linear" },
      { id: "c", time: 2, value: 0, easing: "linear" },
    ]);
    expect(evaluateTrack(multi, 0.5)).toBeCloseTo(50, 6);
    expect(evaluateTrack(multi, 1.5)).toBeCloseTo(50, 6);
  });
});

describe("evaluateTransform", () => {
  it("falls back to the static transform when nothing is animated", () => {
    const layer = layerWith([]);
    layer.transform.rotationY = -18;
    expect(evaluateTransform(layer, 3).rotationY).toBe(-18);
  });

  it("lets animated properties override the static transform", () => {
    const layer = layerWith([
      track([
        { id: "a", time: 0, value: 0, easing: "linear" },
        { id: "b", time: 2, value: 360, easing: "linear" },
      ]),
    ]);
    layer.transform.rotationY = -18;

    const evaluated = evaluateTransform(layer, 1);
    expect(evaluated.rotationY).toBeCloseTo(180, 6);
    // Untouched properties keep their static value.
    expect(evaluated.scaleX).toBe(1);
  });
});

describe("track helpers", () => {
  const layer = layerWith([
    track([
      { id: "a", time: 0, value: 0, easing: "linear" },
      { id: "b", time: 2, value: 360, easing: "linear" },
    ]),
  ]);

  it("reports which properties are animated", () => {
    expect(isPropertyAnimated(layer, "rotationY")).toBe(true);
    expect(isPropertyAnimated(layer, "x")).toBe(false);
  });

  it("finds a keyframe sitting on a given time", () => {
    expect(keyframeAtTime(layer.animations[0], 2)?.id).toBe("b");
    expect(keyframeAtTime(layer.animations[0], 1)).toBeUndefined();
  });

  it("collects de-duplicated keyframe times", () => {
    expect(collectKeyframeTimes(layer)).toEqual([0, 2]);
  });
});
