"use client";

import * as React from "react";

import { sampleNamedEasing } from "@/engine/motion/easing";
import { cn } from "@/lib/utils";
import { EASING_LABELS, EASING_TYPES, type EasingType } from "@/types/animation";

/**
 * The easing editor.
 *
 * Framelo stores easing by *name*, not as four bezier control points, and that
 * is a deliberate constraint rather than a limitation to work around: a named
 * curve means a project file written today still eases correctly when the
 * implementation of "smooth" is improved, and it means the motion library, the
 * evaluator and this editor cannot disagree about what a curve is.
 *
 * So this is a chooser with an honest preview, not a bezier rig. The curve
 * drawn is sampled from the real easing function the evaluator will use —
 * `sampleNamedEasing` calls straight into `@/engine/easing` — so what is shown
 * is what will play. A hand-drawn approximation of each curve would look the
 * same and be a lie.
 *
 * Overshoot curves are drawn beyond the box on purpose. `back`, `elastic` and
 * `spring` genuinely leave the 0–1 range, and flattening them into the frame
 * would hide the single thing that makes them worth choosing.
 */

const SAMPLES = 48;
/** Head-room above and below the unit box, for curves that overshoot. */
const PADDING = 0.34;

interface EasingEditorProps {
  /** The current curve, or null when a multi-selection disagrees. */
  value: EasingType | null;
  onChange: (easing: EasingType) => void;
  /** How many keyframes the change will land on. */
  count: number;
  className?: string;
}

export function EasingEditor({ value, onChange, count, className }: EasingEditorProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="panel-label">Easing</span>
        <span className="numeric text-ink-subtle">
          {value ? EASING_LABELS[value] : "Mixed"}
          {count > 1 ? ` · ${count} keys` : ""}
        </span>
      </div>

      <EasingCurve easing={value} />

      <div className="grid grid-cols-3 gap-1">
        {EASING_TYPES.map((easing) => (
          <button
            key={easing}
            type="button"
            aria-pressed={value === easing}
            onClick={() => onChange(easing)}
            title={EASING_LABELS[easing]}
            className={cn(
              "flex items-center gap-1.5 rounded-xs border px-1.5 py-1 text-[10px] transition-colors duration-150",
              value === easing
                ? "border-accent/60 bg-accent-soft text-ink"
                : "border-line bg-surface-raised text-ink-subtle hover:border-line-strong hover:text-ink",
            )}
          >
            <CurveGlyph easing={easing} />
            <span className="truncate">{shortLabel(easing)}</span>
          </button>
        ))}
      </div>

      <p className="text-[10px] leading-relaxed text-ink-subtle">
        The curve shown is sampled from the function the renderer uses, so the preview and the
        export cannot disagree. Springs are baked into keyframes when a motion preset applies
        one — see the preset&apos;s spring control.
      </p>
    </div>
  );
}

/** Drop the bracketed family hint; the tooltip still carries the full name. */
function shortLabel(easing: EasingType): string {
  return EASING_LABELS[easing].replace(/\s*\(.*\)$/, "");
}

/** The curve, at a readable size, with its own axes. */
function EasingCurve({ easing }: { easing: EasingType | null }) {
  const path = React.useMemo(() => (easing ? curvePath(easing, 120, 64) : null), [easing]);

  return (
    <div className="relative h-[64px] overflow-hidden rounded-sm border border-line bg-surface-raised">
      <svg viewBox="0 0 120 64" className="h-full w-full" aria-hidden preserveAspectRatio="none">
        {/* The unit box: where the value is 0 and where it is 1. Without these
            an overshoot is just a wiggle with nothing to overshoot. */}
        <line
          x1={0}
          x2={120}
          y1={valueToY(1, 64)}
          y2={valueToY(1, 64)}
          className="stroke-line-strong"
          strokeDasharray="2 3"
          strokeWidth={1}
        />
        <line
          x1={0}
          x2={120}
          y1={valueToY(0, 64)}
          y2={valueToY(0, 64)}
          className="stroke-line-strong"
          strokeDasharray="2 3"
          strokeWidth={1}
        />

        {path ? (
          <path
            d={path}
            fill="none"
            className="stroke-accent"
            strokeWidth={1.75}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ) : null}
      </svg>

      {!easing ? (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-ink-subtle">
          These keyframes use different curves
        </span>
      ) : null}
    </div>
  );
}

/** A thumbnail of the same curve, for the chips. */
function CurveGlyph({ easing }: { easing: EasingType }) {
  const path = React.useMemo(() => curvePath(easing, 14, 10), [easing]);

  return (
    <svg viewBox="0 0 14 10" className="h-2.5 w-3.5 shrink-0" aria-hidden preserveAspectRatio="none">
      <path d={path} fill="none" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" />
    </svg>
  );
}

function valueToY(value: number, height: number): number {
  // Flip: SVG grows downward, a value grows upward.
  return height - ((value + PADDING) / (1 + PADDING * 2)) * height;
}

function curvePath(easing: EasingType, width: number, height: number): string {
  const samples = sampleNamedEasing(easing, SAMPLES);

  return samples
    .map((value, index) => {
      const x = (index / (samples.length - 1)) * width;
      const y = valueToY(value, height);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}
