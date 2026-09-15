import { cn } from "@/lib/utils";

/**
 * Framelo mark: a frame with an inset plate, echoing a device inside a canvas.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("h-5 w-5", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2.25"
        y="2.25"
        width="19.5"
        height="19.5"
        rx="5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.45"
      />
      <rect x="8" y="6" width="8" height="12" rx="2.6" fill="currentColor" />
      <rect x="10.4" y="7.6" width="3.2" height="0.9" rx="0.45" fill="var(--color-canvas)" />
    </svg>
  );
}

interface WordmarkProps {
  className?: string;
  showTagline?: boolean;
}

export function Wordmark({ className, showTagline = false }: WordmarkProps) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark className="text-accent" />
      <span className="flex flex-col leading-none">
        <span className="text-[13px] font-semibold tracking-[0.14em] text-ink">FRAMELO</span>
        {showTagline ? (
          <span className="mt-1 text-[10px] tracking-wide text-ink-subtle">
            Create. Animate. Showcase.
          </span>
        ) : null}
      </span>
    </span>
  );
}
