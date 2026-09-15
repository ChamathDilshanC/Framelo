"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

import { cn } from "@/lib/utils";

export const TooltipProvider = TooltipPrimitive.Provider;

interface TooltipProps {
  label: React.ReactNode;
  /** Rendered in a dimmer type style, e.g. a keyboard shortcut. */
  shortcut?: string;
  side?: TooltipPrimitive.TooltipContentProps["side"];
  align?: TooltipPrimitive.TooltipContentProps["align"];
  children: React.ReactElement;
  disabled?: boolean;
}

export function Tooltip({
  label,
  shortcut,
  side = "bottom",
  align = "center",
  disabled,
  children,
}: TooltipProps) {
  if (disabled) return children;

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={8}
          className={cn(
            "z-[70] flex items-center gap-2 rounded-md border border-line-strong bg-surface-raised px-2 py-1 text-[11px] text-ink shadow-lg shadow-black/40",
            "origin-(--radix-tooltip-content-transform-origin) animate-fade-up",
          )}
        >
          <span>{label}</span>
          {shortcut ? (
            <kbd className="numeric rounded-xs border border-line bg-canvas px-1 py-px text-ink-subtle">
              {shortcut}
            </kbd>
          ) : null}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
