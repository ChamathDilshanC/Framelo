"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  "aria-label": string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  disabled,
  className,
  size = "sm",
  ...props
}: SelectProps<T>) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={(next) => onChange(next as T)} disabled={disabled}>
      <SelectPrimitive.Trigger
        aria-label={props["aria-label"]}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-sm border border-line bg-surface-raised px-2 text-ink transition-colors hover:border-line-strong data-[placeholder]:text-ink-subtle",
          size === "sm" ? "h-7 text-[12px]" : "h-8 text-[13px]",
          disabled && "pointer-events-none opacity-40",
          className,
        )}
      >
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-3 w-3 text-ink-subtle" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className="z-[80] min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-line-strong bg-surface-raised p-1 shadow-xl shadow-black/50"
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xs px-2 py-1.5 text-[12px] text-ink-muted outline-none select-none data-[highlighted]:bg-surface-hover data-[highlighted]:text-ink data-[state=checked]:text-ink"
              >
                <span className="flex items-baseline gap-2">
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  {option.hint ? <span className="numeric text-ink-subtle">{option.hint}</span> : null}
                </span>
                <SelectPrimitive.ItemIndicator>
                  <Check className="h-3 w-3 text-accent" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
