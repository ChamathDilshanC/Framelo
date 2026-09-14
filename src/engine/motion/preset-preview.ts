import type { AnimationTrack } from "@/types/animation";

/**
 * Preset preview state.
 *
 * A preview must never touch the project. Not "should not" — must not: the
 * moment a preview writes to the project store it becomes undoable, autosaves,
 * marks the project dirty and can be left behind by a mis-click. So the
 * generated tracks live here instead, outside React and outside the project,
 * and the renderer reads them in its frame loop in place of the layer's own.
 *
 * Outside React specifically: the device transform is applied imperatively
 * inside `useFrame`, so a preview that lived in component state would re-render
 * the tree sixty times a second to achieve nothing.
 */

export interface PreviewState {
  layerId: string;
  presetId: string;
  presetName: string;
  tracks: AnimationTrack[];
  /** Seconds the preview runs for before looping. */
  duration: number;
  /** When the preview started, for its own clock. */
  startedAt: number;
}

type Listener = (state: PreviewState | null) => void;

let current: PreviewState | null = null;
const listeners = new Set<Listener>();

export const presetPreview = {
  /** The live preview, read every frame by the renderer. */
  get(): PreviewState | null {
    return current;
  },

  /** Tracks for this layer, or null when nothing is previewing on it. */
  tracksFor(layerId: string): AnimationTrack[] | null {
    if (!current || current.layerId !== layerId) return null;
    return current.tracks;
  },

  start(state: Omit<PreviewState, "startedAt">): void {
    current = { ...state, startedAt: performance.now() };
    emit();
  },

  stop(): void {
    if (!current) return;
    current = null;
    emit();
  },

  /**
   * Preview time, looping over the preview's own duration.
   *
   * Deliberately independent of the editor's playhead: previewing must not
   * move the user's playhead, and scrubbing during a preview should not fight
   * it. The playhead is restored simply by never having touched it.
   */
  timeAt(now: number): number {
    if (!current || current.duration <= 0) return 0;
    const elapsed = (now - current.startedAt) / 1000;
    return elapsed % current.duration;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** For `useSyncExternalStore`, which needs a stable snapshot. */
  getSnapshot(): PreviewState | null {
    return current;
  },
};

function emit(): void {
  for (const listener of listeners) listener(current);
}
