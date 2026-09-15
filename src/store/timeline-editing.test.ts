import { beforeEach, describe, expect, it } from "vitest";

import { buildDeviceMotion } from "@/engine/templates/device-motion-builder";
import { DEVICE_MOTION_TEMPLATES } from "@/engine/templates/device-motion-templates";
import { createProject } from "@/lib/project-factory";
import { parseProject } from "@/lib/validation/project-schema";
import { keyframesBeyond, useProjectStore, type KeyframeRef } from "@/store/project-store";
import { useEditorStore } from "@/store/editor-store";
import { resolveWorkArea } from "@/types/project";

/**
 * The timeline's editing model.
 *
 * These test the *store*, not the components, because that is where the
 * behaviour lives: dragging a group of keyframes, cropping to a shorter
 * duration and setting an in/out point are store operations that the timeline
 * merely invokes. Testing them here means the assertions survive any amount of
 * UI rearrangement, and it means each one can check the case that is hard to
 * catch by hand — forty keyframes moving together without one of them piling up
 * at zero.
 */

function freshProject() {
  const project = createProject("Timeline test");
  useProjectStore.getState().loadProject(project);
  useEditorStore.getState().selectKeyframe(null);
  return useProjectStore.getState().project!;
}

function layerId(): string {
  return useProjectStore.getState().project!.layers[0].id;
}

function track(property: string) {
  return useProjectStore
    .getState()
    .project!.layers[0].animations.find((entry) => entry.property === property);
}

/** Put four keyframes on one track at known times. */
function seedTrack(times: number[] = [0, 1, 2, 3]): KeyframeRef[] {
  const store = useProjectStore.getState();
  const id = layerId();
  times.forEach((time, index) => store.addKeyframe(id, "y", time, index));

  return track("y")!.keyframes.map((keyframe) => ({
    layerId: id,
    property: "y" as const,
    keyframeId: keyframe.id,
  }));
}

beforeEach(() => {
  freshProject();
});

