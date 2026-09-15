"use client";

import * as React from "react";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only controls must always carry an accessible name. */
  label: string;
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  active?: boolean;
  tone?: "default" | "accent" | "danger";
  size?: "sm" | "md";
  tooltipSide?: "top" | "bottom" | "left" | "right";
  showTooltip?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    shortcut,
    icon: Icon,
    active,
    tone = "default",
    size = "md",
    tooltipSide = "bottom",
    showTooltip = true,
    className,
    ...props
  },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm transition-colors duration-150 disabled:pointer-events-none disabled:opacity-30",
        size === "sm" ? "h-6 w-6" : "h-7 w-7",
        tone === "danger"
          ? "text-ink-subtle hover:bg-danger/15 hover:text-danger"
          : active
            ? "bg-accent-soft text-accent"
            : "text-ink-muted hover:bg-surface-hover hover:text-ink",
        tone === "accent" && !active && "text-accent hover:bg-accent-soft",
        className,
      )}
      {...props}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
    </button>
  );

  if (!showTooltip) return button;

  return (
    <Tooltip label={label} shortcut={shortcut} side={tooltipSide}>
      {button}
    </Tooltip>
  );
});
