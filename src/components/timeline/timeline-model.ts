"use client";

import * as React from "react";

import { ROW_HEIGHT } from "@/components/timeline/TimelineTrack";
import type { KeyframeSelection } from "@/store/editor-store";
import type { AnimatableProperty } from "@/types/animation";
import type { Layer } from "@/types/layer";

/**
 * The timeline's row layout, as data.
 *
 * The rows are laid out once and shared by everything that needs to know where
 * a track sits: the label column, the track rows themselves, and — the reason
 * this exists — the marquee, which has to turn a rectangle dragged over the
 * grid back into "which keyframes did that cross". Computing that inside the
 * drag handler would mean re-deriving the layout on every pointer move.
 */

export interface TimelineRow {
  kind: "layer" | "track";
  layerId: string;
  /** Absent on a layer summary row. */
  property?: AnimatableProperty;
  /** Pixels from the top of the scrollable track area. */
  top: number;
}

export interface TimelineLayout {
  rows: TimelineRow[];
  height: number;
}

export function useTimelineLayout(layers: Layer[]): TimelineLayout {
  return React.useMemo(() => {
    const rows: TimelineRow[] = [];
    let top = 0;

    for (const layer of layers) {
      rows.push({ kind: "layer", layerId: layer.id, top });
      top += ROW_HEIGHT;

      for (const track of layer.animations) {
        if (track.keyframes.length === 0) continue;
        rows.push({ kind: "track", layerId: layer.id, property: track.property, top });
        top += ROW_HEIGHT;
      }
    }

    return { rows, height: top };
  }, [layers]);
}

export interface MarqueeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Every keyframe a marquee rectangle crosses.
 *
 * Track rows only. A layer summary row shows the same keyframes again, as an
 * aggregate, and selecting them twice from one drag would make a group of four
 * keyframes report as eight and then move twice as far when nudged.
 */
export function keyframesInMarquee(
  layers: Layer[],
  layout: TimelineLayout,
  rect: MarqueeRect,
  timeToX: (time: number) => number,
): KeyframeSelection[] {
  const found: KeyframeSelection[] = [];
  const bottom = rect.top + rect.height;
  const right = rect.left + rect.width;

  const byId = new Map(layers.map((layer) => [layer.id, layer]));

  for (const row of layout.rows) {
    if (row.kind !== "track" || !row.property) continue;
    if (row.top + ROW_HEIGHT < rect.top || row.top > bottom) continue;

    const track = byId
      .get(row.layerId)
      ?.animations.find((entry) => entry.property === row.property);
    if (!track) continue;

    for (const keyframe of track.keyframes) {
      const x = timeToX(keyframe.time);
      if (x < rect.left || x > right) continue;
      found.push({ layerId: row.layerId, property: row.property, keyframeId: keyframe.id });
    }
  }

  return found;
}

/**
 * Snap a time to the nearest interesting moment.
 *
 * Frame boundaries first, then the playhead — because a keyframe deliberately
 * dropped on the playhead is the single most common thing anyone aligns to, and
 * landing one frame off it is invisible until it is not.
 *
 * The playhead only wins inside a few pixels, so snapping never drags a
 * keyframe somewhere the user was not already aiming.
 */
export function snapTime(
  time: number,
  options: {
    fps: number;
    enabled: boolean;
    playhead?: number;
    /** Seconds per pixel, so the magnet has a constant size on screen. */
    secondsPerPixel?: number;
  },
): number {
  if (!options.enabled) return time;

  const framed = options.fps > 0 ? Math.round(time * options.fps) / options.fps : time;

  if (options.playhead !== undefined && options.secondsPerPixel) {
    const magnet = options.secondsPerPixel * 7;
    if (Math.abs(time - options.playhead) <= magnet) return options.playhead;
  }

  return framed;
}
