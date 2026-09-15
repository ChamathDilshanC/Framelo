"use client";

import { Play, Square, Star } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DEVICE_MOTION_CATEGORY_LABELS,
  MOTION_ORIGIN_LABELS,
  type DeviceMotionTemplate,
  type MotionOrigin,
} from "@/engine/templates/device-motion-templates";
import { cn } from "@/lib/utils";

/**
 * One device motion template.
 *
 * The thumbnail is a diagram, not a rendered frame. That is a deliberate
 * choice: a real preview would mean fifteen WebGL contexts in a sidebar, and a
 * pre-rendered GIF per template would be a pile of binaries that silently rot
 * the moment a choreography is retuned. The diagram is generated from the
 * template's own `origin`, so it cannot disagree with the motion — and what it
 * shows, where the device comes from, is the thing someone is actually scanning
 * the list for.
 *
 * Preview plays the real thing. Apply writes it.
 */
export function DeviceMotionCard({
  template,
  selected,
  favorite,
  previewing,
  applied,
  onSelect,
  onPreview,
  onStopPreview,
  onApply,
  onToggleFavorite,
}: {
  template: DeviceMotionTemplate;
  selected: boolean;
  favorite: boolean;
  previewing: boolean;
  /** This template built the composition currently open. */
  applied: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onStopPreview: () => void;
  onApply: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border transition-colors duration-150",
        selected
          ? "border-accent/60 bg-accent-soft/40"
          : "border-line bg-surface-raised hover:border-line-strong",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-expanded={selected}
        className="flex w-full items-start gap-2.5 p-2 text-left"
      >
        <OriginDiagram origin={template.origin} active={previewing} />

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">
              {template.name}
            </span>
            {applied ? (
              <span className="shrink-0 rounded-[2px] bg-accent-soft px-1 text-[9px] text-accent">
                Applied
              </span>
            ) : null}
          </span>

          <span className="mt-0.5 line-clamp-2 block text-[10px] leading-snug text-ink-subtle">
            {template.description}
          </span>

          <span className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="text-[9px] text-ink-subtle">
              {DEVICE_MOTION_CATEGORY_LABELS[template.category]}
            </span>
            <Dot />
            <span className="numeric text-[9px] text-ink-subtle">{template.duration}s</span>
            <Dot />
            <span className="truncate text-[9px] text-ink-subtle">
              {MOTION_ORIGIN_LABELS[template.origin]}
            </span>
          </span>
        </span>

        {/* A span rather than a button: this sits inside the card's own button,
            and nesting two would be invalid markup that no screen reader can
            make sense of. Keyboard behaviour is restored explicitly. */}
        <span
          role="button"
          tabIndex={0}
          aria-label={favorite ? `Unfavourite ${template.name}` : `Favourite ${template.name}`}
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
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-surface-hover"
        >
          <Star
            className={cn("h-3 w-3", favorite ? "fill-accent text-accent" : "text-ink-subtle")}
          />
        </span>
      </button>

      {selected ? (
        <div className="space-y-2 border-t border-line px-2 pt-2 pb-2">
          <div className="flex flex-wrap gap-1">
            {template.easing.map((name) => (
              <span
                key={name}
                className="rounded-full border border-line px-1.5 py-px text-[9px] text-ink-subtle"
              >
                {name}
              </span>
            ))}
          </div>

          <p className="text-[10px] leading-relaxed text-ink-subtle">
            Sets the device pose and its {Object.keys(template.tracks).length} animated properties,
            and makes the composition {template.duration}s.
            {template.background ? " Brings its own background." : ""}
            {template.text?.length ? ` Brings ${template.text.length} text layer(s).` : ""}
          </p>

          <div className="flex gap-1.5">
            <Button
              size="xs"
              variant="secondary"
              className="flex-1"
              onClick={previewing ? onStopPreview : onPreview}
            >
              {previewing ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {previewing ? "Stop" : "Preview"}
            </Button>
            <Button size="xs" variant="primary" className="flex-1" onClick={onApply}>
              Apply
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Dot() {
  return <span className="text-[9px] text-ink-subtle/50">·</span>;
}

/**
 * Where the movement comes from, as a 40px diagram.
 *
 * A rectangle for the device and an arrow for the travel. Generated from
 * `origin`, so it is the one part of the card that cannot drift out of sync
 * with the animation it describes.
 */
function OriginDiagram({ origin, active }: { origin: MotionOrigin; active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border transition-colors",
        active ? "border-accent/60 bg-accent-soft" : "border-line bg-surface",
      )}
    >
      <svg viewBox="0 0 40 40" className="h-full w-full">
        {/* The device at rest, always in the middle. */}
        <rect
          x={16}
          y={12}
          width={8}
          height={16}
          rx={2}
          className={cn(active ? "fill-accent/70" : "fill-ink-subtle/45")}
        />
        <g
          className={cn(active ? "stroke-accent" : "stroke-ink-subtle/70")}
          strokeWidth={1.4}
          strokeLinecap="round"
          fill="none"
        >
          {arrowFor(origin)}
        </g>
      </svg>
    </span>
  );
}

function arrowFor(origin: MotionOrigin): React.ReactNode {
  switch (origin) {
    case "top":
      return (
        <>
          <line x1={20} y1={3} x2={20} y2={9} />
          <path d="M17 6.5 L20 9.5 L23 6.5" />
        </>
      );
    case "bottom":
      return (
        <>
          <line x1={20} y1={37} x2={20} y2={31} />
          <path d="M17 33.5 L20 30.5 L23 33.5" />
        </>
      );
    case "left":
      return (
        <>
          <line x1={3} y1={20} x2={11} y2={20} />
          <path d="M8 17 L11.5 20 L8 23" />
        </>
      );
    case "right":
      return (
        <>
          <line x1={37} y1={20} x2={29} y2={20} />
          <path d="M32 17 L28.5 20 L32 23" />
        </>
      );
    case "diagonal":
      return (
        <>
          <line x1={5} y1={35} x2={13} y2={27} />
          <path d="M13 31 L13.5 26.5 L9 27" />
        </>
      );
    case "outward":
      // Growing from the centre: four short strokes pushing away from it.
      return (
        <>
          <line x1={13} y1={8} x2={9} y2={4} />
          <line x1={27} y1={8} x2={31} y2={4} />
          <line x1={13} y1={32} x2={9} y2={36} />
          <line x1={27} y1={32} x2={31} y2={36} />
        </>
      );
    case "rotation":
      return (
        <>
          <path d="M11 13 A12 12 0 0 1 29 13" />
          <path d="M26 10 L29.5 13 L26.5 16.5" />
        </>
      );
    case "depth-push":
      // Concentric: something coming toward the viewer gets larger.
      return (
        <>
          <rect x={12} y={7} width={16} height={26} rx={3} strokeDasharray="2 2" />
          <path d="M31 20 L35 20" />
          <path d="M33 18 L35.5 20 L33 22" />
        </>
      );
    case "depth-pull":
      return (
        <>
          <rect x={14.5} y={15} width={11} height={10} rx={2} strokeDasharray="2 2" />
          <path d="M35 20 L31 20" />
          <path d="M33 18 L30.5 20 L33 22" />
        </>
      );
    case "orbit":
      return (
        <>
          <ellipse cx={20} cy={20} rx={16} ry={7} strokeDasharray="3 2.5" />
          <path d="M33 16.5 L36.5 19 L33 21.5" />
        </>
      );
    default:
      return null;
  }
}
