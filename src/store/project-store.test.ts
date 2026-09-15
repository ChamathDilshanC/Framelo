import { beforeEach, describe, expect, it, vi } from "vitest";

import { evaluateTransform, findTrack } from "@/engine/animation/evaluate";
import { getMotionPreset } from "@/engine/motion/motion-presets";
import { createDeviceLayer, createProject } from "@/lib/project-factory";
import { useProjectStore } from "@/store/project-store";

/** The value a new device layer starts at, rather than a literal that drifts. */
const DEFAULT_ROTATION_Y = createDeviceLayer().transform.rotationY;

function store() {
  return useProjectStore.getState();
}

function layer() {
  const current = store().project?.layers[0];
  if (!current) throw new Error("No layer in project");
  return current;
}

beforeEach(() => {
  vi.useRealTimers();
  useProjectStore.getState().loadProject(createProject("Test project"));
});

describe("project store — transforms", () => {
  it("writes to the static transform when nothing is animated", () => {
    store().setTransformValue(layer().id, "rotationY", 45, { time: 0 });
    expect(layer().transform.rotationY).toBe(45);
  });

  it("marks the project unsaved after an edit", () => {
    expect(store().saveStatus).toBe("saved");
    store().setTransformValue(layer().id, "x", 1, { time: 0 });
    expect(store().saveStatus).toBe("unsaved");
  });

  it("resets the transform to identity", () => {
    store().setTransformValue(layer().id, "rotationY", 45, { time: 0 });
    store().resetTransform(layer().id);
    expect(layer().transform.rotationY).toBe(0);
    expect(layer().transform.scaleX).toBe(1);
  });
});

describe("project store — keyframes", () => {
  it("interpolates between two keyframes added at different times", () => {
    const id = layer().id;

    store().addKeyframe(id, "rotationY", 0, 0);
    store().addKeyframe(id, "rotationY", 2, 180);

    expect(evaluateTransform(layer(), 0).rotationY).toBe(0);
    expect(evaluateTransform(layer(), 2).rotationY).toBe(180);
    expect(evaluateTransform(layer(), 1).rotationY).toBeCloseTo(90, 4);
  });

  it("auto-keys the playhead once a property is animated", () => {
    const id = layer().id;
    store().addKeyframe(id, "x", 0, 0);

    // Editing at a new time creates a keyframe instead of moving the whole layer.
    store().setTransformValue(id, "x", 3, { time: 1.5 });

    const track = findTrack(layer().animations, "x");
    expect(track?.keyframes).toHaveLength(2);
    expect(evaluateTransform(layer(), 1.5).x).toBe(3);
    // The static transform is untouched while a track exists.
    expect(layer().transform.x).toBe(0);
  });

  it("updates the keyframe already sitting on the playhead", () => {
    const id = layer().id;
    store().addKeyframe(id, "x", 1, 5);
    store().setTransformValue(id, "x", 9, { time: 1 });

    const track = findTrack(layer().animations, "x");
    expect(track?.keyframes).toHaveLength(1);
    expect(track?.keyframes[0].value).toBe(9);
  });

  it("keeps keyframes sorted when one is moved across another", () => {
    const id = layer().id;
    store().addKeyframe(id, "y", 0, 0);
    store().addKeyframe(id, "y", 1, 10);

    const first = findTrack(layer().animations, "y")!.keyframes[0];
    store().moveKeyframe(id, "y", first.id, 3);

    const times = findTrack(layer().animations, "y")!.keyframes.map((kf) => kf.time);
    expect(times).toEqual([1, 3]);
  });

  it("clamps a moved keyframe to zero", () => {
    const id = layer().id;
    store().addKeyframe(id, "y", 1, 10);
    const keyframe = findTrack(layer().animations, "y")!.keyframes[0];

    store().moveKeyframe(id, "y", keyframe.id, -5);
    expect(findTrack(layer().animations, "y")!.keyframes[0].time).toBe(0);
  });

  it("drops the track once its last keyframe is removed", () => {
    const id = layer().id;
    store().addKeyframe(id, "opacity", 0, 1);
    const keyframe = findTrack(layer().animations, "opacity")!.keyframes[0];

    store().removeKeyframe(id, "opacity", keyframe.id);
    expect(findTrack(layer().animations, "opacity")).toBeUndefined();
  });

  it("changes easing on a keyframe", () => {
    const id = layer().id;
    store().addKeyframe(id, "x", 0, 0, "linear");
    const keyframe = findTrack(layer().animations, "x")!.keyframes[0];

    store().setKeyframeEasing(id, "x", keyframe.id, "easeOut");
    expect(findTrack(layer().animations, "x")!.keyframes[0].easing).toBe("easeOut");
  });

  it("duplicates a keyframe at an offset", () => {
    const id = layer().id;
    store().addKeyframe(id, "x", 1, 4);
    const keyframe = findTrack(layer().animations, "x")!.keyframes[0];

    store().duplicateKeyframe(id, "x", keyframe.id, 0.5);
    const track = findTrack(layer().animations, "x")!;
    expect(track.keyframes).toHaveLength(2);
    expect(track.keyframes[1].time).toBe(1.5);
    expect(track.keyframes[1].id).not.toBe(keyframe.id);
  });
});

