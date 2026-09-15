"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "@/lib/utils";

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  onCommit?: (value: number) => void;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  "aria-label": string;
  className?: string;
}

export function Slider({
  value,
  onChange,
  onCommit,
  min,
  max,
  step,
  disabled,
  className,
  ...props
}: SliderProps) {
  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex h-4 w-full touch-none items-center select-none",
        disabled && "pointer-events-none opacity-40",
        className,
      )}
      value={[value]}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={([next]) => onChange(next)}
      onValueCommit={([next]) => onCommit?.(next)}
      aria-label={props["aria-label"]}
    >
      <SliderPrimitive.Track className="relative h-[3px] w-full grow overflow-hidden rounded-full bg-line">
        <SliderPrimitive.Range className="absolute h-full bg-accent/70" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-3 w-3 rounded-full border border-line-strong bg-ink shadow-sm transition-transform duration-100 hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" />
    </SliderPrimitive.Root>
  );
}
