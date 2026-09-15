"use client";

import * as React from "react";
import type * as THREE from "three";

import { acquireTexture, releaseTexture } from "@/engine/scene/texture-cache";

export type ScreenTextureStatus = "idle" | "loading" | "ready" | "error";

export interface ScreenTextureState {
  texture: THREE.Texture | null;
  aspect: number | undefined;
  status: ScreenTextureStatus;
  error: string | null;
}

interface KeyedState extends ScreenTextureState {
  /** The URL this result belongs to, so stale results are never shown. */
  url: string | null;
}

const EMPTY: KeyedState = {
  url: null,
  texture: null,
  aspect: undefined,
  status: "idle",
  error: null,
};

export interface ScreenTextureOptions {
  /**
   * `false` for imported GLB screens, whose glTF UVs put the origin top-left.
   * Procedural geometry uses the three.js default.
   */
  flipY?: boolean;
}

/**
 * Loads an image into a Three texture, keeping the reference-counted cache in
 * sync. The texture is cloned per consumer so each layer owns its UV transform
 * while sharing a single GPU upload.
 */
export function useScreenTexture(
  url: string | null | undefined,
  options: ScreenTextureOptions = {},
): ScreenTextureState {
  const key = url ?? null;
  const flipY = options.flipY ?? true;
  const [result, setResult] = React.useState<KeyedState>(EMPTY);

  React.useEffect(() => {
    if (!key) return;

    let cancelled = false;
    let clone: THREE.Texture | null = null;

    acquireTexture(key, { flipY })
      .then((texture) => {
        if (cancelled) return;
        clone = texture.clone();
        clone.needsUpdate = true;

        const image = texture.image as { width?: number; height?: number } | undefined;
        const aspect = image?.width && image?.height ? image.width / image.height : undefined;

        setResult({ url: key, texture: clone, aspect, status: "ready", error: null });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setResult({
          url: key,
          texture: null,
          aspect: undefined,
          status: "error",
          error: error instanceof Error ? error.message : "The image could not be loaded",
        });
      });

    return () => {
      cancelled = true;
      // The clone owns only its UV transform; the shared upload is released
      // through the cache, which disposes it once no layer is using it.
      clone?.dispose();
      releaseTexture(key, { flipY });
    };
  }, [key, flipY]);

  // Derived during render: while the URL changes, report "loading" without an
  // extra state write (and never surface the previous image's texture).
  if (result.url === key) return result;
  return { ...EMPTY, status: key ? "loading" : "idle" };
}
