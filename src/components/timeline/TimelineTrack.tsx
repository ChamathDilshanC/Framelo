"use client";

import * as React from "react";

import type { TimelineGeometry } from "@/components/timeline/use-timeline-geometry";
import { snapTime } from "@/components/timeline/timeline-model";
import { cn } from "@/lib/utils";
import { useEditorStore, type KeyframeSelection } from "@/store/editor-store";
import { useProjectStore, type KeyframeRef } from "@/store/project-store";
import type { AnimationTrack, Keyframe } from "@/types/animation";

export const ROW_HEIGHT = 32;

/** How far a pointer may wander before a click becomes a drag. */
const DRAG_THRESHOLD_PX = 3;

export interface KeyframeMenuRequest {
  selection: KeyframeSelection;
  x: number;
  y: number;
}

interface TimelineTrackProps {
  layerId: string;
  track: AnimationTrack;
  geometry: TimelineGeometry;
  duration: number;
  fps: number;
  onContextMenu: (request: KeyframeMenuRequest) => void;
}

export function TimelineTrack({
  layerId,
  track,
  geometry,
  duration,
  fps,
  onContextMenu,
}: TimelineTrackProps) {
  return (
    <div
      className="relative border-b border-line/60"
      style={{ height: ROW_HEIGHT, width: geometry.width }}
      data-timeline-track
    >
      {/* Span between first and last keyframe */}
      {track.keyframes.length > 1 ? (
        <span
          aria-hidden
          className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-accent/25"
          style={{
            left: geometry.timeToX(track.keyframes[0].time),
            width:
              geometry.timeToX(track.keyframes[track.keyframes.length - 1].time) -
              geometry.timeToX(track.keyframes[0].time),
          }}
        />
      ) : null}

      {track.keyframes.map((keyframe) => (
        <KeyframeMarker
          key={keyframe.id}
          layerId={layerId}
          property={track.property}
          keyframe={keyframe}
          geometry={geometry}
          duration={duration}
          fps={fps}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  );
}

interface KeyframeMarkerProps {
  layerId: string;
  property: AnimationTrack["property"];
  keyframe: Keyframe;
  geometry: TimelineGeometry;
  duration: number;
  fps: number;
  onContextMenu: (request: KeyframeMenuRequest) => void;
}

/**
 * One keyframe.
 *
 * The interaction model is After Effects', because that is what anyone who
 * reaches for a timeline already has in their hands:
 *
 * - click              — select this one alone
 * - shift-click        — add to the selection
 * - ctrl/cmd-click     — toggle this one
 * - drag               — move everything selected, together
 * - alt-drag           — leave a copy behind and drag the copy
 * - right-click        — the actions menu
 *
 * Dragging a keyframe that is *already* part of a selection moves the whole
 * selection and does not collapse it first. Getting that wrong is the classic
 * way a multi-select timeline becomes useless: every attempt to move a group
 * silently throws the group away.
 */
function KeyframeMarker({
  layerId,
  property,
  keyframe,
  geometry,
  duration,
  fps,
  onContextMenu,
}: KeyframeMarkerProps) {
  const selected = useEditorStore((state) =>
    state.selectedKeyframes.some((entry) => entry.keyframeId === keyframe.id),
  );

  const drag = React.useRef<{
    rowLeft: number;
    grabOffset: number;
    startTime: number;
    startX: number;
    refs: KeyframeRef[];
    moved: boolean;
  } | null>(null);

  const me: KeyframeSelection = React.useMemo(
    () => ({ layerId, property, keyframeId: keyframe.id }),
    [layerId, property, keyframe.id],
  );

  function beginDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const row = event.currentTarget.parentElement;
    if (!row) return;

    const editor = useEditorStore.getState();
    const rect = row.getBoundingClientRect();

    if (event.shiftKey) {
      editor.addKeyframes([me]);
    } else if (event.metaKey || event.ctrlKey) {
      editor.toggleKeyframe(me);
      return; // A toggle is a selection gesture, never the start of a drag.
    } else if (!editor.selectedKeyframes.some((entry) => entry.keyframeId === keyframe.id)) {
      editor.selectKeyframe(me);
    }

    // Alt duplicates first, then drags the copies — so the originals stay
    // exactly where they were and the gesture reads as "pull a copy off".
    let refs: KeyframeRef[] = useEditorStore.getState().selectedKeyframes;
    let startTime = keyframe.time;

    if (event.altKey) {
      const copies = useProjectStore.getState().duplicateKeyframes(refs, 0);
      if (copies.length > 0) {
        refs = copies;
        editor.selectKeyframes(copies);
        // The copy sits exactly on the original, so the drag still starts from
        // the time under the cursor.
        startTime = keyframe.time;
      }
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      rowLeft: rect.left,
      grabOffset: event.clientX - rect.left - geometry.timeToX(keyframe.time),
      startTime,
      startX: event.clientX,
      refs: [...refs],
      moved: false,
    };

    editor.pause();
  }

  function moveDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    if (!state) return;

    if (!state.moved && Math.abs(event.clientX - state.startX) < DRAG_THRESHOLD_PX) return;
    state.moved = true;

    const editor = useEditorStore.getState();
    const raw = geometry.xToTime(event.clientX - state.rowLeft - state.grabOffset);

    const target = Math.min(
      snapTime(raw, {
        fps,
        // Alt is the "duplicate" modifier on press and the "ignore snapping"
        // modifier during the drag; both are what the key does elsewhere.
        enabled: editor.timelineSnap && !event.altKey,
        playhead: editor.currentTime,
        secondsPerPixel: geometry.xToTime(1) - geometry.xToTime(0),
      }),
      duration,
    );

    // The delta is measured against where this keyframe *actually is* rather
    // than against an accumulated total. The group clamps at zero, so an
    // accumulator would drift out of step with reality the moment a drag
    // pushed the earliest key against the start of the composition.
    const current = currentTimeOf(state.refs, keyframe.id) ?? state.startTime;
    const delta = target - current;
    if (delta === 0) return;

    useProjectStore
      .getState()
      .nudgeKeyframes(state.refs, delta, { coalesceKey: `keyframe:drag:${keyframe.id}` });
  }

  function endDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const state = drag.current;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    // A click, not a drag: move the playhead to the keyframe. Doing that during
    // a drag would fight the snapping, because the playhead is one of the
    // things being snapped to.
    if (state && !state.moved) useEditorStore.getState().setCurrentTime(state.startTime);
  }

  return (
    <button
      type="button"
      aria-label={`${property} keyframe at ${keyframe.time.toFixed(2)} seconds`}
      aria-pressed={selected}
      onPointerDown={(event) => {
        if (event.button === 2) return;
        event.stopPropagation();
        beginDrag(event);
      }}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const editor = useEditorStore.getState();
        // Right-clicking outside the selection selects what was clicked, the
        // way every file manager behaves. Right-clicking inside it keeps the
        // group, so "delete these six" is one gesture.
        if (!editor.selectedKeyframes.some((entry) => entry.keyframeId === keyframe.id)) {
          editor.selectKeyframe(me);
        }
        onContextMenu({ selection: me, x: event.clientX, y: event.clientY });
      }}
      className={cn(
        "absolute top-1/2 z-10 h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[2px] border transition-colors duration-100",
        selected
          ? "border-accent bg-accent shadow-[0_0_0_2px_var(--color-accent-soft)]"
          : "border-accent/70 bg-surface hover:border-accent hover:bg-accent/40",
      )}
      style={{ left: geometry.timeToX(keyframe.time) }}
      title={`${keyframe.time.toFixed(2)}s · ${keyframe.easing}`}
    />
  );
}

