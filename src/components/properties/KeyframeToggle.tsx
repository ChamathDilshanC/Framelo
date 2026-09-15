"use client";

import { Diamond } from "lucide-react";

import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type KeyframeToggleState = "none" | "animated" | "keyed";

interface KeyframeToggleProps {
  state: KeyframeToggleState;
  propertyLabel: string;
  onToggle: () => void;
}

const COPY: Record<KeyframeToggleState, string> = {
  none: "Add keyframe",
  animated: "Add keyframe at playhead",
  keyed: "Remove keyframe at playhead",
};

/**
 * The diamond next to each animatable property.
 * Hollow = track exists, filled = a keyframe sits on the playhead.
 */
export function KeyframeToggle({ state, propertyLabel, onToggle }: KeyframeToggleProps) {
  return (
    <Tooltip label={`${COPY[state]} · ${propertyLabel}`} side="left">
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${COPY[state]} for ${propertyLabel}`}
        aria-pressed={state === "keyed"}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-xs transition-colors duration-150",
          state === "keyed"
            ? "text-accent"
            : state === "animated"
              ? "text-accent/55 hover:text-accent"
              : "text-ink-subtle/50 hover:bg-surface-hover hover:text-ink-muted",
        )}
      >
        <Diamond
          className={cn("h-2.5 w-2.5 rotate-0")}
          fill={state === "keyed" ? "currentColor" : "none"}
          strokeWidth={2.4}
        />
      </button>
    </Tooltip>
  );
}
