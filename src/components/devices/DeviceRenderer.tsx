"use client";

import { useFrame } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";

import { templateScreenUrl } from "@/engine/templates/screen-artwork";
import { DeviceModel } from "@/components/devices/DeviceModel";
import type { PreparedDeviceModel } from "@/engine/devices/model-loader";
import { FallbackDevice } from "@/components/devices/FallbackDevice";
import { evaluateTransform, evaluateTransformWith } from "@/engine/animation/evaluate";
import { presetPreview } from "@/engine/motion/preset-preview";
import { getDevice } from "@/devices/registry";
import { degToRad } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import {
  DEFAULT_DEVICE_APPEARANCE,
  type DeviceAppearance,
  type DeviceModelStatus,
} from "@/types/device";
import type { AssetType } from "@/types/asset";
import type { DeviceLayerMetadata, Layer } from "@/types/layer";

export interface DeviceLayerStatus {
  layerId: string;
  deviceName: string;
  model: DeviceModelStatus;
  modelError: string | null;
  /** True while the procedural device is standing in for a real model. */
  usingFallback: boolean;
}

interface DeviceRendererProps {
  layer: Layer;
  mediaUrl: string | null;
  mediaType?: AssetType;
  getPlaying?: () => boolean;
  onDropTargetChange?: (layerId: string | null) => void;
  dropTargetId?: string | null;
  getTime?: () => number;
  onScreenError?: (message: string | null) => void;
  onDeviceStatusChange?: (status: DeviceLayerStatus) => void;
}

/**
 * Renders one device layer.
 *
 * Framelo owns the transform; the model does not. The GLB is loaded as a static
 * object and this group is what moves, so the animation engine, the timeline
 * and the keyframes work identically whether the layer is showing a
 * photorealistic model or the procedural fallback.
 *
 * The animated transform is applied imperatively inside `useFrame` from the
 * editor store's `currentTime`, so scrubbing and playback never re-render React
 * and never touch the loaded model. Only edits to the layer's data cause a
 * React update.
 */
