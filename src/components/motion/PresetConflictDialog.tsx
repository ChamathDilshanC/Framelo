"use client";

import { AlertTriangle, Clock } from "lucide-react";
import * as React from "react";

import type { PendingApply } from "@/components/motion/MotionPresetBrowser";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { DurationStrategy } from "@/engine/motion/preset-generator";
import { PROPERTY_LABELS } from "@/types/animation";

interface PresetConflictDialogProps {
  pending: PendingApply | null;
  onCancel: () => void;
  onConfirm: (strategy: DurationStrategy) => void;
}

/**
 * Asked before a preset overwrites work or changes the composition length.
 *
 * Both of these are things a person would be annoyed to discover afterwards:
 * losing a rotation they hand-keyed, or finding their five-second composition
 * silently became twelve. Neither is dangerous enough to block, so this
 * explains and offers the choice rather than refusing.
 */
export function PresetConflictDialog({
  pending,
  onCancel,
  onConfirm,
}: PresetConflictDialogProps) {
  if (!pending) return null;

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        title={`Apply ${pending.preset.name}?`}
        description="Here's what will change."
        style={{ ["--dialog-width" as string]: "460px" }}
      >
        {/* Keyed by preset, so each one opens on the default strategy rather
            than inheriting the last preset's choice. */}
        <ConflictBody
          key={pending.preset.id}
          pending={pending}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}

function ConflictBody({
  pending,
  onCancel,
  onConfirm,
}: {
  pending: PendingApply;
  onCancel: () => void;
  onConfirm: (strategy: DurationStrategy) => void;
}) {
  const [strategy, setStrategy] = React.useState<DurationStrategy>("fit");
  const { preset, conflicts, plan } = pending;

  return (
    <>
        <div className="space-y-4 px-5 py-4">
          {conflicts.length > 0 ? (
            <section className="space-y-1.5">
              <h3 className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                <AlertTriangle className="h-3.5 w-3.5 text-caution" />
                Existing animation found
              </h3>
              <p className="text-[11px] leading-relaxed text-ink-muted">
                {conflicts.length === 1
                  ? `${PROPERTY_LABELS[conflicts[0]]} already has keyframes and will be replaced.`
                  : `${conflicts
                      .map((property) => PROPERTY_LABELS[property])
                      .join(", ")} already have keyframes and will be replaced.`}
              </p>
              <p className="text-[10px] leading-relaxed text-ink-subtle">
                Every other track is left untouched, so presets stack. One undo takes all of this
                back.
              </p>
            </section>
          ) : null}

          {plan.conflict ? (
            <section className="space-y-2">
              <h3 className="flex items-center gap-1.5 text-[12px] font-medium text-ink">
                <Clock className="h-3.5 w-3.5 text-caution" />
                Longer than the composition
              </h3>
              <p className="text-[11px] leading-relaxed text-ink-muted">
                {preset.name} is {plan.presetDuration}s but the project is {plan.projectDuration}s.
              </p>

              <div className="grid grid-cols-2 gap-1.5">
                <StrategyOption
                  active={strategy === "fit"}
                  title="Fit preset"
                  detail={`Compress into ${plan.projectDuration}s`}
                  onSelect={() => setStrategy("fit")}
                />
                <StrategyOption
                  active={strategy === "extend"}
                  title="Extend project"
                  detail={`Grow to ${plan.presetDuration}s`}
                  onSelect={() => setStrategy("extend")}
                />
              </div>

              <p className="text-[10px] leading-relaxed text-ink-subtle">
                Fitting keeps every keyframe&apos;s relative position, so the motion looks the same,
                just faster.
              </p>
            </section>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface-raised/40 px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={() => onConfirm(strategy)}>
            Apply preset
          </Button>
        </footer>
    </>
  );
}

function StrategyOption({
  active,
  title,
  detail,
  onSelect,
}: {
  active: boolean;
  title: string;
  detail: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={
        active
          ? "rounded-sm border border-accent/60 bg-accent-soft px-2.5 py-2 text-left"
          : "rounded-sm border border-line bg-surface-raised px-2.5 py-2 text-left hover:border-line-strong"
      }
    >
      <span className="block text-[12px] font-medium text-ink">{title}</span>
      <span className="mt-0.5 block text-[10px] text-ink-subtle">{detail}</span>
    </button>
  );
}