describe("project store — history", () => {
  it("undoes and redoes a transform change", () => {
    const id = layer().id;
    store().setTransformValue(id, "rotationY", 90, { time: 0, coalesceKey: "a" });
    expect(layer().transform.rotationY).toBe(90);

    store().undo();
    expect(layer().transform.rotationY).toBe(DEFAULT_ROTATION_Y);

    store().redo();
    expect(layer().transform.rotationY).toBe(90);
  });

  it("collapses a rapid drag into a single history entry", () => {
    const id = layer().id;
    for (const value of [10, 20, 30, 40]) {
      store().setTransformValue(id, "rotationY", value, { time: 0, coalesceKey: "drag" });
    }

    expect(layer().transform.rotationY).toBe(40);
    store().undo();
    // One undo returns to the value before the drag started.
    expect(layer().transform.rotationY).toBe(DEFAULT_ROTATION_Y);
  });

  it("does not merge separate properties into one entry", () => {
    const id = layer().id;
    store().setTransformValue(id, "x", 1, { time: 0 });
    store().setTransformValue(id, "y", 2, { time: 0 });

    store().undo();
    expect(layer().transform.y).toBe(0);
    expect(layer().transform.x).toBe(1);
  });

  it("undoes keyframe creation", () => {
    const id = layer().id;
    store().addKeyframe(id, "rotationY", 0, 0);
    store().addKeyframe(id, "rotationY", 2, 180);
    expect(findTrack(layer().animations, "rotationY")?.keyframes).toHaveLength(2);

    store().undo();
    expect(findTrack(layer().animations, "rotationY")?.keyframes).toHaveLength(1);

    store().undo();
    expect(findTrack(layer().animations, "rotationY")).toBeUndefined();
  });

  it("clears the redo stack after a new edit", () => {
    const id = layer().id;
    store().setTransformValue(id, "x", 1, { time: 0 });
    store().undo();
    store().setTransformValue(id, "y", 5, { time: 0 });
    store().redo();

    expect(layer().transform.x).toBe(0);
    expect(layer().transform.y).toBe(5);
  });

  it("ignores undo with an empty history", () => {
    const before = store().project;
    store().undo();
    expect(store().project).toBe(before);
  });
});

describe("project store — motion presets and background", () => {
  const spin = getMotionPreset("device-spin")!;
  const turntableLoop = getMotionPreset("turntable-loop")!;

  it("applies a preset as real keyframes", () => {
    // Relative to the layer's own rotation, which the factory starts at -25.
    const base = layer().transform.rotationY;
    store().applyMotionPreset(layer().id, spin, { durationStrategy: "fit" });

    const track = findTrack(layer().animations, "rotationY");
    expect(track?.keyframes.length).toBeGreaterThan(1);
    expect(evaluateTransform(layer(), 0).rotationY).toBeCloseTo(base, 4);

    const duration = store().project!.canvas.duration;
    expect(evaluateTransform(layer(), duration).rotationY).toBeCloseTo(base + 360, 4);
  });

  it("fits a long preset into the composition by default", () => {
    const projectDuration = store().project!.canvas.duration;
    expect(turntableLoop.duration).toBeGreaterThan(projectDuration);

    store().applyMotionPreset(layer().id, turntableLoop, { durationStrategy: "fit" });

    // Fitting must not change the composition — that is the whole difference
    // between it and extending.
    expect(store().project?.canvas.duration).toBe(projectDuration);

    const track = findTrack(layer().animations, "rotationY")!;
    const last = track.keyframes[track.keyframes.length - 1];
    expect(last.time).toBeCloseTo(projectDuration, 3);
  });

  it("grows the composition only when asked to extend", () => {
    store().applyMotionPreset(layer().id, turntableLoop, { durationStrategy: "extend" });
    expect(store().project?.canvas.duration).toBe(turntableLoop.duration);
  });

  it("leaves unrelated tracks alone when applying a preset", () => {
    const id = layer().id;
    store().addKeyframe(id, "opacity", 0, 0.5);

    store().applyMotionPreset(id, spin, {});

    // Spin owns rotationY; the hand-keyed opacity is untouched. This is what
    // makes presets stackable.
    expect(findTrack(layer().animations, "opacity")?.keyframes).toHaveLength(1);
    expect(findTrack(layer().animations, "rotationY")?.keyframes.length).toBeGreaterThan(1);
  });

  it("reports which properties it overwrote", () => {
    const id = layer().id;
    store().applyMotionPreset(id, spin, {});

    const result = store().applyMotionPreset(id, spin, {});
    expect(result.replaced).toEqual(["rotationY"]);
  });

  it("undoes a whole preset in one step", () => {
    const id = layer().id;
    const before = store().project!;

    // "Showcase" writes six tracks and well over a dozen keyframes.
    store().applyMotionPreset(id, getMotionPreset("showcase")!, {});
    expect(layer().animations.length).toBeGreaterThan(3);

    store().undo();
    expect(store().project).toBe(before);
  });

  it("undoes an extended composition together with its preset", () => {
    const id = layer().id;
    const originalDuration = store().project!.canvas.duration;

    store().applyMotionPreset(id, turntableLoop, { durationStrategy: "extend" });
    expect(store().project?.canvas.duration).toBe(turntableLoop.duration);

    store().undo();
    expect(store().project?.canvas.duration).toBe(originalDuration);
    expect(layer().animations).toHaveLength(0);
  });

  it("switches the background and can undo it", () => {
    store().setBackground({ type: "transparent" });
    expect(store().project?.background.type).toBe("transparent");

    store().undo();
    expect(store().project?.background.type).toBe("solid");
  });

  it("assigns screen media through device metadata", () => {
    store().updateDeviceMetadata(layer().id, { screenAssetId: "asset_1" });
    expect(layer().metadata?.screenAssetId).toBe("asset_1");

    store().undo();
    expect(layer().metadata?.screenAssetId).toBeNull();
  });
});