export const DeviceRenderer = React.memo(function DeviceRenderer({
  layer,
  mediaUrl,
  mediaType = "image",
  getPlaying,
  onDropTargetChange,
  onScreenError,
  onDeviceStatusChange,
  getTime,
}: DeviceRendererProps) {
  const groupRef = React.useRef<THREE.Group>(null);
  const cropDrag = React.useRef<{ point: THREE.Vector3; x: number; y: number } | null>(null);
  const cropDragged = React.useRef(false);

  const metadata = (layer.metadata ?? {}) as Partial<DeviceLayerMetadata>;
  const device = getDevice(metadata.deviceId ?? "");
  const missingMedia = Boolean(metadata.screenAssetId && !mediaUrl);
  const defaultScreenUrl = templateScreenUrl(metadata.screenArtwork ?? "default-wallpaper");

  const [modelState, setModelState] = React.useState<{ deviceId: string; status: DeviceModelStatus; error: string | null }>({ deviceId: device.id, status: "idle", error: null });
  // Stale results cannot expose a fallback or the previous device on a switch.
  const modelStatus = modelState.deviceId === device.id ? modelState.status : "idle";
  const modelError = modelState.deviceId === device.id ? modelState.error : null;
  const wantsModel = Boolean(device.model) && !metadata.forceFallback;
  const usingFallback = !wantsModel || modelStatus === "error";
  const showFallback = usingFallback;

  const handleModelStatus = React.useCallback(
    (status: DeviceModelStatus, error: string | null) => {
      setModelState({ deviceId: device.id, status, error });
    },
    [device.id],
  );

  const handleMediaError = React.useCallback(
    (message: string | null) => onScreenError?.(missingMedia
      ? "The saved screen media is unavailable on this device. Replace the missing media to restore this screen."
      : message),
    [onScreenError, missingMedia],
  );

  const handleModelReady = React.useCallback((model: PreparedDeviceModel | null) => {
    preparedRef.current = model;
    // A fresh model starts solid, so the next frame re-derives whether it
    // should be fading rather than inheriting the previous model's state.
    lastOpacity.current = -1;
  }, []);

  const handleFallbackScreenStatus = React.useCallback(
    (status: "idle" | "loading" | "ready" | "error", error: string | null) => {
      onScreenError?.(status === "error" ? error : null);
    },
    [onScreenError],
  );

  React.useEffect(() => {
    onDeviceStatusChange?.({
      layerId: layer.id,
      deviceName: device.name,
      model: wantsModel ? modelStatus : "idle",
      modelError,
      usingFallback,
    });
  }, [
    onDeviceStatusChange,
    layer.id,
    device.name,
    wantsModel,
    modelStatus,
    modelError,
    usingFallback,
  ]);

  // Screen settings are grouped so the model only re-applies uniforms when one
  // of them actually changes.
  const screenAppearance = React.useMemo(
    () => ({
      fit: metadata.screenFit ?? "cover",
      brightness: metadata.screenBrightness ?? 1,
      contrast: metadata.screenContrast ?? 1,
      saturation: metadata.screenSaturation ?? 1,
      cropX: metadata.screenCropX ?? 0,
      cropY: metadata.screenCropY ?? 0,
      zoom: metadata.screenZoom ?? 1,
    }),
    [
      metadata.screenFit,
      metadata.screenBrightness,
      metadata.screenContrast,
      metadata.screenSaturation,
      metadata.screenCropX,
      metadata.screenCropY,
      metadata.screenZoom,
    ],
  );

  // Grouped so the model only re-applies materials when the finish itself
  // changes, not on every unrelated metadata edit.
  const deviceAppearance = React.useMemo<DeviceAppearance>(
    () => ({
      finish: (metadata.deviceAppearance?.finish ?? DEFAULT_DEVICE_APPEARANCE.finish),
      bodyColor: metadata.deviceAppearance?.bodyColor ?? DEFAULT_DEVICE_APPEARANCE.bodyColor,
    }),
    [metadata.deviceAppearance?.finish, metadata.deviceAppearance?.bodyColor],
  );

  // Held in a ref because the frame loop needs it without re-rendering.
  const preparedRef = React.useRef<PreparedDeviceModel | null>(null);
  const lastOpacity = React.useRef(-1);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    // A live preset preview takes over the layer without touching the project:
    // it supplies its own tracks and its own clock, and vanishes when it stops.
    const preview = getTime ? null : presetPreview.tracksFor(layer.id);

    // useFrame always runs the latest callback, so `layer` is never stale here.
    const transform = preview
      ? evaluateTransformWith(layer.transform, preview, presetPreview.timeAt(performance.now()))
      : evaluateTransform(layer, getTime ? getTime() : useEditorStore.getState().currentTime);

    group.position.set(transform.x, transform.y, transform.z);
    group.rotation.set(
      degToRad(transform.rotationX),
      degToRad(transform.rotationY),
      degToRad(transform.rotationZ),
    );
    group.scale.set(transform.scaleX, transform.scaleY, transform.scaleZ);

    // An imported model has ~90 meshes; walking them every frame to write an
    // unchanged opacity is pure waste.
    const model = preparedRef.current;
    const started = model?.root.userData.revealStarted as number | undefined;
    const reveal = started === undefined ? 1 : Math.min(1, (performance.now() - started) / 240);
    const opacity = transform.opacity * (reveal * reveal * (3 - 2 * reveal));
    if (reveal === 1) model?.root.userData.finishPreparation?.();
    if (opacity !== lastOpacity.current) {
      lastOpacity.current = opacity;
      applyOpacity(group, opacity);

      // Crossing out of full opacity turns on the depth pre-pass, so a fading
      // device reads as translucent rather than hollow.
      preparedRef.current?.setFading(opacity < 1);
    }
  });

  // A new model brings new materials, whose opacity has never been written.
  React.useEffect(() => {
    lastOpacity.current = -1;
  }, [device.id, showFallback]);

  return (
    <group ref={groupRef} visible={layer.visible} name={layer.id}
      onClick={(event) => {
        if (getTime) return;
        event.stopPropagation();
        if (cropDragged.current) {
          cropDragged.current = false;
          return;
        }
        useEditorStore.getState().selectLayer(layer.id);
      }}
      onPointerOver={(event) => { event.stopPropagation(); onDropTargetChange?.(layer.id); }}
      onPointerOut={() => onDropTargetChange?.(null)}>

      {!getTime ? <mesh name="phone-hit-area" position={[0, 0, 0.02]}
        onPointerDown={(event) => {
          if (layer.locked || mediaType === "video") return;
          event.stopPropagation();
          const point = event.point.clone();
          groupRef.current?.worldToLocal(point);
          cropDrag.current = {
            point,
            x: screenAppearance.cropX,
            y: screenAppearance.cropY,
          };
          cropDragged.current = false;
        }}
        onPointerMove={(event) => {
          const drag = cropDrag.current;
          const group = groupRef.current;
          if (!drag || !group || event.buttons !== 1) return;
          event.stopPropagation();
          const point = event.point.clone();
          group.worldToLocal(point);
          const dx = point.x - drag.point.x;
          const dy = point.y - drag.point.y;
          if (Math.abs(dx) + Math.abs(dy) < 0.01) return;
          cropDragged.current = true;
          useProjectStore.getState().updateDeviceMetadata(layer.id, {
            screenCropX: clampCrop(drag.x + dx / Math.max(0.01, device.screen.width)),
            screenCropY: clampCrop(drag.y - dy / Math.max(0.01, device.screen.height)),
          });
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          cropDrag.current = null;
        }}>
        <planeGeometry args={[device.body.width, device.body.height]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={2} />
      </mesh> : null}
      {wantsModel && modelStatus !== "error" ? (
        <DeviceModel
          key={device.id}
          device={device}
          mediaUrl={mediaUrl ?? (missingMedia ? null : defaultScreenUrl)}
          mediaType={mediaType}
          getTime={getTime}
          getPlaying={getPlaying}
          videoLoop={metadata.videoLoop}
          videoMuted={metadata.videoMuted}
          appearance={screenAppearance}
          deviceAppearance={deviceAppearance}
          onReady={handleModelReady}
          onStatusChange={handleModelStatus}
          onMediaError={handleMediaError}
        />
      ) : null}

      {showFallback ? (
        <FallbackDevice
          device={device}
          mediaUrl={mediaUrl ?? (missingMedia ? null : defaultScreenUrl)}
          mediaType={mediaType}
          getTime={getTime}
          getPlaying={getPlaying}
          videoLoop={metadata.videoLoop}
          videoMuted={metadata.videoMuted}
          fit={screenAppearance.fit}
          cropX={screenAppearance.cropX}
          cropY={screenAppearance.cropY}
          zoom={screenAppearance.zoom}
          brightness={screenAppearance.brightness}
          bodyColor={fallbackBodyColor(deviceAppearance)}
          onScreenStatusChange={handleFallbackScreenStatus}
        />
      ) : null}
    </group>
  );
});