describe("moving keyframes", () => {
  it("shifts a whole group by the same delta", () => {
    const refs = seedTrack();
    useProjectStore.getState().nudgeKeyframes(refs, 0.5);

    expect(track("y")!.keyframes.map((k) => k.time)).toEqual([0.5, 1.5, 2.5, 3.5]);
  });

  it("clamps the group at zero without collapsing its spacing", () => {
    // The bug this exists to prevent: clamping each keyframe individually
    // would pin the first three at 0 and leave the fourth at 1, destroying the
    // timing in a way no undo the user thinks to press will bring back.
    const refs = seedTrack([1, 2, 3, 4]);
    useProjectStore.getState().nudgeKeyframes(refs, -5);

    const times = track("y")!.keyframes.map((k) => k.time);
    expect(times).toEqual([0, 1, 2, 3]);
  });

  it("moves only what is selected", () => {
    const refs = seedTrack();
    useProjectStore.getState().nudgeKeyframes(refs.slice(2), 0.25);

    expect(track("y")!.keyframes.map((k) => k.time)).toEqual([0, 1, 2.25, 3.25]);
  });

  it("keeps the track sorted after a move that crosses another keyframe", () => {
    const refs = seedTrack();
    useProjectStore.getState().nudgeKeyframes([refs[0]], 2.5);

    const times = track("y")!.keyframes.map((k) => k.time);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it("is one undo for the whole group", () => {
    const refs = seedTrack();
    const before = track("y")!.keyframes.map((k) => k.time);

    useProjectStore.getState().nudgeKeyframes(refs, 0.5);
    useProjectStore.getState().undo();

    expect(track("y")!.keyframes.map((k) => k.time)).toEqual(before);
  });
});

describe("keyframe values and easing", () => {
  it("writes an exact value from the inspector", () => {
    const refs = seedTrack();
    useProjectStore.getState().setKeyframeValue(layerId(), "y", refs[1].keyframeId, -2.75);

    const keyframe = track("y")!.keyframes.find((k) => k.id === refs[1].keyframeId);
    expect(keyframe?.value).toBe(-2.75);
  });

  it("re-eases every selected keyframe at once", () => {
    const refs = seedTrack();
    useProjectStore.getState().setKeyframesEasing(refs, "expo");

    expect(track("y")!.keyframes.every((k) => k.easing === "expo")).toBe(true);
  });

  it("re-eases only the selection when it is partial", () => {
    const refs = seedTrack();
    useProjectStore.getState().setKeyframesEasing([refs[0], refs[3]], "circ");

    const easings = track("y")!.keyframes.map((k) => k.easing);
    expect(easings[0]).toBe("circ");
    expect(easings[3]).toBe("circ");
    expect(easings[1]).not.toBe("circ");
  });
});

describe("duplicate, copy and delete", () => {
  it("duplicates a group, offset, with new ids", () => {
    const refs = seedTrack();
    const copies = useProjectStore.getState().duplicateKeyframes(refs, 0.5);

    expect(copies).toHaveLength(4);
    expect(track("y")!.keyframes).toHaveLength(8);

    const ids = new Set(track("y")!.keyframes.map((k) => k.id));
    expect(ids.size).toBe(8);
  });

  it("pastes at a time, keeping the shape of the copied timing", () => {
    seedTrack();
    const store = useProjectStore.getState();

    // Offsets are relative to the earliest copied keyframe, which is what makes
    // a paste land at the playhead rather than back where it came from.
    const created = store.pasteKeyframes(
      layerId(),
      [
        { property: "rotationY", offset: 0, value: 0, easing: "linear" },
        { property: "rotationY", offset: 0.75, value: 90, easing: "smooth" },
      ],
      2,
    );

    expect(created).toHaveLength(2);
    expect(track("rotationY")!.keyframes.map((k) => k.time)).toEqual([2, 2.75]);
  });

  it("replaces rather than stacking when a paste lands on an existing keyframe", () => {
    const refs = seedTrack();
    const before = track("y")!.keyframes.length;

    useProjectStore
      .getState()
      .pasteKeyframes(layerId(), [{ property: "y", offset: 0, value: 42, easing: "linear" }], 1);

    expect(track("y")!.keyframes).toHaveLength(before);
    const at1 = track("y")!.keyframes.find((k) => Math.abs(k.time - 1) < 0.001);
    expect(at1?.value).toBe(42);
    expect(refs).toHaveLength(4);
  });

  it("deletes a selection and drops a track it empties", () => {
    const refs = seedTrack();
    useProjectStore.getState().removeKeyframes(refs);

    // Not an empty track: no track. A row with nothing on it would sit in the
    // timeline forever with no way to remove it.
    expect(track("y")).toBeUndefined();
  });

  it("deletes across two tracks in one commit", () => {
    const id = layerId();
    const store = useProjectStore.getState();
    store.addKeyframe(id, "y", 0, 0);
    store.addKeyframe(id, "y", 1, 1);
    store.addKeyframe(id, "opacity", 0, 0);
    store.addKeyframe(id, "opacity", 1, 1);

    const refs: KeyframeRef[] = [
      { layerId: id, property: "y", keyframeId: track("y")!.keyframes[0].id },
      { layerId: id, property: "opacity", keyframeId: track("opacity")!.keyframes[0].id },
    ];

    store.removeKeyframes(refs);
    useProjectStore.getState().undo();

    expect(track("y")!.keyframes).toHaveLength(2);
    expect(track("opacity")!.keyframes).toHaveLength(2);
  });
});

describe("shortening the composition", () => {
  it("reports what sits past a proposed duration", () => {
    seedTrack([0, 1, 5.2, 6, 7]);
    const doomed = keyframesBeyond(useProjectStore.getState().project!, 5);

    expect(doomed).toHaveLength(3);
  });

  it("reports nothing when everything already fits", () => {
    seedTrack([0, 1, 2]);
    expect(keyframesBeyond(useProjectStore.getState().project!, 5)).toEqual([]);
  });

  it("crops to the duration and says how much went", () => {
    seedTrack([0, 1, 5.2, 6, 7]);
    const removed = useProjectStore.getState().cropAnimation(5);

    expect(removed).toBe(3);
    expect(track("y")!.keyframes.map((k) => k.time)).toEqual([0, 1]);
  });

  it("is a single undo", () => {
    seedTrack([0, 1, 5.2, 6, 7]);
    useProjectStore.getState().cropAnimation(5);
    useProjectStore.getState().undo();

    expect(track("y")!.keyframes).toHaveLength(5);
  });

  it("does nothing at all when nothing is past the end", () => {
    seedTrack([0, 1, 2]);
    expect(useProjectStore.getState().cropAnimation(5)).toBe(0);
  });

  it("keeps a keyframe exactly on the new end", () => {
    // A keyframe at exactly 5.0 is inside a five-second composition, and
    // deleting it would silently remove the animation's final pose.
    seedTrack([0, 2.5, 5]);
    useProjectStore.getState().cropAnimation(5);

    expect(track("y")!.keyframes).toHaveLength(3);
  });

  it("leaves the animation alone when the duration merely changes", () => {
    // Shortening the composition without cropping is a supported state: the
    // keyframes stay and simply play past the end, so lengthening it again
    // brings the animation back intact.
    seedTrack([0, 1, 5.2, 6]);
    useProjectStore.getState().updateCanvas({ duration: 5 });

    expect(track("y")!.keyframes).toHaveLength(4);
  });
});

describe("the work area", () => {
  it("defaults to the whole composition", () => {
    const area = resolveWorkArea(useProjectStore.getState().project!.canvas);
    expect(area.in).toBe(0);
    expect(area.out).toBe(useProjectStore.getState().project!.canvas.duration);
    expect(area.enabled).toBe(false);
  });

  it("stores an in and out point", () => {
    useProjectStore.getState().setWorkArea({ in: 1, out: 3, enabled: true });
    const area = resolveWorkArea(useProjectStore.getState().project!.canvas);

    expect([area.in, area.out, area.enabled]).toEqual([1, 3, true]);
  });

  it("clamps a range that reaches past the composition", () => {
    const duration = useProjectStore.getState().project!.canvas.duration;
    useProjectStore.getState().setWorkArea({ in: 1, out: duration + 20, enabled: true });

    expect(resolveWorkArea(useProjectStore.getState().project!.canvas).out).toBe(duration);
  });

  it("keeps the range when it is switched off", () => {
    // Someone who exports the whole composition once should find their range
    // still there when they switch it back on.
    useProjectStore.getState().setWorkArea({ in: 1, out: 3, enabled: true });
    useProjectStore.getState().setWorkArea({ in: 1, out: 3, enabled: false });

    expect(useProjectStore.getState().project!.canvas.workArea).toMatchObject({ in: 1, out: 3 });
    expect(resolveWorkArea(useProjectStore.getState().project!.canvas).enabled).toBe(false);
  });

  it("survives a save and reload", () => {
    useProjectStore.getState().setWorkArea({ in: 0.5, out: 2.5, enabled: true });

    const round = parseProject(JSON.parse(JSON.stringify(useProjectStore.getState().project)));
    expect(round.ok).toBe(true);
    expect(round.project?.canvas.workArea).toEqual({ in: 0.5, out: 2.5, enabled: true });
  });

  it("drops a range that has collapsed to nothing on the way back in", () => {
    const project = createProject();
    project.canvas.workArea = { in: 2, out: 2, enabled: true };

    const round = parseProject(JSON.parse(JSON.stringify(project)));
    expect(round.project?.canvas.workArea).toBeUndefined();
  });
});

describe("what the project remembers", () => {
  it("round-trips export settings", () => {
    useProjectStore.getState().setExportSettings({
      format: "webp",
      resolutionId: "2160p",
      transparent: true,
      range: "work-area",
    });

    const round = parseProject(JSON.parse(JSON.stringify(useProjectStore.getState().project)));
    expect(round.project?.exportSettings).toEqual({
      format: "webp",
      resolutionId: "2160p",
      transparent: true,
      range: "work-area",
    });
  });

  it("records which device motion template built the composition", () => {
    const template = DEVICE_MOTION_TEMPLATES[0];
    const device = useProjectStore.getState().project!.layers[0];
    const build = buildDeviceMotion(template, device);

    const applied = useProjectStore
      .getState()
      .applyDeviceMotionTemplate(device.id, template, build);

    expect(applied).toBe(true);

    const project = useProjectStore.getState().project!;
    expect(project.deviceMotionTemplateId).toBe(template.id);
    expect(project.canvas.duration).toBe(template.duration);
    expect(project.layers[0].animations.length).toBe(build.tracks.length);

    const round = parseProject(JSON.parse(JSON.stringify(project)));
    expect(round.ok).toBe(true);
    expect(round.project?.deviceMotionTemplateId).toBe(template.id);
  });

  it("refuses to apply a choreography to a layer that is not there", () => {
    const template = DEVICE_MOTION_TEMPLATES[0];
    const build = buildDeviceMotion(template, null);

    expect(
      useProjectStore.getState().applyDeviceMotionTemplate("layer_missing", template, build),
    ).toBe(false);
  });

  it("takes a device motion template back in one undo", () => {
    const device = useProjectStore.getState().project!.layers[0];
    const before = JSON.stringify(useProjectStore.getState().project!.layers[0]);

    const template = DEVICE_MOTION_TEMPLATES[3];
    useProjectStore
      .getState()
      .applyDeviceMotionTemplate(device.id, template, buildDeviceMotion(template, device));
    useProjectStore.getState().undo();

    expect(JSON.stringify(useProjectStore.getState().project!.layers[0])).toBe(before);
  });

  it("leaves the canvas size and the text layers alone", () => {
    const store = useProjectStore.getState();
    store.updateCanvas({ width: 1080, height: 1920 });
    const textId = store.addTextLayer({ content: "Keep me" })!;

    const device = useProjectStore.getState().project!.layers.find((l) => l.type === "device")!;
    const template = DEVICE_MOTION_TEMPLATES[5];
    useProjectStore
      .getState()
      .applyDeviceMotionTemplate(device.id, template, buildDeviceMotion(template, device));

    const project = useProjectStore.getState().project!;
    expect([project.canvas.width, project.canvas.height]).toEqual([1080, 1920]);
    expect(project.layers.some((layer) => layer.id === textId)).toBe(true);
  });
});
