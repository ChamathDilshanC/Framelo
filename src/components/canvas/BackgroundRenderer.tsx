"use client";

import * as React from "react";

import { resolveBackgroundStyle } from "@/engine/background/resolve";
import type { BackgroundConfig } from "@/types/background";

interface BackgroundRendererProps {
  background: BackgroundConfig;
  /**
   * Resolved URL for an image background.
   *
   * Passed in rather than read from the asset store, so the public viewer can
   * render a background without pulling the editor's asset layer — and its
   * IndexedDB and upload-validation dependencies — into a page that has no
   * local assets to begin with.
   */
  assetUrl?: string | null;
  className?: string;
}

/**
 * The composition background.
 *
 * A DOM layer behind a transparent WebGL canvas rather than geometry inside the
 * scene. Three reasons:
 *
 *   * a CSS pattern stays a real CSS pattern, at the browser's own quality,
 *     instead of an approximation redrawn into a texture;
 *   * changing the background costs the renderer nothing — no texture upload,
 *     no re-render of the 3D scene, no frame drop while dragging a colour;
 *   * a transparent background is genuinely transparent, all the way through
 *     to the exported PNG.
 *
 * Export composites this layer back underneath the 3D frame, so what is
 * assembled here in the DOM is what lands in the file.
 */
export const BackgroundRenderer = React.memo(function BackgroundRenderer({
  background,
  assetUrl = null,
  className,
}: BackgroundRendererProps) {
  const { style, transparent } = React.useMemo(
    () => resolveBackgroundStyle(background, assetUrl),
    [background, assetUrl],
  );

  if (transparent) return null;

  return <div aria-hidden className={className} style={style} />;
});
