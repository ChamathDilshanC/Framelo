"use client";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  "aria-label": string;
  className?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  ...props
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={props["aria-label"]}
      className={cn("flex gap-0.5 rounded-sm border border-line bg-surface-raised p-0.5", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-6 flex-1 items-center justify-center gap-1.5 rounded-xs px-2 text-[11px] font-medium transition-colors duration-150",
              active
                ? "bg-surface-active text-ink"
                : "text-ink-subtle hover:bg-surface-hover hover:text-ink-muted",
            )}
          >
            {Icon ? <Icon className="h-3 w-3" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
