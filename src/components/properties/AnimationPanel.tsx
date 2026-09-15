"use client";

import { ClipboardPaste, Copy, CopyPlus, Trash2 } from "lucide-react";
import * as React from "react";

import { EasingEditor } from "@/components/timeline/EasingEditor";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { NumericField } from "@/components/ui/numeric-field";
import { PanelRow, PanelSection } from "@/components/ui/panel";
import {
  copySelectedKeyframes,
  deleteSelectedKeyframes,
  duplicateSelectedKeyframes,
  keyframeCount,
  notifyCopied,
  pasteKeyframes,
  setSelectedKeyframesEasing,
} from "@/lib/timeline/keyframe-actions";
import { notify } from "@/lib/toast";
import { formatTimecode } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import { PROPERTY_LABELS, type EasingType, type Keyframe } from "@/types/animation";
import type { Layer } from "@/types/layer";

interface AnimationPanelProps {
  layer: Layer;
  fps: number;
}

/**
 * The keyframe inspector.
 *
 * Its job is the one thing the timeline cannot do: exact numbers. Dragging is
 * for finding a value, typing is for committing to one, and a timeline without
 * the second is a toy — nobody eyeballs "rotate to exactly 180°" off a
 * 240-pixel-wide track.
 *
 * Both the single and the multiple selection are handled here rather than in
 * two components, because the difference between them is only which fields can
 * show a value. Everything else — duplicate, copy, delete, re-ease — means the
 * same thing at one keyframe and at forty.
 */
