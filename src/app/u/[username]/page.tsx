import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Wordmark } from "@/components/brand/Logo";
import { PortfolioGrid } from "@/components/portfolio/PortfolioGrid";
import { getPortfolio } from "@/lib/projects/public-queries";
import { APP_NAME } from "@/lib/constants";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const portfolio = await getPortfolio(username);

  if (!portfolio) return { title: "Profile not found", robots: { index: false } };

  const name = portfolio.profile.displayName ?? `@${username}`;
  const description = portfolio.profile.bio ?? `Device mockups by ${name}, made with ${APP_NAME}.`;
  const cover = portfolio.items.find((item) => item.coverUrl)?.coverUrl ?? undefined;

  return {
    title: name,
    description,
    openGraph: {
      title: name,
      description,
      images: cover ? [{ url: cover }] : undefined,
      type: "profile",
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title: name,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const portfolio = await getPortfolio(username);

  if (!portfolio) notFound();

  const { profile, items } = portfolio;

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="relative z-40 border-b border-line bg-canvas">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/">
            <Wordmark />
          </Link>
          <Link
            href="/portfolio"
            className="text-[12px] text-ink-muted transition-colors hover:text-ink"
          >
            Discover
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex items-start gap-4">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-14 w-14 rounded-full border border-line object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface text-[18px] text-ink-subtle">
              {(profile.displayName ?? username).slice(0, 1).toUpperCase()}
            </span>
          )}

          <div className="min-w-0 space-y-1">
            <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-ink">
              {profile.displayName ?? `@${username}`}
            </h1>
            <p className="text-[12px] text-ink-subtle">@{profile.username ?? username}</p>
            {profile.bio ? (
              <p className="max-w-lg pt-1 text-[13px] leading-relaxed text-ink-muted">
                {profile.bio}
              </p>
            ) : null}
          </div>
        </div>

        <PortfolioGrid items={items} />
      </main>
    </div>
  );
}
