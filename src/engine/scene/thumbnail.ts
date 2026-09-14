"use client";

import * as THREE from "three";

import { hasPendingModelLoads } from "@/engine/devices/model-loader";
import { captureFrame, sceneRegistry } from "@/engine/scene/capture";
import { saveThumbnail } from "@/lib/projects/project-service";
import type { BackgroundConfig } from "@/types/background";

/**
 * Project poster images.
 *
 * A thumbnail is a real render of the scene, so it is not free — which is
 * exactly why it is rate-limited rather than reactive. Scrubbing the playhead,
 * dragging a slider or nudging a keyframe must never trigger one; a thumbnail
 * is worth taking when the user pauses on a meaningfully different project, and
 * at most once every few minutes.
 */

/** Small enough to stay under a second to encode, large enough for a 2× card. */
const THUMBNAIL_WIDTH = 640;
/** Never more often than this, however much the project changes. */
const MIN_INTERVAL_MS = 90_000;
/** How long the editor must be idle before a capture is considered. */
const IDLE_MS = 4_000;
/** Retry spacing while the stage is not worth capturing yet. */
const RETRY_MS = 3_000;
const MAX_RETRIES = 20;

/** The group every device layer renders into. Mirrors `Scene`. */
const LAYER_ROOT_NAME = "framelo-layers";

const lastCapture = new Map<string, number>();

export interface ThumbnailOptions {
  projectId: string;
  aspect: number;
  background: BackgroundConfig;
  backgroundAssetUrl?: string | null;
  /** Skip the rate limit — used by explicit saves and by export. */
  force?: boolean;
}

/**
 * Whether the scene is worth posting a picture of.
 *
 * The device models are several megabytes and take seconds to arrive. Capturing
 * before one lands produces a poster of an empty stage — background and shadow,
 * no device — and because the capture would then claim the rate-limit slot, that
 * empty frame is what the dashboard shows for the next ninety seconds.
 */
function stageIsReady(): boolean {
  if (!sceneRegistry.isReady()) return false;
  if (hasPendingModelLoads()) return false;

  const scene = sceneRegistry.get()?.scene;
  const layerRoot = scene?.getObjectByName(LAYER_ROOT_NAME);
  if (!layerRoot) return false;

  // Covers the procedural fallback as well as an imported model: either way,
  // there has to be something with a size in front of the camera.
  const box = new THREE.Box3().setFromObject(layerRoot);
  return !box.isEmpty() && box.getSize(new THREE.Vector3()).length() > 0.01;
}

/**
 * Capture and store a poster frame.
 *
 * Returns false when the capture was skipped, which is the common case: the
 * caller is expected to fire this optimistically and not care.
 */
export async function captureThumbnail(options: ThumbnailOptions): Promise<boolean> {
  if (!stageIsReady()) return false;

  const now = Date.now();
  const previous = lastCapture.get(options.projectId) ?? 0;
  if (!options.force && now - previous < MIN_INTERVAL_MS) return false;

  // Claimed before the await, so two overlapping calls cannot both render.
  lastCapture.set(options.projectId, now);

  try {
    const width = THUMBNAIL_WIDTH;
    const height = Math.round(width / (options.aspect || 16 / 9));

    const blob = await captureFrame({
      width,
      height,
      transparent: options.background.type === "transparent",
      // WebP for a poster: a third of the bytes of PNG at this size, and every
      // browser that can run the editor can decode it.
      mimeType: "image/webp",
      quality: 0.82,
      background: options.background,
      backgroundAssetUrl: options.backgroundAssetUrl,
    });

    await saveThumbnail(options.projectId, blob);
    return true;
  } catch {
    // A missing thumbnail is cosmetic. It must never surface as an error or
    // interrupt what the user was doing — but the slot is released so the next
    // attempt is not blocked by a failure.
    lastCapture.delete(options.projectId);
    return false;
  }
}

/**
 * Capture once the editor has been idle, retrying while the stage is not ready.
 *
 * The retry matters: the first idle window after opening a project almost
 * always lands mid-download, and without it the project would keep the empty
 * poster taken at that moment.
 */
export function scheduleIdleThumbnail(options: ThumbnailOptions): () => void {
  let timer = 0;
  let attempts = 0;
  let cancelled = false;

  function attempt() {
    if (cancelled) return;

    void captureThumbnail(options).then((captured) => {
      if (captured || cancelled) return;
      // Not captured: either the stage is still loading, or the rate limit is
      // holding. Either way there is nothing to do but wait.
      attempts += 1;
      if (attempts >= MAX_RETRIES || !stageWillBecomeReady()) return;
      timer = window.setTimeout(attempt, RETRY_MS);
    });
  }

  timer = window.setTimeout(attempt, IDLE_MS);

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}

/** Retrying is only worth it while something is still on its way in. */
function stageWillBecomeReady(): boolean {
  return hasPendingModelLoads() || !sceneRegistry.isReady();
}
