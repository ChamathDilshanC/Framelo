"use client";

import { create } from "zustand";
import { useEditorStore } from "./editor-store";
import { cameraPoseFor } from "@/lib/project-view";
import type { ProjectEditorState } from "@/types/project";

import { evaluateTransform, findTrack } from "@/engine/animation/evaluate";
import { staticPropertyValue } from "@/engine/animation/property-value";
import {
  generateTracks,
  mergePresetTracks,
  planDuration,
  type DurationStrategy,
} from "@/engine/motion/preset-generator";
import type {
  MotionPresetDefinition,
  MotionPresetParameters,
} from "@/engine/motion/preset-types";
import { HISTORY_COALESCE_MS, HISTORY_LIMIT } from "@/lib/constants";
import { createId } from "@/lib/id";
import { createDeviceLayer, createTextLayer } from "@/lib/project-factory";
import { nameFromContent, resolveTextMetadata, type TextLayerMetadata } from "@/engine/text/text-types";
import type { ProjectTemplate } from "@/engine/templates/project-templates";
import { isTransformProperty } from "@/types/animation";
import type { AnimatableProperty, EasingType, Keyframe } from "@/types/animation";
import type { BackgroundConfig } from "@/types/background";
import type { DeviceLayerMetadata, Layer, Transform } from "@/types/layer";
import type { CanvasConfig, ExportSettings, Project, WorkArea } from "@/types/project";
import type {
  DeviceMotionBuild,
  DeviceMotionTemplate,
} from "@/engine/templates/device-motion-templates";

/**
 * `offline` is deliberately distinct from `error`: the work is durable locally
 * and only the cloud copy is behind. Showing that as a failure would be a lie.
 */
export type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "offline" | "error";

/**
 * One keyframe, addressed from outside the layer it lives on.
 *
 * Batch operations take these rather than a layer id plus a list, because a
 * marquee in the timeline can cross tracks and layers, and "delete what is
 * selected" has to mean exactly that.
 */
export interface KeyframeRef {
  layerId: string;
  property: AnimatableProperty;
  keyframeId: string;
}

/** A keyframe's contents without its identity, for copy and paste. */
export interface KeyframeSeed {
  property: AnimatableProperty;
  /** Seconds after the paste point. */
  offset: number;
  value: number;
  easing: EasingType;
}

export interface ApplyMotionOptions {
  parameters?: Partial<MotionPresetParameters>;
  /** What to do when the preset is longer than the composition. */
  durationStrategy?: DurationStrategy;
}

export interface ApplyMotionResult {
  applied: boolean;
  /** Properties that already had keyframes and were overwritten. */
  replaced: AnimatableProperty[];
  /** Composition length after applying. */
  duration: number;
}

interface CommitOptions {
  /**
   * Consecutive commits sharing a key within HISTORY_COALESCE_MS collapse into
   * a single history entry — so dragging a slider is one undo, not fifty.
   */
  coalesceKey?: string;
}

interface ProjectStoreState {
  project: Project | null;
  past: Project[];
  future: Project[];
  saveStatus: SaveStatus;
  saveError: string | null;
  lastSavedAt: string | null;

  // lifecycle
  loadProject: (project: Project) => void;
  closeProject: () => void;
  setSaveStatus: (status: SaveStatus, error?: string) => void;
  markSaved: (savedAt?: string) => void;
  setEditorState: (view: ProjectEditorState) => void;

  // project level
  renameProject: (name: string) => void;
  updateCanvas: (patch: Partial<CanvasConfig>) => void;
  setBackground: (background: BackgroundConfig) => void;

  // layers
  addDeviceLayer: (deviceId: string) => string | null;
  addTextLayer: (overrides?: Partial<TextLayerMetadata>) => string | null;
  updateTextMetadata: (
    layerId: string,
    patch: Partial<TextLayerMetadata>,
    options?: CommitOptions,
  ) => void;
  setTextContent: (layerId: string, content: string) => void;
  moveLayer: (layerId: string, toIndex: number) => void;
  reorderLayer: (layerId: string, direction: "front" | "forward" | "backward" | "back") => void;
  removeLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => string | null;
  renameLayer: (layerId: string, name: string) => void;
  setLayerVisible: (layerId: string, visible: boolean) => void;
  setLayerLocked: (layerId: string, locked: boolean) => void;
  updateDeviceMetadata: (layerId: string, patch: Partial<DeviceLayerMetadata>) => void;

  // transforms
  setTransformValue: (
    layerId: string,
    property: AnimatableProperty,
    value: number,
    options?: CommitOptions & { time?: number },
  ) => void;
  translateLayer: (layerId: string, delta: { x: number; y: number; z: number }) => void;
  resetTransform: (layerId: string) => void;

