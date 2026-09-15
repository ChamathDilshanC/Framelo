"use client";

import dynamic from "next/dynamic";

/**
 * `ssr: false` is only valid inside a client component, so the lazy boundary
 * for the WebGL hero lives here rather than in the page itself.
 */
const HeroPreview = dynamic(
  () => import("@/components/landing/HeroPreview").then((mod) => mod.HeroPreview),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-[64%] w-[min(32%,200px)] animate-pulse rounded-[26px] border border-line bg-surface-raised" />
      </div>
    ),
  },
);

export function HeroPreviewLoader() {
  return <HeroPreview />;
}
