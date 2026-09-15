import type { Metadata } from "next";
import Link from "next/link";

import { Wordmark } from "@/components/brand/Logo";
import { PortfolioGrid } from "@/components/portfolio/PortfolioGrid";
import { getPortfolioFeed } from "@/lib/projects/public-queries";

export const metadata: Metadata = {
  title: "Portfolio",
  description: "Animated device mockups published with Framelo.",
};

/** Published work changes slowly; a minute of cache is plenty. */
export const revalidate = 60;

export default async function PortfolioPage() {
  const items = await getPortfolioFeed();

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="relative z-40 border-b border-line bg-canvas">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/">
            <Wordmark />
          </Link>
          <Link
            href="/dashboard"
            className="text-[12px] text-ink-muted transition-colors hover:text-ink"
          >
            Your projects
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 max-w-xl space-y-2">
          <p className="panel-label">Published</p>
          <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink">
            Made with Framelo
          </h1>
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Device mockups people have published. Open one to watch it play.
          </p>
        </div>

        <PortfolioGrid items={items} />
      </main>
    </div>
  );
}