  // keyframes
  addKeyframe: (
    layerId: string,
    property: AnimatableProperty,
    time: number,
    value?: number,
    easing?: EasingType,
  ) => void;
  removeKeyframe: (layerId: string, property: AnimatableProperty, keyframeId: string) => void;
  moveKeyframe: (
    layerId: string,
    property: AnimatableProperty,
    keyframeId: string,
    time: number,
    options?: CommitOptions,
  ) => void;
  setKeyframeEasing: (
    layerId: string,
    property: AnimatableProperty,
    keyframeId: string,
    easing: EasingType,
  ) => void;
  duplicateKeyframe: (
    layerId: string,
    property: AnimatableProperty,
    keyframeId: string,
    offset: number,
  ) => void;
  /** Set a keyframe's value directly, from the inspector. */
  setKeyframeValue: (
    layerId: string,
    property: AnimatableProperty,
    keyframeId: string,
    value: number,
    options?: CommitOptions,
  ) => void;
  /** Shift every keyframe in `refs` by the same delta. One undo for the group. */
  nudgeKeyframes: (refs: KeyframeRef[], delta: number, options?: CommitOptions) => void;
  removeKeyframes: (refs: KeyframeRef[]) => void;
  /** Copies each ref forward by `offset`; returns the copies so they can be selected. */
  duplicateKeyframes: (refs: KeyframeRef[], offset: number) => KeyframeRef[];
  setKeyframesEasing: (refs: KeyframeRef[], easing: EasingType) => void;
  /** Writes `seeds` onto one layer starting at `atTime`; returns what it wrote. */
  pasteKeyframes: (layerId: string, seeds: KeyframeSeed[], atTime: number) => KeyframeRef[];
  /** Drops every keyframe past `duration`. Returns how many went. */
  cropAnimation: (duration: number) => number;
  clearTrack: (layerId: string, property: AnimatableProperty) => void;
  clearAllAnimation: (layerId: string) => void;
  setWorkArea: (area: WorkArea | null) => void;
  setExportSettings: (settings: ExportSettings) => void;
  applyMotionPreset: (
    layerId: string,
    preset: MotionPresetDefinition,
    options: ApplyMotionOptions,
  ) => ApplyMotionResult;
  applyProjectTemplate: (template: ProjectTemplate, layers: Layer[]) => void;
  /**
   * Re-choreograph the device without touching the rest of the project.
   *
   * Deliberately narrower than `applyProjectTemplate`: a device motion template
   * is about how the device moves, so it writes the device layer's pose and
   * tracks and leaves the canvas, the text and — unless the template says
   * otherwise — the background exactly where they were.
   */
  applyDeviceMotionTemplate: (
    layerId: string,
    template: DeviceMotionTemplate,
    result: DeviceMotionBuild,
  ) => boolean;

  // history
  undo: () => void;
  redo: () => void;
}

const emptyHistory = { past: [] as Project[], future: [] as Project[] };

let lastCoalesceKey: string | null = null;
let lastCommitAt = 0;

