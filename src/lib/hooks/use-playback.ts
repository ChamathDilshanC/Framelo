"use client";

import * as React from "react";

import { useEditorStore } from "@/store/editor-store";

/**
 * Drives timeline playback with requestAnimationFrame.
 *
 * The loop only runs while playing, and writes straight into the editor store
 * so every consumer — the 3D scene, the timeline, the timecode — stays in sync
 * with a single source of truth.
 */
export function usePlayback(duration: number): void {
  const isPlaying = useEditorStore((state) => state.isPlaying);

  React.useEffect(() => {
    if (!isPlaying || duration <= 0) return;

    let frame = 0;
    let previous = performance.now();

    const tick = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.25);
      previous = now;

      const store = useEditorStore.getState();
      const next = store.currentTime + delta;

      if (next >= duration) {
        if (store.loop) {
          store.setCurrentTime(next % duration);
        } else {
          store.setCurrentTime(duration);
          store.pause();
          return;
        }
      } else {
        store.setCurrentTime(next);
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, duration]);
}
