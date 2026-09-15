"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface ColorFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
}

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * How often a drag inside the colour picker is allowed to reach the store.
 *
 * A native colour input reports every pointer move, and each report used to
 * become a project commit: a history entry, a React pass over the editor and —
 * for a text layer — a full canvas redraw and texture upload.
 *
 * 80ms is about twelve updates a second: fast enough that the canvas follows
 * the cursor, slow enough that it has time to finish each one.
 */
const COMMIT_INTERVAL_MS = 80;

/**
 * A colour input that stays responsive while it is being dragged.
 *
 * Two separate costs had to go. The throttle below stops every pointer move
 * becoming a project commit. Just as important, the *preview* is written
 * straight to the DOM rather than held in React state — a `useState` here
 * re-rendered the whole inspector on every one of those moves, which on its own
 * cost more than the commits did.
 *
 * So the swatch and the hex readout are uncontrolled while a drag is in
 * flight, and they are resynchronised from the prop as soon as it ends.
 */
export function ColorField({ value, onChange, label, className }: ColorFieldProps) {
  const pickerRef = React.useRef<HTMLInputElement>(null);
  const swatchRef = React.useRef<HTMLSpanElement>(null);
  const hexRef = React.useRef<HTMLInputElement>(null);

  const dragging = React.useRef(false);
  const pending = React.useRef<string | null>(null);
  const timer = React.useRef(0);
  const lastCommit = React.useRef(0);

  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  });

  /** Paint the controls without going through React. */
  const paint = React.useCallback((next: string) => {
    if (swatchRef.current) swatchRef.current.style.backgroundColor = next;
    if (hexRef.current && document.activeElement !== hexRef.current) {
      hexRef.current.value = next.toUpperCase();
    }
  }, []);

  // Follow the prop whenever the value changes from anywhere other than an
  // in-flight drag — undo, a style preset, another panel.
  React.useEffect(() => {
    if (dragging.current) return;
    if (pickerRef.current) pickerRef.current.value = value;
    paint(value);
  }, [value, paint]);

  const flush = React.useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = 0;
    const next = pending.current;
    pending.current = null;
    if (next === null) return;
    lastCommit.current = Date.now();
    onChangeRef.current(next);
  }, []);

  React.useEffect(() => () => window.clearTimeout(timer.current), []);

  /**
   * Throttled, with a guaranteed trailing commit.
   *
   * The trailing edge is the part that matters: without it, releasing the
   * pointer inside the throttle window would leave the chosen colour on screen
   * but never written to the project.
   */
  function handlePick(next: string) {
    dragging.current = true;
    paint(next);
    pending.current = next;

    const elapsed = Date.now() - lastCommit.current;
    if (elapsed >= COMMIT_INTERVAL_MS) {
      flush();
      return;
    }
    if (timer.current) return;
    timer.current = window.setTimeout(flush, COMMIT_INTERVAL_MS - elapsed);
  }

  function endDrag() {
    flush();
    dragging.current = false;
  }

  function commitHex(next: string) {
    const candidate = next.startsWith("#") ? next : `#${next}`;
    if (HEX_PATTERN.test(candidate)) {
      onChange(candidate.toLowerCase());
    } else if (hexRef.current) {
      // Not a colour: put the real value back rather than leaving the field
      // showing something that was never applied.
      hexRef.current.value = value.toUpperCase();
    }
  }

  return (
    <div
      className={cn(
        "flex h-7 items-center gap-2 rounded-sm border border-line bg-surface-raised pr-2 pl-1 transition-colors focus-within:border-accent/60 hover:border-line-strong",
        className,
      )}
    >
      <label className="relative h-5 w-5 shrink-0 cursor-pointer overflow-hidden rounded-xs border border-line-strong">
        <span
          ref={swatchRef}
          className="absolute inset-0"
          style={{ backgroundColor: value }}
          aria-hidden
        />
        <input
          ref={pickerRef}
          type="color"
          aria-label={label}
          // Uncontrolled on purpose: a controlled value fights the native
          // picker while it is open, and the effect above keeps it in step.
          defaultValue={value}
          onChange={(event) => handlePick(event.target.value)}
          onBlur={endDrag}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <input
        ref={hexRef}
        type="text"
        aria-label={`${label} hex value`}
        defaultValue={value.toUpperCase()}
        onBlur={(event) => commitHex(event.target.value)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") (event.target as HTMLInputElement).blur();
          if (event.key === "Escape") {
            (event.target as HTMLInputElement).value = value.toUpperCase();
            (event.target as HTMLInputElement).blur();
          }
        }}
        className="numeric w-full min-w-0 bg-transparent text-ink uppercase outline-none"
      />
    </div>
  );
}
