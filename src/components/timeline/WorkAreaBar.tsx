"use client";

import * as React from "react";

import type { TimelineGeometry } from "@/components/timeline/use-timeline-geometry";
import { snapTime } from "@/components/timeline/timeline-model";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import { resolveWorkArea, type CanvasConfig } from "@/types/project";

/**
 * The work area: the in and out points.
 *
 * A strip above the tracks with a handle at each end, which is where every
 * editor puts it, and which is the only presentation that makes the two numbers
 * legible as a *range* rather than as two settings that happen to be near each
 * other.
 *
 * It is stored on the composition, not in the editor, for two reasons. It is a
 * decision about the piece — "the good part is between two and five" — so it
 * should survive closing the tab. And the exporter reads it, so it has to be in
 * the project that the exporter is given.
 *
 * Shortening the composition never silently moves these; the crop dialog does
 * that, after asking.
 */

/** Below this the range is not a range, and the two handles overlap. */
const MIN_SPAN = 0.1;

export function WorkAreaBar({
  canvas,
  geometry,
}: {
  canvas: CanvasConfig;
  geometry: TimelineGeometry;
}) {
  const setWorkArea = useProjectStore((state) => state.setWorkArea);
  const timelineSnap = useEditorStore((state) => state.timelineSnap);

  const area = resolveWorkArea(canvas);
  const active = Boolean(canvas.workArea?.enabled);

  const ref = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ handle: "in" | "out" | "body"; grabbedAt: number } | null>(null);

  function timeAt(clientX: number): number {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 0;
    return snapTime(geometry.xToTime(clientX - rect.left), {
      fps: canvas.fps,
      enabled: timelineSnap,
    });
  }

  function onPointerDown(handle: "in" | "out" | "body", event: React.PointerEvent) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { handle, grabbedAt: timeAt(event.clientX) };

    // Dragging a handle on a range that is off is how someone turns it on —
    // making them find a checkbox first would be a step with no purpose.
    if (!active) {
      setWorkArea({ in: area.in, out: area.out, enabled: true });
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    const state = drag.current;
    if (!state) return;

    const time = timeAt(event.clientX);
    const current = resolveWorkArea(useProjectStore.getState().project?.canvas ?? canvas);

    if (state.handle === "in") {
      setWorkArea({ in: Math.min(time, current.out - MIN_SPAN), out: current.out, enabled: true });
      return;
    }
    if (state.handle === "out") {
      setWorkArea({ in: current.in, out: Math.max(time, current.in + MIN_SPAN), enabled: true });
      return;
    }

    // Sliding the whole range keeps its length, and stops at both ends rather
    // than squashing — a range that shrank when it hit the end of the
    // composition would quietly destroy the length someone chose.
    const span = current.out - current.in;
    const delta = time - state.grabbedAt;
    const start = Math.max(0, Math.min(current.in + delta, canvas.duration - span));
    state.grabbedAt = time;
    setWorkArea({ in: start, out: start + span, enabled: true });
  }

  function onPointerUp(event: React.PointerEvent) {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const left = geometry.timeToX(area.in);
  const width = Math.max(2, geometry.timeToX(area.out) - left);

  return (
    <div
      ref={ref}
      className="relative h-3 shrink-0 border-b border-line bg-surface-raised/50 select-none"
      style={{ width: geometry.width }}
      aria-label="Work area"
    >
      {/* Outside the range, dimmed — so the part that will export reads as the
          lit part of the strip rather than as a highlighted selection. */}
      {active ? (
        <>
          <span className="absolute inset-y-0 left-0 bg-surface/70" style={{ width: left }} />
          <span
            className="absolute inset-y-0 bg-surface/70"
            style={{ left: left + width, right: 0 }}
          />
        </>
      ) : null}

      <div
        role="button"
        tabIndex={0}
        aria-label={`Work area ${area.in.toFixed(2)} to ${area.out.toFixed(2)} seconds`}
        onPointerDown={(event) => onPointerDown("body", event)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={cn(
          "absolute inset-y-0 cursor-grab rounded-xs transition-colors active:cursor-grabbing",
          active ? "bg-accent/35 hover:bg-accent/45" : "bg-ink-subtle/15 hover:bg-ink-subtle/25",
        )}
        style={{ left, width }}
      />

      <Handle
        side="in"
        x={left}
        active={active}
        onPointerDown={(event) => onPointerDown("in", event)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <Handle
        side="out"
        x={left + width}
        active={active}
        onPointerDown={(event) => onPointerDown("out", event)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    </div>
  );
}

function Handle({
  side,
  x,
  active,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  side: "in" | "out";
  x: number;
  active: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
}) {
  return (
    <button
      type="button"
      aria-label={side === "in" ? "Work area in point" : "Work area out point"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      // Six pixels wide to look at, sixteen to hit. A three-pixel target on a
      // strip this short is unusable with a trackpad.
      className="absolute inset-y-0 z-10 w-4 -translate-x-1/2 cursor-ew-resize"
      style={{ left: x }}
    >
      <span
        className={cn(
          "absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 rounded-full",
          active ? "bg-accent" : "bg-ink-subtle/50",
        )}
      />
    </button>
  );
}