export const useProjectStore = create<ProjectStoreState>((set, get) => {
  /** Every mutation funnels through here so history stays consistent. */
  function commit(mutate: (project: Project) => Project, options: CommitOptions = {}): void {
    const state = get();
    const current = state.project;
    if (!current) return;

    const next = mutate(current);
    if (next === current) return;

    next.updatedAt = new Date().toISOString();

    const now = Date.now();
    const coalesce =
      Boolean(options.coalesceKey) &&
      options.coalesceKey === lastCoalesceKey &&
      now - lastCommitAt < HISTORY_COALESCE_MS;

    lastCoalesceKey = options.coalesceKey ?? null;
    lastCommitAt = now;

    set({
      project: next,
      past: coalesce ? state.past : [...state.past, current].slice(-HISTORY_LIMIT),
      future: [],
      saveStatus: "unsaved",
    });
  }

  /** Breaks coalescing so the next edit always starts a fresh history entry. */
  function breakCoalescing(): void {
    lastCoalesceKey = null;
    lastCommitAt = 0;
  }

  return {
    project: null,
    ...emptyHistory,
    saveStatus: "idle",
    saveError: null,
    lastSavedAt: null,

    loadProject(project) {
      breakCoalescing();
      useEditorStore.getState().restoreProjectView(project);
      set({ project, ...emptyHistory, saveStatus: "saved", saveError: null, lastSavedAt: project.updatedAt });
    },

    closeProject() {
      breakCoalescing();
      set({ project: null, ...emptyHistory, saveStatus: "idle", saveError: null, lastSavedAt: null });
    },

    setSaveStatus(status, error) {
      set({ saveStatus: status, saveError: error ?? null });
    },

    setEditorState(view) {
      const project = get().project;
      if (!project || JSON.stringify(project.editorState) === JSON.stringify(view)) return;
      set({ project: { ...project, editorState: structuredClone(view), updatedAt: new Date().toISOString() }, saveStatus: "unsaved" });
    },

    markSaved(savedAt) {
      if (savedAt && get().project?.updatedAt !== savedAt) return;
      set({ saveStatus: "saved", saveError: null, lastSavedAt: savedAt ?? new Date().toISOString() });
    },

    renameProject(name) {
      const trimmed = name.trim();
      if (!trimmed) return;
      commit((project) => (project.name === trimmed ? project : { ...project, name: trimmed }), {
        coalesceKey: "project:name",
      });
    },

    updateCanvas(patch) {
      commit((project) => ({ ...project, canvas: { ...project.canvas, ...patch } }), {
        coalesceKey: `canvas:${Object.keys(patch).join(",")}`,
      });
    },

    setBackground(background) {
      commit((project) => ({ ...project, background }), { coalesceKey: "background" });
    },

    addDeviceLayer(deviceId) {
      const layer = createDeviceLayer(deviceId);
      commit((project) => ({ ...project, layers: [...project.layers, layer] }));
      return layer.id;
    },

    addTextLayer(overrides) {
      breakCoalescing();
      const layer = createTextLayer(overrides);
      commit((project) => ({ ...project, layers: [...project.layers, layer] }));
      return layer.id;
    },

    /**
     * Update typography.
     *
     * Coalesced by the set of fields being changed, so dragging the size
     * slider is one undo step and then changing the colour is another —
     * rather than one entry per pixel of slider travel (§45).
     */
    updateTextMetadata(layerId, patch, options = {}) {
      const keys = Object.keys(patch).join(",");
      commit(
        (project) =>
          updateLayer(project, layerId, (layer) => ({
            ...layer,
            metadata: { ...layer.metadata, ...patch },
          })),
        { coalesceKey: options.coalesceKey ?? `text:${layerId}:${keys}` },
      );
    },

    /**
     * Write the words.
     *
     * Typing coalesces into a single history entry rather than one per
     * character, and the layer name follows the content until the user renames
     * the layer themselves (§28, §45).
     */
    setTextContent(layerId, content) {
      commit(
        (project) =>
          updateLayer(project, layerId, (layer) => {
            const style = resolveTextMetadata(layer.metadata);
            if (style.content === content) return layer;
            return {
              ...layer,
              name: style.autoName ? nameFromContent(content) : layer.name,
              metadata: { ...layer.metadata, content },
            };
          }),
        { coalesceKey: `text:content:${layerId}` },
      );
    },

    /**
     * Move a layer to an index.
     *
     * The array *is* the order: the scene renders layers in this sequence and
     * gives each one a render order to match, so this changes what is actually
     * drawn in front rather than only what the list looks like (§26, §62).
     */
    moveLayer(layerId, toIndex) {
      breakCoalescing();
      commit((project) => {
        const from = project.layers.findIndex((layer) => layer.id === layerId);
        if (from === -1) return project;

        const target = Math.max(0, Math.min(project.layers.length - 1, toIndex));
        if (target === from) return project;

        const layers = [...project.layers];
        const [moved] = layers.splice(from, 1);
        layers.splice(target, 0, moved);
        return { ...project, layers };
      });
    },

    reorderLayer(layerId, direction) {
      const layers = get().project?.layers ?? [];
      const index = layers.findIndex((layer) => layer.id === layerId);
      if (index === -1) return;

      const target =
        direction === "front"
          ? layers.length - 1
          : direction === "back"
            ? 0
            : direction === "forward"
              ? index + 1
              : index - 1;

      get().moveLayer(layerId, target);
    },

    removeLayer(layerId) {
      breakCoalescing();
      commit((project) => ({
        ...project,
        layers: project.layers.filter((layer) => layer.id !== layerId),
      }));
    },

    duplicateLayer(layerId) {
      const source = get().project?.layers.find((layer) => layer.id === layerId);
      if (!source) return null;

      // Offset so the copy is not hidden exactly behind the original (§29).
      const OFFSET = 0.25;

      const clone: Layer = {
        ...source,
        id: createId("layer"),
        name: `${source.name} copy`,
        transform: {
          ...source.transform,
          x: source.transform.x + OFFSET,
          y: source.transform.y - OFFSET,
        },
        animations: source.animations.map((track) => ({
          property: track.property,
          keyframes: track.keyframes.map((keyframe) => ({ ...keyframe, id: createId("kf") })),
        })),
        metadata: { ...source.metadata },
      };

      breakCoalescing();
      commit((project) => {
        const index = project.layers.findIndex((layer) => layer.id === layerId);
        const layers = [...project.layers];
        layers.splice(index === -1 ? layers.length : index + 1, 0, clone);
        return { ...project, layers };
      });
      return clone.id;
    },

    renameLayer(layerId, name) {
      const trimmed = name.trim();
      if (!trimmed) return;
      commit(
        (project) =>
          updateLayer(project, layerId, (layer) => ({
            ...layer,
            name: trimmed,
            // A name the user typed is theirs to keep, even when the words
            // beneath it change (§28).
            metadata: layer.type === "text" ? { ...layer.metadata, autoName: false } : layer.metadata,
          })),
        { coalesceKey: `layer:name:${layerId}` },
      );
    },

    setLayerVisible(layerId, visible) {
      breakCoalescing();
      commit((project) => updateLayer(project, layerId, (layer) => ({ ...layer, visible })));
    },

    setLayerLocked(layerId, locked) {
      breakCoalescing();
      commit((project) => updateLayer(project, layerId, (layer) => ({ ...layer, locked })));
    },

    updateDeviceMetadata(layerId, patch) {
      const keys = Object.keys(patch).join(",");
      commit(
        (project) =>
          updateLayer(project, layerId, (layer) => ({
            ...layer,
            metadata: { ...layer.metadata, ...patch },
          })),
        { coalesceKey: `metadata:${layerId}:${keys}` },
      );
    },

    setTransformValue(layerId, property, value, options = {}) {
      const time = options.time ?? 0;
      commit(
        (project) =>
          updateLayer(project, layerId, (layer) => {
            const track = findTrack(layer.animations, property);

            // Auto-keyframe: once a property is animated, edits write to the
            // keyframe under the playhead instead of the static transform.
            if (track && track.keyframes.length > 0) {
              const existing = track.keyframes.find((kf) => nearlyEqual(kf.time, time));
              const keyframes = existing
                ? track.keyframes.map((kf) => (kf.id === existing.id ? { ...kf, value } : kf))
                : sortByTime([
                    ...track.keyframes,
                    { id: createId("kf"), time: roundTime(time), value, easing: "smoother" },
                  ]);

              return {
                ...layer,
                animations: layer.animations.map((entry) =>
                  entry.property === property ? { ...entry, keyframes } : entry,
                ),
              };
            }

            // A text property is stored with the typography, not the matrix.
            if (!isTransformProperty(property)) {
              return applyTextProperty(layer, property, value);
            }

            if (layer.transform[property] === value) return layer;
            return { ...layer, transform: { ...layer.transform, [property]: value } };
          }),
        { coalesceKey: options.coalesceKey ?? `transform:${layerId}:${property}` },
      );
    },

    translateLayer(layerId, delta) {
      if (![delta.x, delta.y, delta.z].every(Number.isFinite)) return;
      if (Math.abs(delta.x) + Math.abs(delta.y) + Math.abs(delta.z) < 1e-8) return;
      breakCoalescing();
      commit(project => updateLayer(project, layerId, layer => {
        if (layer.locked) return layer;
        return {
          ...layer,
          transform: { ...layer.transform, x: layer.transform.x + delta.x, y: layer.transform.y + delta.y, z: layer.transform.z + delta.z },
          animations: layer.animations.map(track => {
            if (track.property !== "x" && track.property !== "y" && track.property !== "z") return track;
            const shift = delta[track.property];
            return { ...track, keyframes: track.keyframes.map(key => ({ ...key, value: key.value + shift })) };
          }),
        };
      }));
    },

    resetTransform(layerId) {
      breakCoalescing();
      commit((project) =>
        updateLayer(project, layerId, (layer) => ({
          ...layer,
          transform: {
            x: 0,
            y: 0,
            z: 0,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1,
            opacity: 1,
          },
        })),
      );
    },

    addKeyframe(layerId, property, time, value, easing = "smoother") {
      breakCoalescing();
      commit((project) =>
        updateLayer(project, layerId, (layer) => {
          const resolvedValue =
            value ??
            (isTransformProperty(property)
              ? evaluateTransform(layer, time)[property]
              : staticPropertyValue(layer, property));
          const track = findTrack(layer.animations, property);

          if (!track) {
            const newTrack = {
              property,
              keyframes: [
                { id: createId("kf"), time: roundTime(time), value: resolvedValue, easing },
              ],
            };
            return { ...layer, animations: [...layer.animations, newTrack] };
          }

          const existing = track.keyframes.find((kf) => nearlyEqual(kf.time, time));
          const keyframes = existing
            ? track.keyframes.map((kf) =>
                kf.id === existing.id ? { ...kf, value: resolvedValue } : kf,
              )
            : sortByTime([
                ...track.keyframes,
                { id: createId("kf"), time: roundTime(time), value: resolvedValue, easing },
              ]);

          return {
            ...layer,
            animations: layer.animations.map((entry) =>
              entry.property === property ? { ...entry, keyframes } : entry,
            ),
          };
        }),
      );
    },

    removeKeyframe(layerId, property, keyframeId) {
      breakCoalescing();
      commit((project) =>
        updateLayer(project, layerId, (layer) => ({
          ...layer,
          animations: layer.animations
            .map((track) =>
              track.property === property
                ? { ...track, keyframes: track.keyframes.filter((kf) => kf.id !== keyframeId) }
                : track,
            )
            .filter((track) => track.keyframes.length > 0),
        })),
      );
    },

    moveKeyframe(layerId, property, keyframeId, time, options = {}) {
      commit(
        (project) =>
          updateLayer(project, layerId, (layer) => ({
            ...layer,
            animations: layer.animations.map((track) =>
              track.property === property
                ? {
                    ...track,
                    keyframes: sortByTime(
                      track.keyframes.map((kf) =>
                        kf.id === keyframeId ? { ...kf, time: roundTime(Math.max(0, time)) } : kf,
                      ),
                    ),
                  }
                : track,
            ),
          })),
        { coalesceKey: options.coalesceKey ?? `keyframe:move:${keyframeId}` },
      );
    },

    setKeyframeEasing(layerId, property, keyframeId, easing) {
      breakCoalescing();
      commit((project) =>
        updateLayer(project, layerId, (layer) => ({
          ...layer,
          animations: layer.animations.map((track) =>
            track.property === property
              ? {
                  ...track,
                  keyframes: track.keyframes.map((kf) =>
                    kf.id === keyframeId ? { ...kf, easing } : kf,
                  ),
                }
              : track,
          ),
        })),
      );
    },

    duplicateKeyframe(layerId, property, keyframeId, offset) {
      breakCoalescing();
      commit((project) =>
        updateLayer(project, layerId, (layer) => ({
          ...layer,
          animations: layer.animations.map((track) => {
            if (track.property !== property) return track;
            const source = track.keyframes.find((kf) => kf.id === keyframeId);
            if (!source) return track;
            const copy: Keyframe = {
              ...source,
              id: createId("kf"),
              time: roundTime(Math.max(0, source.time + offset)),
            };
            return { ...track, keyframes: sortByTime([...track.keyframes, copy]) };
          }),
        })),
      );
    },

    setKeyframeValue(layerId, property, keyframeId, value, options = {}) {
      commit(
        (project) =>
          updateLayer(project, layerId, (layer) => ({
            ...layer,
            animations: layer.animations.map((track) =>
              track.property === property
                ? {
                    ...track,
                    keyframes: track.keyframes.map((kf) =>
                      kf.id === keyframeId ? { ...kf, value } : kf,
                    ),
                  }
                : track,
            ),
          })),
        { coalesceKey: options.coalesceKey ?? `keyframe:value:${keyframeId}` },
      );
    },

    /**
     * Move a group of keyframes together.
     *
     * The delta is clamped once for the whole group rather than per keyframe.
     * Clamping each one individually would let the earliest key pile up at zero
     * while the rest kept moving, which silently destroys the timing the user
     * spent their afternoon on — the one thing a group drag must never do.
     */
    nudgeKeyframes(refs, delta, options = {}) {
      if (refs.length === 0 || delta === 0) return;

      const project = get().project;
      if (!project) return;

      let earliest = Infinity;
      for (const ref of refs) {
        const keyframe = findKeyframe(project, ref);
        if (keyframe) earliest = Math.min(earliest, keyframe.time);
      }
      if (!Number.isFinite(earliest)) return;

      const shift = Math.max(delta, -earliest);
      if (shift === 0) return;

      const byLayer = groupByLayer(refs);

      commit(
        (current) => {
          let next = current;
          for (const [layerId, ids] of byLayer) {
            next = updateLayer(next, layerId, (layer) => ({
              ...layer,
              animations: layer.animations.map((track) => {
                const wanted = ids.get(track.property);
                if (!wanted) return track;
                return {
                  ...track,
                  keyframes: sortByTime(
                    track.keyframes.map((kf) =>
                      wanted.has(kf.id)
                        ? { ...kf, time: roundTime(Math.max(0, kf.time + shift)) }
                        : kf,
                    ),
                  ),
                };
              }),
            }));
          }
          return next;
        },
        { coalesceKey: options.coalesceKey ?? "keyframe:nudge" },
      );
    },

    removeKeyframes(refs) {
      if (refs.length === 0) return;
      breakCoalescing();

      const byLayer = groupByLayer(refs);

      commit((current) => {
        let next = current;
        for (const [layerId, ids] of byLayer) {
          next = updateLayer(next, layerId, (layer) => ({
            ...layer,
            animations: layer.animations
              .map((track) => {
                const wanted = ids.get(track.property);
                if (!wanted) return track;
                return { ...track, keyframes: track.keyframes.filter((kf) => !wanted.has(kf.id)) };
              })
              // A track with nothing on it is not an empty track, it is no
              // track: leaving it would put a permanently blank row in the
              // timeline that the user cannot get rid of.
              .filter((track) => track.keyframes.length > 0),
          }));
        }
        return next;
      });
    },

    duplicateKeyframes(refs, offset) {
      if (refs.length === 0) return [];
      breakCoalescing();

      const created: KeyframeRef[] = [];
      const byLayer = groupByLayer(refs);

      commit((current) => {
        let next = current;
        for (const [layerId, ids] of byLayer) {
          next = updateLayer(next, layerId, (layer) => ({
            ...layer,
            animations: layer.animations.map((track) => {
              const wanted = ids.get(track.property);
              if (!wanted) return track;

              const copies = track.keyframes
                .filter((kf) => wanted.has(kf.id))
                .map((source) => {
                  const copy: Keyframe = {
                    ...source,
                    id: createId("kf"),
                    time: roundTime(Math.max(0, source.time + offset)),
                  };
                  created.push({ layerId, property: track.property, keyframeId: copy.id });
                  return copy;
                });

              return { ...track, keyframes: sortByTime([...track.keyframes, ...copies]) };
            }),
          }));
        }
        return next;
      });

      return created;
    },

    setKeyframesEasing(refs, easing) {
      if (refs.length === 0) return;
      breakCoalescing();

      const byLayer = groupByLayer(refs);

      commit((current) => {
        let next = current;
        for (const [layerId, ids] of byLayer) {
          next = updateLayer(next, layerId, (layer) => ({
            ...layer,
            animations: layer.animations.map((track) => {
              const wanted = ids.get(track.property);
              if (!wanted) return track;
              return {
                ...track,
                keyframes: track.keyframes.map((kf) =>
                  wanted.has(kf.id) ? { ...kf, easing } : kf,
                ),
              };
            }),
          }));
        }
        return next;
      });
    },

    /**
     * Paste onto one layer.
     *
     * Onto *one* layer on purpose, even when the copy crossed several: pasting
     * across layers would need a mapping the user never described, and guessing
     * it wrong scatters keyframes onto layers they were never meant for. The
     * property is kept, so copying a device rotation and pasting it on another
     * device does the obvious thing.
     */
    pasteKeyframes(layerId, seeds, atTime) {
      if (seeds.length === 0) return [];
      breakCoalescing();

      const created: KeyframeRef[] = [];

      commit((project) =>
        updateLayer(project, layerId, (layer) => {
          const byProperty = new Map<AnimatableProperty, Keyframe[]>();
          for (const track of layer.animations) byProperty.set(track.property, [...track.keyframes]);

          for (const seed of seeds) {
            const time = roundTime(Math.max(0, atTime + seed.offset));
            const existing = byProperty.get(seed.property) ?? [];

            // Pasting onto a keyframe that is already there replaces it. Two
            // keyframes at the same time on one track is not a state the
            // evaluator can make sense of.
            const collision = existing.find((kf) => nearlyEqual(kf.time, time));
            const keyframe: Keyframe = {
              id: collision?.id ?? createId("kf"),
              time,
              value: seed.value,
              easing: seed.easing,
            };

            byProperty.set(
              seed.property,
              collision
                ? existing.map((kf) => (kf.id === collision.id ? keyframe : kf))
                : [...existing, keyframe],
            );
            created.push({ layerId, property: seed.property, keyframeId: keyframe.id });
          }

          return {
            ...layer,
            animations: [...byProperty.entries()].map(([property, keyframes]) => ({
              property,
              keyframes: sortByTime(keyframes),
            })),
          };
        }),
      );

      return created;
    },

    /**
     * Shorten the composition animation to fit a new duration.
     *
     * Destructive, and never called on its own — the UI asks first. What it
     * does not do is trim quietly: a keyframe past the end is the user work,
     * and a composition that is shortened and lengthened again should still
     * have it unless they said otherwise.
     */
    cropAnimation(duration) {
      const project = get().project;
      if (!project) return 0;

      const doomed = keyframesBeyond(project, duration);
      if (doomed.length === 0) return 0;

      breakCoalescing();
      commit((current) => ({
        ...current,
        layers: current.layers.map((layer) => ({
          ...layer,
          animations: layer.animations
            .map((track) => ({
              ...track,
              keyframes: track.keyframes.filter((kf) => kf.time <= duration + 0.0001),
            }))
            .filter((track) => track.keyframes.length > 0),
        })),
      }));

      return doomed.length;
    },

    setWorkArea(area) {
      commit(
        (project) => {
          if (!area) {
            if (!project.canvas.workArea) return project;
            const canvas = { ...project.canvas };
            delete canvas.workArea;
            return { ...project, canvas };
          }

          const start = Math.max(0, Math.min(area.in, project.canvas.duration));
          const end = Math.max(start, Math.min(area.out, project.canvas.duration));
          return {
            ...project,
            canvas: { ...project.canvas, workArea: { in: start, out: end, enabled: area.enabled } },
          };
        },
        { coalesceKey: "work-area" },
      );
    },

    setExportSettings(settings) {
      commit((project) => ({ ...project, exportSettings: settings }), {
        coalesceKey: "export-settings",
      });
    },

    clearTrack(layerId, property) {
      breakCoalescing();
      commit((project) =>
        updateLayer(project, layerId, (layer) => ({
          ...layer,
          animations: layer.animations.filter((track) => track.property !== property),
        })),
      );
    },

    clearAllAnimation(layerId) {
      breakCoalescing();
      commit((project) => updateLayer(project, layerId, (layer) => ({ ...layer, animations: [] })));
    },

    /**
     * Apply a motion preset.
     *
     * One `commit`, so the whole preset — every track, every keyframe — is a
     * single undo. Requiring twenty undos to take back one click is the
     * classic way a generated-keyframe feature becomes unusable.
     *
     * Properties the preset does not touch are left exactly as they are, which
     * is what makes presets stack: Scale In owns the scale tracks, Device Spin
     * owns rotationY, and applying both gives you both.
     */
    applyMotionPreset(layerId, preset, options) {
      breakCoalescing();

      const project = get().project;
      if (!project) return { applied: false, replaced: [], duration: 0 };

      const layer = project.layers.find((entry) => entry.id === layerId);
      if (!layer) return { applied: false, replaced: [], duration: 0 };

      const plan = planDuration(preset, project.canvas.duration, options.durationStrategy ?? "fit");

      const tracks = generateTracks(
        preset,
        {
          baseTransform: layer.transform,
          baseMetadata: layer.metadata,
          duration: plan.presetSpan,
        },
        options.parameters,
      );

      const { tracks: merged, replaced } = mergePresetTracks(layer.animations, tracks);

      commit((current) => {
        const next = updateLayer(current, layerId, (entry) => ({
          ...entry,
          animations: merged,
          // A preset that reveals text has to set what the reveal counts,
          // here rather than in a second commit, or undoing the preset
          // would leave the layer in a mode nothing set (45).
          metadata:
            preset.revealMode && entry.type === "text"
              ? { ...entry.metadata, revealMode: preset.revealMode }
              : entry.metadata,
        }));

        // Extending the composition is part of the same undo step — undoing a
        // preset that grew the timeline must give the timeline back too.
        if (plan.resultingDuration > current.canvas.duration) {
          return { ...next, canvas: { ...next.canvas, duration: plan.resultingDuration } };
        }
        return next;
      });

      return { applied: true, replaced, duration: plan.resultingDuration };
    },

    /**
     * Apply a project template.
     *
     * Templates are allowed to change everything a preset must not: canvas,
     * device, finish, background, duration and the layer set itself. That is
     * the distinction between the two libraries, and it is enforced here
     * rather than by convention — `applyMotionPreset` structurally cannot
     * touch any of these.
     *
     * The layers are built by `buildTemplateLayers`, which is pure and keeps
     * the user's uploaded screen image: that is their content, not part of
     * the template's look.
     *
     * One commit, so trying a template is one undo — including the text
     * layers it brought with it.
     */
    applyProjectTemplate(template, layers) {
      breakCoalescing();

      commit((current) => ({
        ...current,
        canvas: { ...template.canvas, workArea: { in: 0, out: template.canvas.duration, enabled: false } },
        background: structuredClone(template.background),
        layers,
        templateId: template.id,
        editorState: { currentTime: template.posterTime ?? 0, cameraView: template.cameraView ?? "front",
          camera: cameraPoseFor(template.cameraView ?? "front"), selectedLayerId: layers.find(layer => layer.type === "device")?.id ?? null },
        // The device motion no longer came from a device template — it came
        // from this one. Leaving the old id would have the library claim a
        // choreography is applied that the project no longer contains.
        deviceMotionTemplateId: undefined,
      }));
    },

    applyDeviceMotionTemplate(layerId, template, result) {
      const project = get().project;
      if (!project) return false;
      if (!project.layers.some((layer) => layer.id === layerId)) return false;

      breakCoalescing();

      commit((current) => {
        const next: Project = {
          ...current,
          canvas: { ...current.canvas, duration: result.duration },
          layers: current.layers.map((layer) =>
            layer.id === layerId
              ? { ...layer, transform: result.transform, animations: result.tracks }
              : layer,
          ),
          deviceMotionTemplateId: template.id,
        };

        // Only when the template actually brings one. A choreography is about
        // movement, and silently repainting someone background because they
        // tried a different entrance is exactly the surprise part 13 rules out.
        return template.background ? { ...next, background: template.background } : next;
      });

      return true;
    },

    undo() {
      const { past, project, future } = get();
      if (past.length === 0 || !project) return;
      breakCoalescing();
      set({
        project: past[past.length - 1],
        past: past.slice(0, -1),
        future: [project, ...future].slice(0, HISTORY_LIMIT),
        saveStatus: "unsaved",
      });
    },

    redo() {
      const { future, project, past } = get();
      if (future.length === 0 || !project) return;
      breakCoalescing();
      set({
        project: future[0],
        future: future.slice(1),
        past: [...past, project].slice(-HISTORY_LIMIT),
        saveStatus: "unsaved",
      });
    },
  };
});

