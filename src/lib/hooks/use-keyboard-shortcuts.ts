"use client";

import * as React from "react";

import { evaluateTransform } from "@/engine/animation/evaluate";
import { presetPreview } from "@/engine/motion/preset-preview";
import { pxToWorld } from "@/engine/text/text-types";
import { saveProjectNow } from "@/lib/hooks/use-autosave";
import {
  copySelectedKeyframes,
  deleteSelectedKeyframes,
  duplicateSelectedKeyframes,
  keyframeCount,
  notifyCopied,
  nudgeSelectedKeyframes,
  pasteKeyframes,
} from "@/lib/timeline/keyframe-actions";
import { notify } from "@/lib/toast";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";

export interface ShortcutDefinition {
  keys: string;
  description: string;
  group: "Playback" | "Editing" | "Timeline" | "View";
}

export const SHORTCUTS: ShortcutDefinition[] = [
  { keys: "Space", description: "Play / pause", group: "Playback" },
  { keys: "←  →", description: "Step one frame", group: "Playback" },
  { keys: "Shift + ←  →", description: "Step one second", group: "Playback" },
  { keys: "Home", description: "Jump to start", group: "Playback" },
  { keys: "End", description: "Jump to end", group: "Playback" },
  { keys: "T", description: "Text tool", group: "Editing" },
  { keys: "K", description: "Add keyframe at playhead", group: "Editing" },
  { keys: "R", description: "Preview the selected motion preset", group: "Editing" },
  {
    keys: "Enter",
    description: "Edit the selected text, or apply the selected preset",
    group: "Editing",
  },
  { keys: "Esc", description: "Finish editing, or stop a preview", group: "Editing" },
  { keys: "Ctrl/Cmd + Z", description: "Undo", group: "Editing" },
  { keys: "Ctrl/Cmd + Shift + Z", description: "Redo", group: "Editing" },
  { keys: "Ctrl/Cmd + S", description: "Save project", group: "Editing" },
  { keys: "Ctrl/Cmd + E", description: "Open export", group: "Editing" },
  { keys: "Arrows", description: "Nudge selected text (Shift for 10px)", group: "Editing" },
  { keys: "Delete", description: "Delete selected keyframes or text layer", group: "Editing" },
  { keys: "← →", description: "Move selected keyframes a frame (Shift: a second)", group: "Timeline" },
  { keys: "Ctrl/Cmd + C", description: "Copy selected keyframes", group: "Timeline" },
  { keys: "Ctrl/Cmd + V", description: "Paste keyframes at the playhead", group: "Timeline" },
  { keys: "Ctrl/Cmd + D", description: "Duplicate selected keyframes", group: "Timeline" },
  { keys: "Shift + click", description: "Add a keyframe to the selection", group: "Timeline" },
  { keys: "Alt + drag", description: "Duplicate keyframes as you drag", group: "Timeline" },
  { keys: "Drag on empty grid", description: "Marquee-select keyframes", group: "Timeline" },
  { keys: "Ctrl/Cmd + wheel", description: "Zoom the timeline at the cursor", group: "Timeline" },
  { keys: "F", description: "Fit view", group: "View" },
  { keys: "0", description: "Reset camera", group: "View" },
  { keys: "?", description: "Show shortcuts", group: "View" },
];

/**
 * Move a layer by a number of composition pixels.
 *
 * Converted through the same pixels-per-world-unit constant the renderer
 * uses, so "1px" means one pixel of the exported image rather than an
 * arbitrary fraction of a world unit.
 */
function nudgeLayer(layerId: string, key: string, pixels: number): void {
  const step = pxToWorld(pixels);
  const editor = useEditorStore.getState();
  const projects = useProjectStore.getState();
  const layer = projects.project?.layers.find((entry) => entry.id === layerId);
  if (!layer || layer.locked) return;

  const property = key === "ArrowLeft" || key === "ArrowRight" ? "x" : "y";
  const direction = key === "ArrowRight" || key === "ArrowUp" ? 1 : -1;
  const current = evaluateTransform(layer, editor.currentTime)[property];

  projects.setTransformValue(layerId, property, roundValue(current + step * direction), {
    time: editor.currentTime,
    coalesceKey: `nudge:${layerId}:${property}`,
  });
}