export function AnimationPanel({ layer, fps }: AnimationPanelProps) {
  const selectedKeyframes = useEditorStore((state) => state.selectedKeyframes);
  const clipboard = useEditorStore((state) => state.keyframeClipboard);
  const clearKeyframeSelection = useEditorStore((state) => state.clearKeyframeSelection);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);

  const clearTrack = useProjectStore((state) => state.clearTrack);
  const clearAllAnimation = useProjectStore((state) => state.clearAllAnimation);

  const tracks = layer.animations.filter((track) => track.keyframes.length > 0);
  const totalKeyframes = tracks.reduce((sum, track) => sum + track.keyframes.length, 0);

  // Only the selection that belongs to *this* layer. A marquee can cross
  // layers, and showing another layer's keyframe under this layer's heading
  // would be the panel lying about what it is editing.
  const mine = selectedKeyframes.filter((entry) => entry.layerId === layer.id);

  const resolved = mine
    .map((entry) => {
      const keyframe = tracks
        .find((track) => track.property === entry.property)
        ?.keyframes.find((candidate) => candidate.id === entry.keyframeId);
      return keyframe ? { entry, keyframe } : null;
    })
    .filter((value): value is { entry: (typeof mine)[number]; keyframe: Keyframe } => value !== null);

  // `null` when they disagree, which the editor renders as "Mixed" rather than
  // picking one and quietly making it look unanimous.
  const sharedEasing = resolved.reduce<EasingType | null | undefined>((shared, { keyframe }) => {
    if (shared === undefined) return keyframe.easing;
    return shared === keyframe.easing ? shared : null;
  }, undefined);

  return (
    <PanelSection
      title="Animation"
      actions={
        tracks.length > 0 ? (
          <IconButton
            icon={Trash2}
            label="Clear all animation"
            size="sm"
            tone="danger"
            onClick={() => {
              clearAllAnimation(layer.id);
              clearKeyframeSelection();
            }}
          />
        ) : null
      }
    >
      {tracks.length === 0 ? (
        <p className="px-0.5 text-[11px] leading-relaxed text-ink-subtle">
          Add a keyframe to start animating. Use the diamond next to any transform property, or
          apply a device motion template.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between px-0.5">
            <span className="panel-label">Tracks</span>
            <span className="numeric text-ink-subtle">
              {tracks.length} · {totalKeyframes} keys
            </span>
          </div>

          <ul className="space-y-1">
            {tracks.map((track) => (
              <li
                key={track.property}
                className="flex items-center gap-2 rounded-sm border border-line bg-surface-raised px-2 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-[11px] text-ink">
                  {PROPERTY_LABELS[track.property]}
                </span>
                <span className="numeric text-ink-subtle">{track.keyframes.length}</span>
                <IconButton
                  icon={Trash2}
                  label={`Clear ${PROPERTY_LABELS[track.property]} track`}
                  size="sm"
                  tone="danger"
                  onClick={() => {
                    clearTrack(layer.id, track.property);
                    clearKeyframeSelection();
                  }}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {resolved.length > 0 ? (
        <div className="space-y-2.5 rounded-md border border-accent/30 bg-accent-soft/50 p-2.5">
          <div className="flex items-center justify-between">
            <span className="panel-label text-accent">
              {resolved.length === 1 ? "Selected keyframe" : `${resolved.length} keyframes`}
            </span>
            {resolved.length === 1 ? (
              <button
                type="button"
                onClick={() => setCurrentTime(resolved[0].keyframe.time)}
                className="numeric text-ink-muted transition-colors hover:text-ink"
                title="Move the playhead here"
              >
                {formatTimecode(resolved[0].keyframe.time, fps)}
              </button>
            ) : (
              <span className="numeric text-ink-subtle">
                {span(resolved.map(({ keyframe }) => keyframe.time))}
              </span>
            )}
          </div>

          {resolved.length === 1 ? (
            <SingleKeyframeFields
              layerId={layer.id}
              property={resolved[0].entry.property}
              keyframe={resolved[0].keyframe}
              fps={fps}
            />
          ) : (
            <p className="text-[10px] leading-relaxed text-ink-subtle">
              Times and values differ across the selection. Drag on the timeline or use the arrow
              keys to move them together; the easing below applies to all of them.
            </p>
          )}

          <EasingEditor
            value={sharedEasing ?? null}
            count={resolved.length}
            onChange={(easing) => setSelectedKeyframesEasing(easing)}
          />

          <div className="grid grid-cols-2 gap-1.5">
            <Button
              size="xs"
              variant="secondary"
              onClick={() => {
                const made = duplicateSelectedKeyframes(Math.max(0.5, 12 / Math.max(1, fps)));
                if (made > 0) notify.success(`${keyframeCount(made)} duplicated`);
              }}
            >
              <CopyPlus className="h-3 w-3" />
              Duplicate
            </Button>
            <Button size="xs" variant="secondary" onClick={() => notifyCopied(copySelectedKeyframes())}>
              <Copy className="h-3 w-3" />
              Copy
            </Button>
            <Button
              size="xs"
              variant="secondary"
              disabled={clipboard.length === 0}
              title={clipboard.length === 0 ? "Nothing copied yet" : "Paste at the playhead"}
              onClick={() => {
                const pasted = pasteKeyframes();
                if (pasted > 0) notify.success(`${keyframeCount(pasted)} pasted`);
              }}
            >
              <ClipboardPaste className="h-3 w-3" />
              Paste
            </Button>
            <Button
              size="xs"
              variant="danger"
              onClick={() => {
                const removed = deleteSelectedKeyframes();
                if (removed > 0) notify.success(`${keyframeCount(removed)} deleted`, "Ctrl+Z undoes it.");
              }}
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
      ) : null}
    </PanelSection>
  );
}

/**
 * The exact time and value of one keyframe.
 *
 * Both write straight to the project. `moveKeyframe` and `setKeyframeValue`
 * coalesce by keyframe id, so holding the stepper is one undo rather than
 * thirty — the same rule every other numeric control in the editor follows.
 */
function SingleKeyframeFields({
  layerId,
  property,
  keyframe,
  fps,
}: {
  layerId: string;
  property: keyof typeof PROPERTY_LABELS;
  keyframe: Keyframe;
  fps: number;
}) {
  const moveKeyframe = useProjectStore((state) => state.moveKeyframe);
  const setKeyframeValue = useProjectStore((state) => state.setKeyframeValue);
  const duration = useProjectStore((state) => state.project?.canvas.duration ?? 5);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);

  return (
    <>
      <PanelRow label="Property">
        <span className="truncate text-[11px] text-ink">{PROPERTY_LABELS[property]}</span>
      </PanelRow>

      <PanelRow label="Time">
        <NumericField
          label="s"
          value={keyframe.time}
          min={0}
          max={duration}
          // One frame per step: the only increment that cannot land a keyframe
          // between two frames, where it would never be the one that renders.
          step={1 / Math.max(1, fps)}
          decimals={3}
          onChange={(value) => {
            moveKeyframe(layerId, property, keyframe.id, value);
            setCurrentTime(value);
          }}
        />
      </PanelRow>

      <PanelRow label="Value">
        <NumericField
          label=""
          value={keyframe.value}
          step={property === "opacity" || property.startsWith("scale") ? 0.01 : 0.1}
          decimals={3}
          min={property === "opacity" ? 0 : undefined}
          max={property === "opacity" ? 1 : undefined}
          onChange={(value) => setKeyframeValue(layerId, property, keyframe.id, value)}
        />
      </PanelRow>
    </>
  );
}

function span(times: number[]): string {
  const first = Math.min(...times);
  const last = Math.max(...times);
  return `${first.toFixed(2)}–${last.toFixed(2)}s`;
}
