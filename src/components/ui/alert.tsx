import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AlertTone = "info" | "warning" | "danger";

const TONES: Record<AlertTone, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "border-accent/25 bg-accent-soft/60 text-ink-muted" },
  warning: { icon: AlertTriangle, className: "border-caution/25 bg-caution/8 text-caution" },
  danger: { icon: OctagonAlert, className: "border-danger/25 bg-danger/8 text-danger" },
};

interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children: ReactNode;
  className?: string;
}

/** Inline, persistent messaging. Transient feedback uses goey-toast instead. */
export function Alert({ tone = "info", title, children, className }: AlertProps) {
  const { icon: Icon, className: toneClass } = TONES[tone];
  return (
    <div
      role="status"
      className={cn("flex gap-2.5 rounded-md border px-3 py-2.5 text-[12px]", toneClass, className)}
    >
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <div className="space-y-0.5 leading-relaxed">
        {title ? <p className="font-medium text-ink">{title}</p> : null}
        <div className="text-ink-muted">{children}</div>
      </div>
    </div>
  );
}
