"use client";

import * as React from "react";

import { pickTickInterval, snapToFrame, type TimelineGeometry } from "@/components/timeline/use-timeline-geometry";
import { useEditorStore } from "@/store/editor-store";

interface TimelineRulerProps {
  geometry: TimelineGeometry;
  duration: number;
  pixelsPerSecond: number;
  fps: number;
}

/** Time ruler. Click or drag anywhere on it to scrub. */
export function TimelineRuler({ geometry, duration, pixelsPerSecond, fps }: TimelineRulerProps) {
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  const pause = useEditorStore((state) => state.pause);
  // Coarse subscription: enough for assistive tech without re-rendering per frame.
  const announcedTime = useEditorStore((state) => Math.round(state.currentTime * 10) / 10);
  const ref = React.useRef<HTMLDivElement>(null);

  const interval = pickTickInterval(pixelsPerSecond);
  const ticks = React.useMemo(() => {
    const result: number[] = [];
    for (let time = 0; time <= duration + 1e-6; time += interval) {
      result.push(Math.round(time * 1000) / 1000);
    }
    return result;
  }, [duration, interval]);

  function seekFromEvent(event: React.PointerEvent<HTMLDivElement>) {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const time = geometry.xToTime(event.clientX - rect.left);
    setCurrentTime(snapToFrame(time, fps, !event.altKey));
  }

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="Timeline scrubber"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={announcedTime}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        pause();
        seekFromEvent(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) seekFromEvent(event);
      }}
      onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
      onKeyDown={(event) => {
        const step = 1 / fps;
        const current = useEditorStore.getState().currentTime;
        if (event.key === "ArrowLeft") setCurrentTime(current - step);
        if (event.key === "ArrowRight") setCurrentTime(current + step);
      }}
      className="relative h-8 cursor-ew-resize border-b border-line bg-surface select-none"
      style={{ width: geometry.width }}
    >
      {ticks.map((time) => (
        <div
          key={time}
          className="absolute top-0 bottom-0 flex flex-col justify-between"
          style={{ left: geometry.timeToX(time) }}
        >
          <span className="numeric pt-1 pl-1 text-ink-subtle">{formatTick(time)}</span>
          <span className="h-2 w-px bg-line-strong" />
        </div>
      ))}

      {/* Sub-ticks for finer reference */}
      {ticks.map((time) => {
        const midpoint = time + interval / 2;
        if (midpoint > duration) return null;
        return (
          <span
            key={`sub-${time}`}
            className="absolute bottom-0 h-1 w-px bg-line"
            style={{ left: geometry.timeToX(midpoint) }}
          />
        );
      })}
    </div>
  );
}

function formatTick(time: number): string {
  if (time >= 60) {
    const minutes = Math.floor(time / 60);
    const seconds = time - minutes * 60;
    return `${minutes}:${seconds.toFixed(0).padStart(2, "0")}`;
  }
  return Number.isInteger(time) ? `${time}s` : `${time.toFixed(2).replace(/0$/, "")}s`;
}
