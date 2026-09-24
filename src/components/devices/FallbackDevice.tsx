"use client";

import * as React from "react";
import { RoundedBox } from "@react-three/drei";

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
  cropX?: number;
  cropY?: number;
  zoom?: number;
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
  cropX = 0,
  cropY = 0,
  zoom = 1,
  brightness,
  bodyColor,
  onScreenStatusChange,
}: FallbackDeviceProps) {
  if (device.category === "laptop") {
    const display = { ...device,
      body: { ...device.body, height: 2.85, depth: 0.085 },
      screen: { ...device.screen, position: [0, 0, 0.054] as [number, number, number] },
    };
    return <group>
      <group position={[0, 0.02, -1.25]} rotation={[-0.12, 0, 0]}>
        <ProceduralPhone device={display} bodyColor={bodyColor}>
          <DeviceScreen device={display} mediaUrl={mediaUrl} mediaType={mediaType}
            getTime={getTime} getPlaying={getPlaying} videoLoop={videoLoop} videoMuted={videoMuted}
            fit={fit} cropX={cropX} cropY={cropY} zoom={zoom} brightness={brightness} onStatusChange={onScreenStatusChange} />
        </ProceduralPhone>
      </group>
      <RoundedBox args={[4.4, 0.13, 2.8]} radius={0.04} position={[0, -1.45, 0]}>
        <meshStandardMaterial color={bodyColor} metalness={0.85} roughness={0.3} />
      </RoundedBox>
      <mesh position={[0, -1.375, -0.45]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.8, 1.2]} />
        <meshStandardMaterial color="#17181b" roughness={0.7} />
      </mesh>
    </group>;
  }
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
        cropX={cropX}
        cropY={cropY}
        zoom={zoom}
        brightness={brightness}
        onStatusChange={onScreenStatusChange}
      />
    </ProceduralPhone>
  );
});
