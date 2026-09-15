"use client";

import * as React from "react";

import { useMediaTexture } from "@/components/canvas/use-media-texture";
import type { AssetType } from "@/types/asset";
import {
  loadDeviceModel,
  releaseUnusedModels,
  type PreparedDeviceModel,
} from "@/engine/devices/model-loader";
import {
  applyScreenAppearance,
  setScreenTexture,
  type ScreenAppearance,
} from "@/engine/devices/screen-material";
import {
  getPlaceholderScreenTexture,
  PLACEHOLDER_SCREEN_ASPECT,
} from "@/engine/scene/generated-textures";
import type { DeviceAppearance, DeviceDefinition, DeviceModelStatus } from "@/types/device";

interface DeviceModelProps {
  device: DeviceDefinition;
  mediaUrl: string | null;
  mediaType: AssetType;
  getTime?: () => number;
  getPlaying?: () => boolean;
  videoLoop?: boolean;
  videoMuted?: boolean;
  appearance: Omit<ScreenAppearance, "imageAspect">;
  deviceAppearance: DeviceAppearance | undefined;
  /** Hands the prepared instance to the parent's frame loop. */
  onReady: (model: PreparedDeviceModel | null) => void;
  onStatusChange: (status: DeviceModelStatus, error: string | null) => void;
  onMediaError: (message: string | null) => void;
}

/**
 * One instance of a photorealistic device model.
 *
 * The GLB is loaded once, for the life of this component and this device — not
 * per frame, per keyframe, per transform edit or per image change. React only
 * re-runs the load when `device.id` changes; everything else (screen texture,
 * fit, colour filters, body finish) is pushed into the already-built materials.
 */
export const DeviceModel = React.memo(function DeviceModel({
  device,
  mediaUrl,
  mediaType,
  getTime,
  getPlaying,
  videoLoop,
  videoMuted,
  appearance,
  deviceAppearance,
  onReady,
  onStatusChange,
  onMediaError,
}: DeviceModelProps) {
  const [prepared, setPrepared] = React.useState<PreparedDeviceModel | null>(null);

  // glTF UVs put the origin top-left, so screen images load unflipped.
  const { texture, aspect, status: mediaStatus, error: mediaError } = useMediaTexture(mediaUrl, mediaType, { flipY: false, getTime, getPlaying, loop: videoLoop, muted: videoMuted });

  React.useEffect(() => {
    onMediaError(mediaStatus === "error" ? mediaError : null);
  }, [mediaStatus, mediaError, onMediaError]);

  // --- Model lifecycle ----------------------------------------------------
  React.useEffect(() => {
    let cancelled = false;
    let instance: PreparedDeviceModel | null = null;

    setPrepared(null);
    onStatusChange("loading", null);

    loadDeviceModel(device)
      .then((model) => {
        if (cancelled) {
          model.dispose();
          return;
        }
        instance = model;
        setPrepared(model);
        onReady(model);
        onStatusChange("ready", null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : `${device.name} could not be loaded`;
        onStatusChange("error", message);
      });

    return () => {
      cancelled = true;
      onReady(null);
      instance?.dispose();
      // A model no layer references any more should not hold on to its buffers.
      releaseUnusedModels();
    };
    // `onStatusChange` is a stable callback from the parent; re-running this on
    // an identity change would re-download the model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.id]);

  // --- Screen texture -----------------------------------------------------
  // Only the emissive map is swapped. The model, its geometry and every other
  // material stay exactly as they were.
  React.useEffect(() => {
    if (!prepared) return;

    const placeholder = mediaUrl ? null : getPlaceholderScreenTexture(false);
    const active = texture ?? placeholder;
    const activeAspect = texture ? aspect : PLACEHOLDER_SCREEN_ASPECT;

    setScreenTexture(prepared.screen, active, activeAspect);

    return () => {
      // Drop the reference before the texture's owner disposes it, so the
      // material can never sample freed GPU memory.
      setScreenTexture(prepared.screen, null, undefined);
    };
  }, [prepared, texture, aspect, mediaUrl]);

  // --- Screen filters -----------------------------------------------------
  React.useEffect(() => {
    if (!prepared) return;
    applyScreenAppearance(prepared.screen, {
      ...appearance,
      imageAspect: texture ? aspect : PLACEHOLDER_SCREEN_ASPECT,
    });
  }, [prepared, appearance, texture, aspect]);

  // --- Body finish --------------------------------------------------------
  // Applied to this instance's own cloned materials, so it can never reach the
  // cached scene or another layer showing the same device.
  React.useEffect(() => {
    prepared?.setAppearance(deviceAppearance);
  }, [prepared, deviceAppearance]);

  if (!prepared) return null;

  return <primitive object={prepared.root} />;
});
