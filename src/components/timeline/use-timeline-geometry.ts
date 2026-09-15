"use client";

import * as React from "react";

import { clamp } from "@/lib/utils";

export const TRACK_LABEL_WIDTH = 184;

export interface TimelineGeometry {
  /** Content width in pixels for the full composition. */
  width: number;
  timeToX: (time: number) => number;
  xToTime: (x: number) => number;
}

export function useTimelineGeometry(duration: number, pixelsPerSecond: number): TimelineGeometry {
  return React.useMemo(() => {
    const width = Math.max(1, duration * pixelsPerSecond);
    return {
      width,
      timeToX: (time: number) => time * pixelsPerSecond,
      xToTime: (x: number) => clamp(x / pixelsPerSecond, 0, duration),
    };
  }, [duration, pixelsPerSecond]);
}

/** Pick a readable tick interval for the current zoom level. */
export function pickTickInterval(pixelsPerSecond: number): number {
  const candidates = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30];
  const minimumSpacing = 64;
  return candidates.find((step) => step * pixelsPerSecond >= minimumSpacing) ?? 60;
}

/** Snap to the nearest frame; hold Alt to scrub freely. */
export function snapToFrame(time: number, fps: number, enabled: boolean): number {
  if (!enabled || fps <= 0) return time;
  return Math.round(time * fps) / fps;
}
