"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

interface PanelSectionProps {
  title: string;
  /** Rendered on the right of the header, e.g. a reset button. */
  actions?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Collapsible section used throughout the right-hand inspector. */
export function PanelSection({
  title,
  actions,
  defaultOpen = true,
  children,
  className,
}: PanelSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const contentId = React.useId();

  return (
    <section className={cn("border-b border-line", className)}>
      <div className="flex h-9 items-center justify-between gap-2 pr-2 pl-1">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex h-full flex-1 items-center gap-1 rounded-sm px-1 text-left transition-colors hover:text-ink"
        >
          <ChevronDown
            className={cn(
              "h-3 w-3 text-ink-subtle transition-transform duration-200",
              !open && "-rotate-90",
            )}
          />
          <span className="panel-label">{title}</span>
        </button>
        {actions}
      </div>
      <div id={contentId} hidden={!open} className="space-y-3 px-3 pt-0.5 pb-4">
        {children}
      </div>
    </section>
  );
}

interface PanelRowProps {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  /** Slot to the left of the label, used by the keyframe toggle. */
  leading?: React.ReactNode;
  className?: string;
}

export function PanelRow({ label, htmlFor, leading, children, className }: PanelRowProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {leading}
      <label
        htmlFor={htmlFor}
        className="w-[68px] shrink-0 truncate text-[11px] text-ink-muted"
        title={label}
      >
        {label}
      </label>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      {Icon ? (
        <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-md border border-line bg-surface-raised">
          <Icon className="h-4 w-4 text-ink-subtle" />
        </span>
      ) : null}
      <p className="text-[12px] font-medium text-ink">{title}</p>
      <p className="max-w-[220px] text-[11px] leading-relaxed text-ink-subtle">{description}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