/**
 * Write an animatable typography value onto the layer's metadata.
 *
 * `reveal` is pointedly absent: it describes how much of the text is shown at
 * a moment in time, which is only ever meaningful as a curve. Storing a static
 * reveal would let a layer be saved permanently half-typed.
 */
function applyTextProperty(layer: Layer, property: AnimatableProperty, value: number): Layer {
  if (property === "reveal") return layer;
  const current = (layer.metadata ?? {}) as Record<string, unknown>;
  if (current[property] === value) return layer;
  return { ...layer, metadata: { ...current, [property]: value } };
}

function updateLayer(project: Project, layerId: string, mutate: (layer: Layer) => Layer): Project {
  let changed = false;
  const layers = project.layers.map((layer) => {
    if (layer.id !== layerId) return layer;
    const next = mutate(layer);
    if (next !== layer) changed = true;
    return next;
  });
  return changed ? { ...project, layers } : project;
}

/**
 * Index a flat list of keyframe references by layer, then by property.
 *
 * Batch edits walk the project once per layer instead of once per keyframe.
 * Dragging forty selected keys should not mean forty passes over the layer
 * array and forty new project objects for one gesture.
 */
function groupByLayer(refs: KeyframeRef[]): Map<string, Map<AnimatableProperty, Set<string>>> {
  const byLayer = new Map<string, Map<AnimatableProperty, Set<string>>>();

  for (const ref of refs) {
    let byProperty = byLayer.get(ref.layerId);
    if (!byProperty) {
      byProperty = new Map();
      byLayer.set(ref.layerId, byProperty);
    }
    let ids = byProperty.get(ref.property);
    if (!ids) {
      ids = new Set();
      byProperty.set(ref.property, ids);
    }
    ids.add(ref.keyframeId);
  }

  return byLayer;
}

