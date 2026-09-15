"use client";

import { useAssetStore } from "@/store/asset-store";
import type { BackgroundConfig } from "@/types/background";

/**
 * Resolve an image background to a usable URL.
 *
 * Lives on the editor side so `BackgroundRenderer` can stay pure: the public
 * viewer renders backgrounds without ever importing the asset store.
 */
export function useBackgroundAssetUrl(background: BackgroundConfig | null): string | null {
  const assetId = background?.type === "image" ? background.assetId : null;

  return useAssetStore((state) =>
    assetId ? (state.assets.find((asset) => asset.id === assetId)?.url ?? null) : null,
  );
}
