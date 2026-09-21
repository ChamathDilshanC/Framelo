"use client";

import { useFrame } from "@react-three/fiber";
import { useEditorStore } from "@/store/editor-store";

/** Advance before every scene consumer, on the same clock as the renderer. */
export function usePlayback(): void {
  useFrame((_, elapsed) => {
    const store = useEditorStore.getState();
    if (!store.isPlaying || store.isExporting || store.duration <= 0) return;
    const next = store.currentTime + Math.min(elapsed, 0.1);
    if (next >= store.duration) {
      store.setCurrentTime(store.loop ? next % store.duration : store.duration);
      if (!store.loop) store.pause();
    } else store.setCurrentTime(next);
  }, -100);
}