function findKeyframe(project: Project, ref: KeyframeRef): Keyframe | undefined {
  const layer = project.layers.find((entry) => entry.id === ref.layerId);
  return layer?.animations
    .find((track) => track.property === ref.property)
    ?.keyframes.find((kf) => kf.id === ref.keyframeId);
}

/**
 * Every keyframe that sits past a proposed duration.
 *
 * Exported because the confirmation dialog has to be able to say how much work
 * is about to disappear before anything happens. "Crop animation?" with no
 * number is not a question anyone can answer.
 */
export function keyframesBeyond(project: Project, duration: number): KeyframeRef[] {
  const doomed: KeyframeRef[] = [];

  for (const layer of project.layers) {
    for (const track of layer.animations) {
      for (const keyframe of track.keyframes) {
        if (keyframe.time > duration + 0.0001) {
          doomed.push({ layerId: layer.id, property: track.property, keyframeId: keyframe.id });
        }
      }
    }
  }

  return doomed;
}

function sortByTime(keyframes: Keyframe[]): Keyframe[] {
  return [...keyframes].sort((a, b) => a.time - b.time);
}

function roundTime(time: number): number {
  return Math.round(time * 1000) / 1000;
}

function nearlyEqual(a: number, b: number, tolerance = 0.001): boolean {
  return Math.abs(a - b) <= tolerance;
}

// ---------------------------------------------------------------------------
// Selectors — components subscribe to the narrowest slice they need.
// ---------------------------------------------------------------------------

export const selectProject = (state: ProjectStoreState) => state.project;
export const selectCanvas = (state: ProjectStoreState) => state.project?.canvas ?? null;
export const selectLayers = (state: ProjectStoreState) => state.project?.layers ?? EMPTY_LAYERS;
export const selectCanUndo = (state: ProjectStoreState) => state.past.length > 0;
export const selectCanRedo = (state: ProjectStoreState) => state.future.length > 0;
export const selectSaveStatus = (state: ProjectStoreState) => state.saveStatus;

const EMPTY_LAYERS: Layer[] = [];

export function selectLayerById(layerId: string | null) {
  return (state: ProjectStoreState): Layer | null => {
    if (!layerId || !state.project) return null;
    return state.project.layers.find((layer) => layer.id === layerId) ?? null;
  };
}

export type { ProjectStoreState, Transform };
