import type { TextLayerMetadata } from "@/engine/text/text-types";

import type { AnimationTrack } from "./animation";
import type { DeviceAppearance } from "./device";

export type LayerType = "device" | "image" | "video" | "text" | "shape" | "camera";

export interface Transform {
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  opacity: number;
}

export type ScreenFit = "cover" | "contain" | "fill";

/** Extra, layer-type specific data. Kept narrow so it stays serializable. */
export interface DeviceLayerMetadata {
  deviceId: string;
  /** Asset currently mapped onto the device screen. */
  screenAssetId: string | null;
  /** Bundled artwork used until an uploaded screen is assigned. */
  screenArtwork?:
    | "editorial"
    | "manifesto"
    | "landscape"
    | "nebula"
    | "studio-tablet"
    | "studio-desktop"
    | "crimson-editorial"
    | "neon-portfolio"
    | "midnight-sales"
    | "floating-commerce"
    | "amber-agency"
    | "amber-tablet"
    | "lime-campaign"
    | "amber-mobile"
    | "lime-mobile"
    | "emerald";
  screenFit: ScreenFit;
  videoLoop?: boolean;
  videoMuted?: boolean;
  /**
   * Screen colour adjustments. These are shader uniforms on the display
   * material, never edits to the image, so they stay reversible and cost
   * nothing to change.
   */
  screenBrightness: number;
  screenContrast: number;
  screenSaturation: number;
  /**
   * Finish and custom colour of the imported model's body. Applied to cloned
   * PBR materials — screens, glass, lenses and sensors are never recoloured.
   */
  deviceAppearance: DeviceAppearance;
  shadowIntensity: number;
  /** Render the fallback device even when a GLB is available. Debugging aid. */
  forceFallback?: boolean;
}

/**
 * A layer.
 *
 * One shape for every kind. A text layer and a device layer differ only in
 * their `type` and what sits in `metadata` — the transform, the keyframes, the
 * visibility and the lock are shared, which is why text needed no changes to
 * the timeline, the evaluator, undo, autosave, sharing or export.
 *
 * `metadata` stays an open record so a new layer type does not force a change
 * here, and so a project written by a newer build still parses in an older one
 * with its unknown fields intact (§73).
 */
export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  transform: Transform;
  animations: AnimationTrack[];
  metadata?: Partial<DeviceLayerMetadata> & Partial<TextLayerMetadata> & Record<string, unknown>;
}

/** Narrowing helper, so components can branch on layer kind readably. */
export function isTextLayer(layer: Layer): boolean {
  return layer.type === "text";
}

export const IDENTITY_TRANSFORM: Transform = {
  x: 0,
  y: 0,
  z: 0,
  rotationX: 0,
  rotationY: 0,
  rotationZ: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  opacity: 1,
};
