"use client";

import * as React from "react";
import * as THREE from "three";

import { useMediaTexture } from "@/components/canvas/use-media-texture";
import type { AssetType } from "@/types/asset";
import {
  getPlaceholderScreenTexture,
  PLACEHOLDER_SCREEN_ASPECT,
} from "@/engine/scene/generated-textures";
import { createRoundedRectGeometry } from "@/engine/scene/geometry";
import { computeScreenLayout } from "@/engine/scene/screen-layout";
import type { DeviceDefinition } from "@/types/device";
import type { ScreenFit } from "@/types/layer";

interface DeviceScreenProps {
  device: DeviceDefinition;
  mediaUrl: string | null;
  mediaType?: AssetType;
  getTime?: () => number;
  getPlaying?: () => boolean;
  videoLoop?: boolean;
  videoMuted?: boolean;
  fit: ScreenFit;
  cropX?: number;
  cropY?: number;
  zoom?: number;
  brightness: number;
  onStatusChange?: (status: "idle" | "loading" | "ready" | "error", error: string | null) => void;
}

/**
 * The screen surface: a dark backing plane plus the media plane on top.
 * Keeping them separate means "contain" letterboxes naturally against the
 * backing instead of smearing edge pixels.
 *
 * With no media assigned, a generated placeholder UI is shown so the device
 * never reads as broken or blank.
 */
export const DeviceScreen = React.memo(function DeviceScreen({
  device,
  mediaUrl,
  mediaType = "image",
  getTime,
  getPlaying,
  videoLoop,
  videoMuted,
  fit,
  cropX = 0,
  cropY = 0,
  zoom = 1,
  brightness,
  onStatusChange,
}: DeviceScreenProps) {
  const { screen } = device;
  const { texture, aspect, status, error } = useMediaTexture(mediaUrl, mediaType, { flipY: true, getTime, getPlaying, loop: videoLoop, muted: videoMuted });

  React.useEffect(() => {
    onStatusChange?.(status, error);
  }, [status, error, onStatusChange]);

  const placeholder = React.useMemo(() => (mediaUrl ? null : getPlaceholderScreenTexture()), [
    mediaUrl,
  ]);

  const activeTexture = texture ?? placeholder;
  const activeAspect = texture ? aspect : PLACEHOLDER_SCREEN_ASPECT;
  // The placeholder is drawn for this screen, so it always covers.
  const activeFit: ScreenFit = texture ? fit : "cover";

  const layout = React.useMemo(
    () => computeScreenLayout(activeFit, screen.width, screen.height, activeAspect, cropX, cropY, zoom),
    [activeFit, screen.width, screen.height, activeAspect, cropX, cropY, zoom],
  );

  const backingGeometry = React.useMemo(
    () => createRoundedRectGeometry(screen.width, screen.height, screen.cornerRadius, 10),
    [screen.width, screen.height, screen.cornerRadius],
  );

  const mediaGeometry = React.useMemo(() => {
    const isFullBleed =
      Math.abs(layout.planeWidth - screen.width) < 1e-4 &&
      Math.abs(layout.planeHeight - screen.height) < 1e-4;
    // Full-bleed media keeps the rounded screen corners; inset media is a
    // simple rectangle sitting on the dark backing.
    return isFullBleed
      ? createRoundedRectGeometry(layout.planeWidth, layout.planeHeight, screen.cornerRadius, 10)
      : createRoundedRectGeometry(layout.planeWidth, layout.planeHeight, 0.008, 2);
  }, [layout.planeWidth, layout.planeHeight, screen.cornerRadius, screen.width, screen.height]);

  React.useEffect(() => () => backingGeometry.dispose(), [backingGeometry]);
  React.useEffect(() => () => mediaGeometry.dispose(), [mediaGeometry]);

  React.useEffect(() => {
    if (!activeTexture) return;
    activeTexture.center.set(0.5, 0.5);
    activeTexture.wrapS = THREE.ClampToEdgeWrapping;
    activeTexture.wrapT = THREE.ClampToEdgeWrapping;
    activeTexture.repeat.set(layout.repeat[0], layout.repeat[1]);
    activeTexture.offset.set(layout.offset[0], layout.offset[1]);
    activeTexture.needsUpdate = true;
  }, [activeTexture, layout]);

  const screenTint = React.useMemo(() => {
    const value = Math.max(0, Math.min(2, brightness));
    return new THREE.Color(value, value, value);
  }, [brightness]);

  return (
    <group>
      {/* Dark backing / letterbox */}
      <mesh geometry={backingGeometry} renderOrder={1}>
        <meshBasicMaterial color="#08080b" toneMapped={false} />
      </mesh>

      {activeTexture ? (
        <mesh geometry={mediaGeometry} position={[0, 0, 0.0012]} renderOrder={2}>
          <meshBasicMaterial map={activeTexture} color={screenTint} toneMapped={false} />
        </mesh>
      ) : null}

      {/* Glass sheen: a faint specular layer so the screen reads as glass */}
      <mesh geometry={backingGeometry} position={[0, 0, 0.0028]} renderOrder={3}>
        <meshPhysicalMaterial
          transparent
          opacity={0.08}
          roughness={0.06}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.04}
          color="#ffffff"
          envMapIntensity={2.2}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
});
