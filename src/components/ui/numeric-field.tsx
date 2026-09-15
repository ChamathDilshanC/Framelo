"use client";

import * as React from "react";

import { clamp, cn, roundTo } from "@/lib/utils";

interface NumericFieldProps {
  value: number;
  onChange: (value: number) => void;
  /** Called once when a drag/typing interaction finishes — used to close history entries. */
  onCommit?: () => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
  suffix?: string;
  label: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Numeric input with a scrub handle: drag the label horizontally to change the
 * value, or type an exact number. Mirrors how pro editors expose transforms.
 */
export function NumericField({
  value,
  onChange,
  onCommit,
  min = -Infinity,
  max = Infinity,
  step = 0.01,
  decimals = 2,
  suffix,
  label,
  disabled,
  className,
}: NumericFieldProps) {
  const [draft, setDraft] = React.useState<string | null>(null);
  const dragState = React.useRef<{ startX: number; startValue: number } | null>(null);

  const display = draft ?? formatValue(value, decimals);

  function commitDraft(next: string) {
    const parsed = Number.parseFloat(next.replace(",", "."));
    if (!Number.isNaN(parsed)) onChange(clamp(roundTo(parsed, decimals), min, max));
    setDraft(null);
    onCommit?.();
  }

  function handlePointerDown(event: React.PointerEvent<HTMLSpanElement>) {
    if (disabled) return;
    event.preventDefault();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    dragState.current = { startX: event.clientX, startValue: value };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLSpanElement>) {
    const state = dragState.current;
    if (!state) return;
    const delta = event.clientX - state.startX;
    const multiplier = event.shiftKey ? 0.2 : 1;
    const next = state.startValue + delta * step * 2 * multiplier;
    onChange(clamp(roundTo(next, decimals), min, max));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLSpanElement>) {
    if (!dragState.current) return;
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    dragState.current = null;
    onCommit?.();
  }

  return (
    <div
      className={cn(
        "group flex h-7 items-center rounded-sm border border-line bg-surface-raised transition-colors focus-within:border-accent/60 hover:border-line-strong",
        disabled && "opacity-40",
        className,
      )}
    >
      <span
        role="presentation"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="numeric flex h-full w-[18px] shrink-0 cursor-ew-resize items-center justify-center rounded-l-sm text-ink-subtle transition-colors select-none hover:bg-surface-hover hover:text-ink-muted"
        title={`Drag to adjust ${label}`}
      >
        {label}
      </span>
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        disabled={disabled}
        value={display}
        onChange={(event) => setDraft(event.target.value)}
        onFocus={(event) => event.currentTarget.select()}
        onBlur={(event) => commitDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitDraft((event.target as HTMLInputElement).value);
            (event.target as HTMLInputElement).blur();
          }
          if (event.key === "Escape") {
            setDraft(null);
            (event.target as HTMLInputElement).blur();
          }
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            const direction = event.key === "ArrowUp" ? 1 : -1;
            const magnitude = event.shiftKey ? step * 10 : step;
            onChange(clamp(roundTo(value + direction * magnitude, decimals), min, max));
            onCommit?.();
          }
        }}
        className="numeric h-full w-full min-w-0 bg-transparent pr-1 pl-0.5 text-ink outline-none"
      />
      {suffix ? <span className="numeric pr-1 text-ink-subtle">{suffix}</span> : null}
    </div>
  );
}

function formatValue(value: number, decimals: number): string {
  if (!Number.isFinite(value)) return "0";
  const rounded = roundTo(value, decimals);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(decimals).replace(/0+$/, "");
}
