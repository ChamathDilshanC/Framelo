"use client";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface DeviceLoadingProps {
  deviceName: string;
  className?: string;
}

/**
 * Shown while a device GLB downloads.
 *
 * A DOM overlay rather than a placeholder in the scene: the models are several
 * megabytes, and a blank viewport for two seconds reads as a broken editor. It
 * names the device so the wait is attributable.
 */
export function DeviceLoading({ deviceName, className }: DeviceLoadingProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-center justify-center",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5 rounded-full border border-line bg-surface/85 px-4 py-2 shadow-lg shadow-black/30 backdrop-blur-sm">
        <Spinner />
        <span className="text-[11px] text-ink-muted">Loading {deviceName}…</span>
      </div>
    </div>
  );
}
