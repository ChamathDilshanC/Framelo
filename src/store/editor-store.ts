"use client";

import { create } from "zustand";

import type { CameraViewId } from "@/engine/devices/device-presets";
import { clamp } from "@/lib/utils";
import type { AnimatableProperty, EasingType } from "@/types/animation";

export type LeftPanelTab = "devices" | "assets" | "library" | "text";

/**
 * Which catalogue the library panel is showing.
 *
 * Four separate libraries that used to be two sidebar tabs. They are tabs
 * within one panel rather than four entries on the rail because choosing
 * between them is a *comparison* — "is this a whole starting layout, a
 * choreography, an effect, or a text animation?" — and a comparison wants the
 * options side by side, not four icons that each hide the other three.
 */
export type LibraryTab = "templates" | "device-motion" | "motion" | "text";

/**
 * The active canvas tool.
 *
 * "select" is the resting state and the one the editor returns to: creating a
 * text layer switches back automatically, because a tool that stays armed
 * makes the next click on the canvas create a layer nobody asked for (§48).
 */
export type CanvasTool = "select" | "text";

export interface KeyframeSelection {
  layerId: string;
  property: AnimatableProperty;
  keyframeId: string;
}

/**
 * A keyframe on the clipboard.
 *
 * Copied by *value*, not by reference: an id would collide the moment it was
 * pasted twice, and pointing back at the original would make paste break when
 * the source was deleted. `offset` is time relative to the earliest keyframe in
 * the copied set, which is what lets a group paste at the playhead while
 * keeping the shape of the timing it was copied from.
 */
export interface ClipboardKeyframe {
  property: AnimatableProperty;
  offset: number;
  value: number;
  easing: EasingType;
}

/** Same keyframe, compared by identity rather than by object. */
export function sameKeyframe(a: KeyframeSelection, b: KeyframeSelection): boolean {
  return a.keyframeId === b.keyframeId && a.layerId === b.layerId && a.property === b.property;
}

interface EditorStoreState {
  // playback / timeline
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  loop: boolean;
  /** Horizontal timeline zoom, in pixels per second. */
  pixelsPerSecond: number;

  // selection
  selectedLayerId: string | null;
  /**
   * Every selected keyframe, in selection order.
   *
   * A list rather than a single entry because that is the difference between a
   * timeline you can nudge one key on and one you can retime a whole animation
   * in. Everything that acts on "the selection" — nudge, delete, copy, retime,
   * re-ease — reads this, so single-select is simply a selection of one and
   * there is no second code path for it.
   */
  selectedKeyframes: KeyframeSelection[];
  keyframeClipboard: ClipboardKeyframe[];

  // canvas tools
  activeTool: CanvasTool;
  /** The text layer currently open for editing on the canvas, if any. */
  editingLayerId: string | null;
  /** Alignment guides while dragging (§38). */
  snapEnabled: boolean;
  /**
   * Timeline snapping, separate from the canvas guides above.
   *
   * They are different jobs — one snaps a layer to another layer's edge, the
   * other snaps a keyframe to a frame boundary — and someone working to the
   * frame wants the second without the first.
   */
  timelineSnap: boolean;

  // panels
  leftPanelTab: LeftPanelTab;
  libraryTab: LibraryTab;
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  timelineOpen: boolean;
  exportDialogOpen: boolean;
  shortcutsOpen: boolean;

  // viewport
  showSafeArea: boolean;
  orbitEnabled: boolean;
  /**
   * Which product-shot camera the viewport is on. Camera state is deliberately
   * kept out of the project: it frames the shot, it is not part of the
   * animation, and the device transform stays the only animated thing.
   */
  cameraView: CameraViewId;
  /** Bumped to ask the canvas to return the camera to the device default. */
  cameraResetToken: number;
  /** Bumped to ask the canvas to frame the visible layers. */
  cameraFitToken: number;

  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stop: () => void;
  stepFrames: (frames: number, fps: number) => void;
  setLoop: (loop: boolean) => void;
  setPixelsPerSecond: (value: number) => void;

