"use client";

import * as React from "react";
import { useThree } from "@react-three/fiber";

import { useMediaTexture } from "@/components/canvas/use-media-texture";
import type { AssetType } from "@/types/asset";
import {
  loadDeviceModel,
  beginDevicePreparation,
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

const DEVICE_MODEL_LOAD_TIMEOUT_MS = 15000;

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
  const { gl, camera, scene } = useThree();
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

    loadDeviceModelWithTimeout(device)
      .then((model) => {
        if (cancelled) {
          model.dispose();
          releaseUnusedModels();
          return;
        }
        instance = model;
        setPrepared(model);
        onReady(model);
        model.root.visible = false;
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
  React.useLayoutEffect(() => {
    if (!prepared) return;

    const placeholder = !mediaUrl || mediaStatus === "error" ? getPlaceholderScreenTexture(false) : null;
    const active = texture ?? placeholder;
    const activeAspect = texture ? aspect : PLACEHOLDER_SCREEN_ASPECT;

    setScreenTexture(prepared.screen, active, activeAspect);

    return () => {
      // Drop the reference before the texture's owner disposes it, so the
      // material can never sample freed GPU memory.
      setScreenTexture(prepared.screen, null, undefined);
    };
  }, [prepared, texture, aspect, mediaUrl, mediaStatus]);

  // --- Screen filters -----------------------------------------------------
  React.useLayoutEffect(() => {
    if (!prepared) return;
    applyScreenAppearance(prepared.screen, {
      ...appearance,
      imageAspect: texture ? aspect : PLACEHOLDER_SCREEN_ASPECT,
    });
  }, [prepared, appearance, texture, aspect]);

  // --- Body finish --------------------------------------------------------
  // Applied to this instance's own cloned materials, so it can never reach the
  // cached scene or another layer showing the same device.
  React.useLayoutEffect(() => {
    prepared?.setAppearance(deviceAppearance);
  }, [prepared, deviceAppearance]);

  // Keep the corrected model hidden until decoded media and GPU programs are ready.
  React.useLayoutEffect(() => {
    if (!prepared) return;
    let cancelled = false;
    const finish = beginDevicePreparation();
    prepared.root.visible = false;
    onStatusChange("loading", null);
    if (mediaUrl && mediaStatus !== "ready" && mediaStatus !== "error") return finish;
    const active = texture ?? getPlaceholderScreenTexture(false);
    if (active) gl.initTexture(active);
    void gl.compileAsync(prepared.root, camera, scene).then(() => {
      if (cancelled) return;
      prepared.root.userData.revealStarted = performance.now();
      prepared.root.userData.finishPreparation = finish;
      prepared.root.visible = true;
      onReady(prepared);
      onStatusChange("ready", null);
    }).catch((error: unknown) => {
      if (!cancelled) onStatusChange("error", error instanceof Error ? error.message : "Device preparation failed");
      finish();
    });
    return () => { cancelled = true; finish(); };
  }, [prepared, mediaUrl, mediaStatus, texture, gl, camera, scene, onReady, onStatusChange]);

  if (!prepared) return null;

  return <primitive object={prepared.root} />;
});

async function loadDeviceModelWithTimeout(
  device: DeviceDefinition,
): Promise<PreparedDeviceModel> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${device.name} took too long to load`));
    }, DEVICE_MODEL_LOAD_TIMEOUT_MS);
  });

  try {
    return await Promise.race([loadDeviceModel(device), timeout]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
