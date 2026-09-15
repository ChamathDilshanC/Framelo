"use client";

import { notify } from "@/lib/toast";
import { useEditorStore, type ClipboardKeyframe, type KeyframeSelection } from "@/store/editor-store";
import { useProjectStore, type KeyframeSeed } from "@/store/project-store";
import type { EasingType } from "@/types/animation";
import type { Project } from "@/types/project";

/**
 * What the timeline can do to a keyframe selection.
 *
 * Plain functions reading the stores directly, rather than a hook, because
 * every one of these has three entry points — a keyboard shortcut, a context
 * menu item and an inspector button — and all three must do exactly the same
 * thing. Three components each implementing "delete the selection" is three
 * chances for one of them to forget to clear the selection afterwards.
 *
 * None of these is a no-op that pretends to have worked: each returns how much
 * it actually touched, and the callers report that.
 */

function project(): Project | null {
  return useProjectStore.getState().project;
}

/** The keyframe a reference points at, or undefined if it has since gone. */
export function resolveKeyframe(selection: KeyframeSelection) {
  return project()
    ?.layers.find((layer) => layer.id === selection.layerId)
    ?.animations.find((track) => track.property === selection.property)
    ?.keyframes.find((keyframe) => keyframe.id === selection.keyframeId);
}

/**
 * Copy the selection.
 *
 * Times are stored relative to the *earliest* keyframe copied, so pasting a
 * group keeps the timing between its members while landing wherever the
 * playhead is. Storing absolute times would make paste mean "put it back where
 * it came from", which is what duplicate is for.
 */
export function copySelectedKeyframes(): number {
  const selections = useEditorStore.getState().selectedKeyframes;
  if (selections.length === 0) return 0;

  const resolved = selections
    .map((selection) => ({ selection, keyframe: resolveKeyframe(selection) }))
    .filter((entry): entry is { selection: KeyframeSelection; keyframe: NonNullable<ReturnType<typeof resolveKeyframe>> } =>
      Boolean(entry.keyframe),
    );

  if (resolved.length === 0) return 0;

  const earliest = Math.min(...resolved.map((entry) => entry.keyframe.time));

  const clipboard: ClipboardKeyframe[] = resolved.map((entry) => ({
    property: entry.selection.property,
    offset: Math.round((entry.keyframe.time - earliest) * 1000) / 1000,
    value: entry.keyframe.value,
    easing: entry.keyframe.easing,
  }));

  useEditorStore.getState().setKeyframeClipboard(clipboard);
  return clipboard.length;
}

/**
 * Paste at the playhead, onto the selected layer.
 *
 * Onto the *selected* layer rather than the one the keyframes came from: that
 * is what makes copy-and-paste useful for moving an animation between two
 * layers, and pasting back onto the original is just the case where the
 * selection has not changed.
 */
export function pasteKeyframes(): number {
  const editor = useEditorStore.getState();
  const clipboard = editor.keyframeClipboard;
  const layerId = editor.selectedLayerId;

  if (clipboard.length === 0 || !layerId) return 0;

  const seeds: KeyframeSeed[] = clipboard.map((entry) => ({
    property: entry.property,
    offset: entry.offset,
    value: entry.value,
    easing: entry.easing,
  }));

  const created = useProjectStore.getState().pasteKeyframes(layerId, seeds, editor.currentTime);
  if (created.length > 0) editor.selectKeyframes(created);
  return created.length;
}

/** Duplicate the selection, offset forward, and select the copies. */
export function duplicateSelectedKeyframes(offset: number): number {
  const editor = useEditorStore.getState();
  const refs = editor.selectedKeyframes;
  if (refs.length === 0) return 0;

  const copies = useProjectStore.getState().duplicateKeyframes(refs, offset);
  if (copies.length > 0) editor.selectKeyframes(copies);
  return copies.length;
}

export function deleteSelectedKeyframes(): number {
  const editor = useEditorStore.getState();
  const refs = editor.selectedKeyframes;
  if (refs.length === 0) return 0;

  useProjectStore.getState().removeKeyframes(refs);
  editor.clearKeyframeSelection();
  return refs.length;
}

/**
 * Move the selection in time.
 *
 * Used by the arrow keys. The step is a frame or a second, and the direction
 * comes from the caller, so the same function serves both.
 */
export function nudgeSelectedKeyframes(delta: number): number {
  const refs = useEditorStore.getState().selectedKeyframes;
  if (refs.length === 0) return 0;

  useProjectStore.getState().nudgeKeyframes(refs, delta, { coalesceKey: "keyframe:nudge-keys" });
  return refs.length;
}

export function setSelectedKeyframesEasing(easing: EasingType): number {
  const refs = useEditorStore.getState().selectedKeyframes;
  if (refs.length === 0) return 0;

  useProjectStore.getState().setKeyframesEasing(refs, easing);
  return refs.length;
}

/** Select every keyframe on the track the given one belongs to. */
export function selectAllOnTrack(selection: KeyframeSelection): number {
  const track = project()
    ?.layers.find((layer) => layer.id === selection.layerId)
    ?.animations.find((entry) => entry.property === selection.property);

  if (!track) return 0;

  useEditorStore.getState().selectKeyframes(
    track.keyframes.map((keyframe) => ({
      layerId: selection.layerId,
      property: selection.property,
      keyframeId: keyframe.id,
    })),
  );
  return track.keyframes.length;
}

/** Wording that stays correct at one and at forty. */
export function keyframeCount(count: number): string {
  return `${count} keyframe${count === 1 ? "" : "s"}`;
}

export function notifyCopied(count: number): void {
  if (count === 0) {
    notify.info("Nothing to copy", "Select a keyframe on the timeline first.");
    return;
  }
  notify.success(`${keyframeCount(count)} copied`, "Paste lands at the playhead.");
}
