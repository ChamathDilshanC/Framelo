"use client";

import { Heart, Play, Repeat, Square } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { MOTION_CATEGORY_LABELS, type MotionPresetDefinition } from "@/engine/motion/preset-types";
import { cn } from "@/lib/utils";

interface MotionPresetCardProps {
  preset: MotionPresetDefinition;
  selected: boolean;
  favorite: boolean;
  previewing: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onStopPreview: () => void;
  onApply: () => void;
  onToggleFavorite: () => void;
  children?: React.ReactNode;
}

/**
 * One preset in the library.
 *
 * Compact by default — the sidebar is 256px and has to hold thirty of these —
 * and expands into its parameters only when selected. The preview sparkline is
 * an SVG drawn from the preset's own keyframes, so it costs nothing and stays
 * truthful: there is no 3D scene per card.
 */
export const MotionPresetCard = React.memo(function MotionPresetCard({
  preset,
  selected,
  favorite,
  previewing,
  onSelect,
  onPreview,
  onStopPreview,
  onApply,
  onToggleFavorite,
  children,
}: MotionPresetCardProps) {
  return (
    <div
      className={cn(
        "group rounded-md border transition-colors duration-150",
        selected
          ? "border-accent/60 bg-accent-soft"
          : "border-line bg-surface-raised hover:border-line-strong",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={selected}
        className="flex w-full items-start gap-2.5 p-2.5 text-left"
      >
        <MotionGlyph preset={preset} active={selected || previewing} />

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">
              {preset.name}
            </span>
            {preset.loop ? (
              <Repeat className="h-2.5 w-2.5 shrink-0 text-ink-subtle" aria-label="Loops" />
            ) : null}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-ink-subtle">
            {preset.description}
          </span>
          <span className="mt-1 flex items-center gap-1.5">
            <span className="numeric text-[10px] text-ink-subtle">{preset.duration}s</span>
            <span className="text-[10px] text-ink-subtle/60">·</span>
            <span className="text-[10px] text-ink-subtle">
              {MOTION_CATEGORY_LABELS[preset.category]}
            </span>
          </span>
        </span>

        <span
          role="button"
          tabIndex={0}
          aria-label={favorite ? `Unfavourite ${preset.name}` : `Favourite ${preset.name}`}
          aria-pressed={favorite}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite();
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            event.stopPropagation();
            onToggleFavorite();
          }}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-sm transition-opacity hover:bg-surface-hover",
            favorite ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          )}
        >
          <Heart
            className={cn("h-3 w-3", favorite ? "fill-accent text-accent" : "text-ink-subtle")}
          />
        </span>
      </button>

      {selected ? (
        <div className="space-y-2.5 border-t border-line/70 px-2.5 pt-2.5 pb-2.5">
          {children}

          <div className="flex gap-1.5">
            <Button
              size="xs"
              variant="secondary"
              className="flex-1"
              onClick={previewing ? onStopPreview : onPreview}
            >
              {previewing ? (
                <>
                  <Square className="h-3 w-3" /> Stop
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" /> Preview
                </>
              )}
            </Button>
            <Button size="xs" variant="primary" className="flex-1" onClick={onApply}>
              Apply
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
});

/**
 * A sparkline of the preset's dominant track.
 *
 * Drawn straight from the preset's own keyframe data, so it always matches
 * what the preset does. Thirty of these are thirty tiny SVG paths — the
 * alternative, a 3D scene per card, would mean thirty WebGL contexts and
 * thirty device models to show a thumbnail.
 */
function MotionGlyph({
  preset,
  active,
}: {
  preset: MotionPresetDefinition;
  active: boolean;
}) {
  const path = React.useMemo(() => buildSparkline(preset), [preset]);

  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border transition-colors",
        active ? "border-accent/40 bg-accent/10" : "border-line bg-canvas",
      )}
    >
      <svg viewBox="0 0 32 20" className="h-5 w-8" aria-hidden>
        <path
          d={path}
          fill="none"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={active ? "stroke-accent" : "stroke-ink-subtle"}
        />
      </svg>
    </span>
  );
}

/** The track with the most keyframes is the one that characterises the motion. */
function buildSparkline(preset: MotionPresetDefinition): string {
  const specs = Object.values(preset.tracks)
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry?.length))
    .sort((a, b) => b.length - a.length)[0];

  if (!specs || specs.length < 2) return "M 2 10 L 30 10";

  const values = specs.map((spec) => spec.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  return specs
    .map((spec, index) => {
      const x = 2 + spec.at * 28;
      // Inverted: a rising value should draw upwards.
      const y = 17 - ((spec.value - min) / range) * 14;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}