  selectLayer: (layerId: string | null) => void;
  /** Replaces the whole selection. `null` clears it. */
  selectKeyframe: (selection: KeyframeSelection | null) => void;
  selectKeyframes: (selections: KeyframeSelection[]) => void;
  /** Ctrl/Cmd-click: add if absent, remove if present. */
  toggleKeyframe: (selection: KeyframeSelection) => void;
  /** Shift-click and marquee: union with what is already selected. */
  addKeyframes: (selections: KeyframeSelection[]) => void;
  clearKeyframeSelection: () => void;
  setKeyframeClipboard: (keyframes: ClipboardKeyframe[]) => void;

  setActiveTool: (tool: CanvasTool) => void;
  beginTextEditing: (layerId: string) => void;
  endTextEditing: () => void;
  setSnapEnabled: (enabled: boolean) => void;
  setTimelineSnap: (enabled: boolean) => void;

  setLeftPanelTab: (tab: LeftPanelTab) => void;
  setLibraryTab: (tab: LibraryTab) => void;
  /** Opens the library panel on a particular catalogue, in one call. */
  openLibrary: (tab: LibraryTab) => void;
  toggleLeftPanel: (open?: boolean) => void;
  toggleRightPanel: (open?: boolean) => void;
  toggleTimeline: (open?: boolean) => void;
  setExportDialogOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;

  setShowSafeArea: (show: boolean) => void;
  setOrbitEnabled: (enabled: boolean) => void;
  setCameraView: (view: CameraViewId) => void;
  requestCameraReset: () => void;
  requestCameraFit: () => void;
}

