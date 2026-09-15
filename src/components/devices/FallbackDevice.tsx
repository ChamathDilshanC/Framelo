"use client";

import * as React from "react";

import { DeviceScreen } from "@/components/devices/DeviceScreen";
import { ProceduralPhone } from "@/components/devices/ProceduralPhone";
import type { AssetType } from "@/types/asset";
import type { DeviceDefinition } from "@/types/device";
import type { ScreenFit } from "@/types/layer";

interface FallbackDeviceProps {
  device: DeviceDefinition;
  mediaUrl: string | null;
  mediaType: AssetType;
  getTime?: () => number;
  getPlaying?: () => boolean;
  videoLoop?: boolean;
  videoMuted?: boolean;
  fit: ScreenFit;
  brightness: number;
  bodyColor: string;
  onScreenStatusChange?: (
    status: "idle" | "loading" | "ready" | "error",
    error: string | null,
  ) => void;
}

/**
 * The device Framelo draws when it cannot render the real one.
 *
 * Built from Three primitives, so it needs no download and no WebGL feature
 * beyond the basics. It is used when a GLB fails to load, and when a project
 * explicitly asks for it during development — never as the default once the
 * modelled device is available.
 *
 * It renders at the same normalised size and orientation as the imported
 * models, so a fallback and a real device are interchangeable: the same
 * transform, keyframes, camera and shadow apply to both.
 */
export const FallbackDevice = React.memo(function FallbackDevice({
  device,
  mediaUrl,
  mediaType,
  getTime,
  getPlaying,
  videoLoop,
  videoMuted,
  fit,
  brightness,
  bodyColor,
  onScreenStatusChange,
}: FallbackDeviceProps) {
  return (
    <ProceduralPhone device={device} bodyColor={bodyColor}>
      <DeviceScreen
        device={device}
        mediaUrl={mediaUrl}
        mediaType={mediaType}
        getTime={getTime}
        getPlaying={getPlaying}
        videoLoop={videoLoop}
        videoMuted={videoMuted}
        fit={fit}
        brightness={brightness}
        onStatusChange={onScreenStatusChange}
      />
    </ProceduralPhone>
  );
});
