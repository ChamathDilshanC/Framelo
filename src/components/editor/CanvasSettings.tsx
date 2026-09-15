"use client";

import * as Popover from "@radix-ui/react-popover";
import * as React from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NumericField } from "@/components/ui/numeric-field";
import { PanelRow } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CANVAS_PRESETS, FPS_OPTIONS, MAX_DURATION, MIN_DURATION } from "@/lib/constants";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { keyframesBeyond, useProjectStore } from "@/store/project-store";
import { resolveWorkArea } from "@/types/project";

interface CanvasSettingsProps {
  trigger: React.ReactNode;
}

/** Composition size, frame rate, duration and work area. */
export function CanvasSettings({ trigger }: CanvasSettingsProps) {
  const canvas = useProjectStore((state) => state.project?.canvas);
  const updateCanvas = useProjectStore((state) => state.updateCanvas);
  const cropAnimation = useProjectStore((state) => state.cropAnimation);
  const setWorkArea = useProjectStore((state) => state.setWorkArea);
  const setDuration = useEditorStore((state) => state.setDuration);

  /** A shortening that would destroy keyframes, waiting to be confirmed. */
  const [pendingCrop, setPendingCrop] = React.useState<{ duration: number; count: number } | null>(
    null,
  );

  if (!canvas) return null;

  const activePreset = CANVAS_PRESETS.find(
    (preset) => preset.width === canvas.width && preset.height === canvas.height,
  );

  const area = resolveWorkArea(canvas);
  const workAreaOn = Boolean(canvas.workArea?.enabled);

  /**
   * Change the composition length.
   *
   * Lengthening is free and immediate. Shortening is not: keyframes past the
   * new end would stop playing, and silently deleting them is the one thing
   * §10 rules out. So the destructive half asks, names the number, and offers
   * to leave the keyframes where they are — a composition can be shorter than
   * its animation, and a user who shortens it to check a timing and lengthens
   * it again should find their work intact.
   */
  function applyDuration(next: number) {
    const project = useProjectStore.getState().project;
    if (!project) return;

    const doomed = keyframesBeyond(project, next);
    if (doomed.length > 0 && next < project.canvas.duration) {
      setPendingCrop({ duration: next, count: doomed.length });
      return;
    }

    commitDuration(next);
  }

  function commitDuration(next: number) {
    updateCanvas({ duration: next });
    setDuration(next);

    // A range that now hangs off the end of the composition is not a range.
    const current = useProjectStore.getState().project?.canvas;
    if (current?.workArea && current.workArea.out > next) {
      setWorkArea({
        in: Math.min(current.workArea.in, next),
        out: next,
        enabled: current.workArea.enabled,
      });
    }
  }

  return (
    <>
      <Popover.Root>
        <Popover.Trigger asChild>{trigger}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            className="animate-fade-up z-[75] w-72 rounded-lg border border-line-strong bg-surface p-3 shadow-2xl shadow-black/50"
          >
            <p className="panel-label mb-3 px-0.5">Composition</p>

            <div className="mb-3 grid grid-cols-2 gap-1.5">
              {CANVAS_PRESETS.map((preset) => {
                const active = activePreset?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => updateCanvas({ width: preset.width, height: preset.height })}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-sm border px-2 py-1.5 text-left transition-colors",
                      active
                        ? "border-accent/50 bg-accent-soft text-ink"
                        : "border-line bg-surface-raised text-ink-muted hover:border-line-strong hover:text-ink",
                    )}
                  >
                    <span className="text-[11px] font-medium">{preset.name}</span>
                    <span className="numeric text-ink-subtle">{preset.detail}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2.5">
              <PanelRow label="Size">
                <NumericField
                  label="W"
                  value={canvas.width}
                  min={64}
                  max={7680}
                  step={1}
                  decimals={0}
                  onChange={(value) => updateCanvas({ width: Math.round(value) })}
                />
                <NumericField
                  label="H"
                  value={canvas.height}
                  min={64}
                  max={7680}
                  step={1}
                  decimals={0}
                  onChange={(value) => updateCanvas({ height: Math.round(value) })}
                />
              </PanelRow>

              <PanelRow label="Frame rate">
                <Select
                  aria-label="Frame rate"
                  value={String(canvas.fps)}
                  onChange={(value) => updateCanvas({ fps: Number(value) })}
                  options={FPS_OPTIONS.map((fps) => ({ value: String(fps), label: `${fps} fps` }))}
                />
              </PanelRow>

              <PanelRow label="Duration">
                <NumericField
                  label="s"
                  value={canvas.duration}
                  min={MIN_DURATION}
                  max={MAX_DURATION}
                  step={0.1}
                  decimals={2}
                  onChange={applyDuration}
                />
              </PanelRow>
            </div>

            <div className="mt-3 space-y-2.5 border-t border-line pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-ink">Work area</p>
                  <p className="text-[10px] text-ink-subtle">In and out points for preview and export.</p>
                </div>
                <Switch
                  aria-label="Use a work area"
                  checked={workAreaOn}
                  onCheckedChange={(checked) =>
                    setWorkArea(
                      checked
                        ? { in: area.in, out: area.out, enabled: true }
                        : canvas.workArea
                          ? { ...canvas.workArea, enabled: false }
                          : null,
                    )
                  }
                />
              </div>

              {workAreaOn ? (
                <PanelRow label="In / Out">
                  <NumericField
                    label="in"
                    value={area.in}
                    min={0}
                    max={Math.max(0, area.out - 0.1)}
                    step={0.1}
                    decimals={2}
                    onChange={(value) => setWorkArea({ in: value, out: area.out, enabled: true })}
                  />
                  <NumericField
                    label="out"
                    value={area.out}
                    min={Math.min(canvas.duration, area.in + 0.1)}
                    max={canvas.duration}
                    step={0.1}
                    decimals={2}
                    onChange={(value) => setWorkArea({ in: area.in, out: value, enabled: true })}
                  />
                </PanelRow>
              ) : null}
            </div>

            <Popover.Arrow className="fill-[var(--color-line-strong)]" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <ConfirmDialog
        open={pendingCrop !== null}
        onOpenChange={(open) => !open && setPendingCrop(null)}
        tone="danger"
        title={`Crop animation to ${pendingCrop?.duration.toFixed(2) ?? ""}s?`}
        description={
          pendingCrop
            ? `${pendingCrop.count} keyframe${pendingCrop.count === 1 ? "" : "s"} sit${
                pendingCrop.count === 1 ? "s" : ""
              } past ${pendingCrop.duration.toFixed(2)}s. Cropping deletes ${
                pendingCrop.count === 1 ? "it" : "them"
              }. You can also shorten the composition and keep the animation — the keyframes stay, they simply play past the end. One undo takes a crop back either way.`
            : ""
        }
        confirmLabel="Crop"
        cancelLabel="Keep animation"
        onConfirm={() => {
          if (!pendingCrop) return;
          const removed = cropAnimation(pendingCrop.duration);
          commitDuration(pendingCrop.duration);
          setPendingCrop(null);
          notify.success(
            `Cropped to ${pendingCrop.duration.toFixed(2)}s`,
            `${removed} keyframe${removed === 1 ? "" : "s"} removed. Ctrl+Z undoes it.`,
          );
        }}
        // Cancelling still shortens the composition; it just leaves the
        // keyframes alone. "Cancel" here means "do not delete my work", not
        // "do not change the duration I just typed".
        onCancel={() => {
          if (!pendingCrop) return;
          commitDuration(pendingCrop.duration);
          setPendingCrop(null);
          notify.info(
            `Shortened to ${pendingCrop.duration.toFixed(2)}s`,
            "Keyframes past the end were kept.",
          );
        }}
      />
    </>
  );
}