export const MIN_PIXELS_PER_SECOND = 40;
export const MAX_PIXELS_PER_SECOND = 460;

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  currentTime: 0,
  duration: 5,
  isPlaying: false,
  loop: true,
  pixelsPerSecond: 140,

  selectedLayerId: null,
  selectedKeyframes: [],
  keyframeClipboard: [],

  activeTool: "select",
  editingLayerId: null,
  snapEnabled: true,
  timelineSnap: true,

  leftPanelTab: "devices",
  libraryTab: "device-motion",
  leftPanelOpen: true,
  rightPanelOpen: true,
  timelineOpen: true,
  exportDialogOpen: false,
  shortcutsOpen: false,

  showSafeArea: false,
  orbitEnabled: true,
  cameraView: "front",
  cameraResetToken: 0,
  cameraFitToken: 0,

  setCurrentTime(time) {
    const { duration, currentTime } = get();
    const next = clamp(Number(time.toFixed(4)), 0, duration);
    if (next === currentTime) return;
    set({ currentTime: next });
  },

  setDuration(duration) {
    const safe = Math.max(0.1, duration);
    set((state) => ({
      duration: safe,
      currentTime: clamp(state.currentTime, 0, safe),
    }));
  },

  play() {
    const { currentTime, duration } = get();
    // Restarting from the end feels better than sitting on the last frame.
    set({ isPlaying: true, currentTime: currentTime >= duration - 0.001 ? 0 : currentTime });
  },

  pause() {
    set({ isPlaying: false });
  },

  togglePlay() {
    if (get().isPlaying) get().pause();
    else get().play();
  },

  stop() {
    set({ isPlaying: false, currentTime: 0 });
  },

  stepFrames(frames, fps) {
    const step = frames / Math.max(1, fps);
    const { currentTime, duration } = get();
    set({ isPlaying: false, currentTime: clamp(currentTime + step, 0, duration) });
  },

  setLoop(loop) {
    set({ loop });
  },

  setPixelsPerSecond(value) {
    set({ pixelsPerSecond: clamp(value, MIN_PIXELS_PER_SECOND, MAX_PIXELS_PER_SECOND) });
  },

  selectLayer(layerId) {
    // Selecting something else closes the editor that was open, or the caret
    // would keep taking keystrokes for a layer that is no longer selected.
    set((state) => ({
      selectedLayerId: layerId,
      selectedKeyframes: [],
      editingLayerId: state.editingLayerId === layerId ? state.editingLayerId : null,
    }));
  },

  setActiveTool(tool) {
    // Arming a tool closes an open editor. Returning to "select" does not:
    // creating text does exactly that — it hands back the select tool and
    // starts editing in the same breath — and clearing here would take the
    // caret away the instant it appeared.
    set((state) => ({
      activeTool: tool,
      editingLayerId: tool === "select" ? state.editingLayerId : null,
    }));
  },

  beginTextEditing(layerId) {
    set({ editingLayerId: layerId, selectedLayerId: layerId, activeTool: "select" });
  },

  endTextEditing() {
    set({ editingLayerId: null });
  },

  setSnapEnabled(enabled) {
    set({ snapEnabled: enabled });
  },

  selectKeyframe(selection) {
    set({ selectedKeyframes: selection ? [selection] : [] });
  },

  selectKeyframes(selections) {
    set({ selectedKeyframes: selections });
  },

  toggleKeyframe(selection) {
    set((state) => {
      const without = state.selectedKeyframes.filter((entry) => !sameKeyframe(entry, selection));
      return {
        selectedKeyframes:
          without.length === state.selectedKeyframes.length
            ? [...state.selectedKeyframes, selection]
            : without,
      };
    });
  },

  addKeyframes(selections) {
    set((state) => {
      const additions = selections.filter(
        (candidate) => !state.selectedKeyframes.some((entry) => sameKeyframe(entry, candidate)),
      );
      if (additions.length === 0) return state;
      return { selectedKeyframes: [...state.selectedKeyframes, ...additions] };
    });
  },

  clearKeyframeSelection() {
    set((state) => (state.selectedKeyframes.length === 0 ? state : { selectedKeyframes: [] }));
  },

  setKeyframeClipboard(keyframes) {
    set({ keyframeClipboard: keyframes });
  },

  setTimelineSnap(enabled) {
    set({ timelineSnap: enabled });
  },

  setLeftPanelTab(tab) {
    set({ leftPanelTab: tab, leftPanelOpen: true });
  },

  setLibraryTab(tab) {
    set({ libraryTab: tab });
  },

  openLibrary(tab) {
    set({ leftPanelTab: "library", libraryTab: tab, leftPanelOpen: true });
  },

  toggleLeftPanel(open) {
    set((state) => ({ leftPanelOpen: open ?? !state.leftPanelOpen }));
  },

  toggleRightPanel(open) {
    set((state) => ({ rightPanelOpen: open ?? !state.rightPanelOpen }));
  },

  toggleTimeline(open) {
    set((state) => ({ timelineOpen: open ?? !state.timelineOpen }));
  },

  setExportDialogOpen(open) {
    set({ exportDialogOpen: open });
  },

  setShortcutsOpen(open) {
    set({ shortcutsOpen: open });
  },

  setShowSafeArea(show) {
    set({ showSafeArea: show });
  },

  setOrbitEnabled(enabled) {
    set({ orbitEnabled: enabled });
  },

  setCameraView(view) {
    if (get().cameraView === view) return;
    set({ cameraView: view });
  },

  requestCameraReset() {
    set((state) => ({
      cameraView: "front",
      cameraResetToken: state.cameraResetToken + 1,
    }));
  },

  requestCameraFit() {
    set((state) => ({ cameraFitToken: state.cameraFitToken + 1 }));
  },
}));

export const selectCurrentTime = (state: EditorStoreState) => state.currentTime;
/**
 * The keyframe the inspector shows.
 *
 * With several selected there is no single "the" keyframe, so the inspector
 * switches to a multi-selection view; this is the one it falls back to.
 */
export const selectPrimaryKeyframe = (state: EditorStoreState): KeyframeSelection | null =>
  state.selectedKeyframes.length === 1 ? state.selectedKeyframes[0] : null;
export const selectIsPlaying = (state: EditorStoreState) => state.isPlaying;
export const selectSelectedLayerId = (state: EditorStoreState) => state.selectedLayerId;
export const selectActiveTool = (state: EditorStoreState) => state.activeTool;
export const selectEditingLayerId = (state: EditorStoreState) => state.editingLayerId;

export type { EditorStoreState };
