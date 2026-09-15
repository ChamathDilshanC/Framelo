"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
}

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      {...props}
      className={cn(
        "relative h-[18px] w-8 shrink-0 cursor-pointer rounded-full border border-line bg-surface-hover transition-colors duration-150",
        "data-[state=checked]:border-accent/50 data-[state=checked]:bg-accent/80",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
    >
      <SwitchPrimitive.Thumb className="block h-3 w-3 translate-x-[3px] rounded-full bg-ink shadow-sm transition-transform duration-150 data-[state=checked]:translate-x-[17px]" />
    </SwitchPrimitive.Root>
  );
}
