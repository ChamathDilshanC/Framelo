import Link from "next/link";

import { Wordmark } from "@/components/brand/Logo";

export default function ShareNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-6 text-center">
      <Wordmark />
      <div className="space-y-2">
        <h1 className="text-[20px] font-medium tracking-[-0.01em] text-ink">
          This link isn&apos;t available
        </h1>
        <p className="max-w-sm text-[13px] leading-relaxed text-ink-muted">
          The project may have been unshared or deleted. Ask whoever sent it for a fresh link.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-md border border-line bg-surface px-3.5 py-2 text-[12px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
      >
        Go to Framelo
      </Link>
    </div>
  );
}