/**
 * The procedural device has one flat body colour rather than a material set, so
 * a finish has to collapse to a single swatch for it.
 */
function fallbackBodyColor(appearance: DeviceAppearance): string {
  if (appearance.finish === "custom" && appearance.bodyColor) return appearance.bodyColor;
  return FALLBACK_FINISH_COLORS[appearance.finish] ?? "#1c1d21";
}

function clampCrop(value: number): number {
  return Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0));
}

const FALLBACK_FINISH_COLORS: Record<string, string> = {
  natural: "#8f8c85",
  dark: "#26272c",
  light: "#d3d4d8",
  gold: "#c9a65f",
  silver: "#c2c5cb",
};

/** Push layer opacity into every material under the group, cheaply. */
function applyOpacity(group: THREE.Group, opacity: number): void {
  const clamped = opacity < 0 ? 0 : opacity > 1 ? 1 : opacity;
  const transparent = clamped < 1;

  group.traverse((object) => {
    const mesh = object as THREE.Mesh;
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (!material) return;

    if (Array.isArray(material)) {
      for (const entry of material) setMaterialOpacity(entry, clamped, transparent);
    } else {
      setMaterialOpacity(material, clamped, transparent);
    }
  });
}

/** Materials that are transparent by design keep their own base opacity. */
const BASE_OPACITY = new WeakMap<THREE.Material, number>();

function setMaterialOpacity(
  material: THREE.Material,
  opacity: number,
  layerTransparent: boolean,
): void {
  // A material that writes no colour is structural, not visual: it exists only
  // to lay down depth so the rest of the device can fade as a silhouette.
  // Fading it would make it transparent, which moves it out of the opaque
  // queue — and a depth pre-pass that runs after the thing it is supposed to
  // occlude does nothing at all.
  if (material.colorWrite === false) return;

  let base = BASE_OPACITY.get(material);
  if (base === undefined) {
    base = material.transparent ? material.opacity : 1;
    BASE_OPACITY.set(material, base);
  }

  const next = base * opacity;
  const needsTransparent = layerTransparent || base < 1;

  if (material.transparent !== needsTransparent) {
    material.transparent = needsTransparent;
    material.needsUpdate = true;
  }
  if (material.opacity !== next) {
    material.opacity = next;
  }
}