/** Where a keyframe sits right now, read straight from the store. */
function currentTimeOf(refs: KeyframeRef[], keyframeId: string): number | null {
  const project = useProjectStore.getState().project;
  if (!project) return null;

  const ref = refs.find((entry) => entry.keyframeId === keyframeId) ?? refs[0];
  if (!ref) return null;

  const keyframe = project.layers
    .find((layer) => layer.id === ref.layerId)
    ?.animations.find((track) => track.property === ref.property)
    ?.keyframes.find((entry) => entry.id === ref.keyframeId);

  return keyframe?.time ?? null;
}

interface LayerSummaryRowProps {
  times: number[];
  geometry: TimelineGeometry;
  layerId: string;
  duration: number;
}

/** Aggregate row for a layer: every keyframe time across its tracks. */
export function LayerSummaryRow({ times, geometry, layerId, duration }: LayerSummaryRowProps) {
  const layer = useProjectStore((state) => state.project?.layers.find((entry) => entry.id === layerId));
  const timing = layer?.timing ?? { start: 0, end: duration };
  const updateLayerTiming = useProjectStore((state) => state.updateLayerTiming);
  const selected = useEditorStore((state) => state.selectedLayerId === layerId);
  const drag = React.useRef<{ mode: "move" | "start" | "end"; x: number; timing: typeof timing } | null>(null);

  function begin(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const edge = 8;
    const mode = x <= geometry.timeToX(timing.start) + edge ? "start" : x >= geometry.timeToX(timing.end) - edge ? "end" : "move";
    drag.current = { mode, x: event.clientX, timing: { ...timing } };
    event.currentTarget.setPointerCapture(event.pointerId);
    useEditorStore.getState().pause();
    useEditorStore.getState().selectLayer(layerId);
  }

  function move(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current;
    if (!state) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const delta = geometry.xToTime(event.clientX - rect.left) - geometry.xToTime(state.x - rect.left);
    const minLength = 1 / 30;
    let start = state.timing.start;
    let end = state.timing.end;
    if (state.mode === "move") {
      const length = end - start;
      start = Math.max(0, Math.min(duration - length, start + delta));
      end = start + length;
    } else if (state.mode === "start") {
      start = Math.max(0, Math.min(end - minLength, state.timing.start + delta));
    } else {
      end = Math.min(duration, Math.max(start + minLength, state.timing.end + delta));
    }
    updateLayerTiming(layerId, { start, end });
  }

  function end(event: React.PointerEvent<HTMLDivElement>) {
    if (drag.current && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
  }

  return (
    <div
      className="relative border-b border-line bg-surface-raised/40"
      style={{ height: ROW_HEIGHT, width: geometry.width }}
    >
      <span
        className={cn(
          "group absolute top-[3px] bottom-[3px] min-w-2 rounded-[4px] border shadow-sm transition-colors",
          selected
            ? "border-accent bg-accent/25 shadow-accent/15"
            : "border-accent/45 bg-accent/12 hover:border-accent/80 hover:bg-accent/20",
        )}
        style={{
          left: geometry.timeToX(timing.start),
          width: Math.max(10, geometry.timeToX(timing.end) - geometry.timeToX(timing.start)),
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          begin(event);
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={() => {
          drag.current = null;
        }}
        title="Drag clip to move. Drag either edge to trim."
      >
        <span className="pointer-events-none absolute inset-x-2 top-1/2 flex -translate-y-1/2 items-center justify-between gap-2 overflow-hidden">
          <span className="truncate text-[9px] font-medium tracking-wide text-accent">
            {layer?.name ?? "Layer"}
          </span>
          <span className="shrink-0 rounded bg-surface/60 px-1 py-px font-mono text-[8px] text-ink-muted">
            {(timing.end - timing.start).toFixed(1)}s
          </span>
        </span>
        <span className="absolute top-0 bottom-0 left-0 flex w-2 cursor-ew-resize items-center justify-center rounded-l-[3px] bg-accent/30 opacity-70 transition-opacity group-hover:opacity-100">
          <span className="h-3 w-px bg-accent" />
          <span className="ml-px h-3 w-px bg-accent" />
        </span>
        <span className="absolute top-0 right-0 bottom-0 flex w-2 cursor-ew-resize items-center justify-center rounded-r-[3px] bg-accent/30 opacity-70 transition-opacity group-hover:opacity-100">
          <span className="h-3 w-px bg-accent" />
          <span className="ml-px h-3 w-px bg-accent" />
        </span>
      </span>
      {times.length > 1 ? (
        <span
          aria-hidden
          className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-ink-subtle/25"
          style={{
            left: geometry.timeToX(times[0]),
            width: geometry.timeToX(times[times.length - 1]) - geometry.timeToX(times[0]),
          }}
        />
      ) : null}
      {times.map((time) => (
        <span
          key={time}
          aria-hidden
          className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[1px] bg-ink-muted/70"
          style={{ left: geometry.timeToX(time) }}
        />
      ))}
    </div>
  );
}