function roundValue(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Global editor shortcuts. Every binding maps to a store command, so shortcuts
 * and UI controls go through the same code path (and the same undo history).
 */
export function useKeyboardShortcuts(fps: number): void {
  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      const editor = useEditorStore.getState();
      const projects = useProjectStore.getState();
      const modifier = event.metaKey || event.ctrlKey;

      // While text is open for editing the canvas owns the keyboard.
      // `isTypingTarget` covers the field itself; this covers the moment
      // between clicking away and the field regaining focus.
      if (editor.editingLayerId && event.key !== "Escape") return;

      const selectedLayer = projects.project?.layers.find(
        (entry) => entry.id === editor.selectedLayerId,
      );
      const textSelected = selectedLayer?.type === "text";

      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) projects.redo();
        else projects.undo();
        return;
      }

      if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        projects.redo();
        return;
      }

      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        const project = projects.project;
        if (project) {
          void saveProjectNow(project).then((ok) => {
            if (ok) notify.success("Project saved");
          });
        }
        return;
      }

      if (modifier && event.key.toLowerCase() === "e") {
        event.preventDefault();
        editor.setExportDialogOpen(true);
        return;
      }

      // Keyframe clipboard. Only when something is selected, so Ctrl+C keeps
      // working as the browser's copy everywhere else in the editor.
      if (modifier && editor.selectedKeyframes.length > 0) {
        const key = event.key.toLowerCase();

        if (key === "c") {
          event.preventDefault();
          notifyCopied(copySelectedKeyframes());
          return;
        }
        if (key === "d") {
          event.preventDefault();
          const made = duplicateSelectedKeyframes(Math.max(0.5, 12 / Math.max(1, fps)));
          if (made > 0) notify.success(`${keyframeCount(made)} duplicated`);
          return;
        }
      }

      if (modifier && event.key.toLowerCase() === "v" && editor.keyframeClipboard.length > 0) {
        event.preventDefault();
        const pasted = pasteKeyframes();
        if (pasted > 0) notify.success(`${keyframeCount(pasted)} pasted`, "At the playhead.");
        return;
      }

      if (modifier) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          editor.togglePlay();
          break;
        case "ArrowLeft":
        case "ArrowRight":
        case "ArrowUp":
        case "ArrowDown": {
          event.preventDefault();
          // The arrows nudge a selected text layer and otherwise step the
          // playhead: the same keys mean "move what I selected" when
          // something movable is selected, and "move through time"
          // when nothing is (8).
          //
          // Keyframes come first. A selected keyframe is a more specific
          // selection than a selected layer — you cannot select one without
          // its layer also being selected — so the narrower one wins, exactly
          // as it does in After Effects.
          if (
            editor.selectedKeyframes.length > 0 &&
            (event.key === "ArrowLeft" || event.key === "ArrowRight")
          ) {
            const step = event.shiftKey ? 1 : 1 / Math.max(1, fps);
            nudgeSelectedKeyframes(event.key === "ArrowLeft" ? -step : step);
            break;
          }
          if (textSelected && selectedLayer) {
            nudgeLayer(selectedLayer.id, event.key, event.shiftKey ? 10 : 1);
            break;
          }
          if (event.key === "ArrowLeft") editor.stepFrames(event.shiftKey ? -fps : -1, fps);
          else if (event.key === "ArrowRight") editor.stepFrames(event.shiftKey ? fps : 1, fps);
          break;
        }
        case "Home":
          event.preventDefault();
          editor.setCurrentTime(0);
          break;
        case "End":
          event.preventDefault();
          editor.setCurrentTime(editor.duration);
          break;
        case "Delete":
        case "Backspace": {
          if (editor.selectedKeyframes.length > 0) {
            event.preventDefault();
            const removed = deleteSelectedKeyframes();
            if (removed > 1) notify.success(`${keyframeCount(removed)} deleted`, "Ctrl+Z undoes it.");
            break;
          }

          // Only text is deletable this way. A project without its device
          // is not something anyone means to make with the Backspace key.
          if (textSelected && selectedLayer) {
            event.preventDefault();
            projects.removeLayer(selectedLayer.id);
            editor.selectLayer(null);
          }
          break;
        }
        case "t":
        case "T":
          event.preventDefault();
          editor.setActiveTool(editor.activeTool === "text" ? "select" : "text");
          break;
        case "Enter":
          if (!textSelected || !selectedLayer) break;
          event.preventDefault();
          editor.beginTextEditing(selectedLayer.id);
          break;
        case "k":
        case "K": {
          event.preventDefault();
          const layerId = editor.selectedLayerId;
          const layer = projects.project?.layers.find((entry) => entry.id === layerId);
          if (!layerId || !layer) break;

          const animated = layer.animations.filter((track) => track.keyframes.length > 0);
          if (animated.length === 0) {
            notify.info(
              "Nothing is animated yet",
              "Use the keyframe toggle next to a property to start a track.",
            );
            break;
          }
          for (const track of animated) {
            projects.addKeyframe(layerId, track.property, editor.currentTime);
          }
          break;
        }
        case "f":
        case "F":
          event.preventDefault();
          editor.requestCameraFit();
          break;
        case "0":
          event.preventDefault();
          editor.requestCameraReset();
          break;
        case "Escape":
          // Escape unwinds one layer of state at a time: the text field
          // first, then an armed tool, then a running preview.
          if (editor.editingLayerId) {
            event.preventDefault();
            editor.endTextEditing();
            break;
          }
          if (editor.activeTool !== "select") {
            event.preventDefault();
            editor.setActiveTool("select");
            break;
          }
          // A preview overrides the device without touching the project, so
          // there has to be a way out that does not depend on finding the
          // panel it started from.
          if (presetPreview.get()) {
            event.preventDefault();
            presetPreview.stop();
          }
          break;

        case "?":
          event.preventDefault();
          editor.setShortcutsOpen(true);
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fps]);
}
