import { createId } from "@/lib/id";
import { DEFAULT_DEVICE_ID, getDevice } from "@/devices/registry";

import {
  DEVICE_TRANSFORM_PRESETS,
  getTransformPreset,
} from "@/engine/devices/device-presets";
import { DEFAULT_TEXT_STYLE, nameFromContent, type TextLayerMetadata } from "@/engine/text/text-types";
import { uniqueSlug } from "@/lib/slug";
import { DEFAULT_BACKGROUND } from "@/types/background";
import { DEFAULT_DEVICE_APPEARANCE } from "@/types/device";
import { IDENTITY_TRANSFORM, type DeviceLayerMetadata, type Layer } from "@/types/layer";
import { PROJECT_VERSION, type CanvasConfig, type Project } from "@/types/project";
import type { BackgroundConfig } from "@/types/background";

export const DEFAULT_DEVICE_METADATA: DeviceLayerMetadata = {
  deviceId: DEFAULT_DEVICE_ID,
  screenAssetId: null,
  screenFit: "cover",
  screenBrightness: 1,
  screenContrast: 1,
  screenSaturation: 1,
  deviceAppearance: { ...DEFAULT_DEVICE_APPEARANCE },
  shadowIntensity: 0.55,
};

const HERO_LEFT = getTransformPreset("hero-left") ?? DEVICE_TRANSFORM_PRESETS[0];

export function createDeviceLayer(deviceId = DEFAULT_DEVICE_ID): Layer {
  const device = getDevice(deviceId);
  return {
    id: createId("layer"),
    name: device.name,
    type: "device",
    visible: true,
    locked: false,
    // Opens on the hero-left preset: a new project should look like a product
    // shot before anything is touched.
    transform: { ...IDENTITY_TRANSFORM, ...HERO_LEFT.rotation,
      ...(device.category === "tablet" ? { rotationX: 0, rotationY: -16, rotationZ: 0 } : {}),
      ...(device.category === "laptop" ? { rotationX: 12, rotationY: -16, rotationZ: 0, scaleX: 0.85, scaleY: 0.85, scaleZ: 0.85 } : {}),
    },
    animations: [],
    metadata: {
      ...DEFAULT_DEVICE_METADATA,
      deviceId,
      deviceAppearance: { ...DEFAULT_DEVICE_APPEARANCE },
    },
  };
}

/**
 * A new text layer.
 *
 * Content starts empty rather than holding the placeholder. The placeholder is
 * drawn by the renderer when there is nothing to draw, so a user who makes a
 * text layer and clicks away keeps an empty layer instead of finding the words
 * "Type something…" saved into their project (§1).
 */
export function createTextLayer(overrides: Partial<TextLayerMetadata> = {}): Layer {
  const metadata: TextLayerMetadata = { ...DEFAULT_TEXT_STYLE, ...overrides };
  return {
    id: createId("layer"),
    name: metadata.content ? nameFromContent(metadata.content) : "Text",
    type: "text",
    visible: true,
    locked: false,
    // Slightly in front of the device, so new text is visible rather than
    // hidden inside the phone the project opens with (§40).
    transform: { ...IDENTITY_TRANSFORM, z: 0.6 },
    animations: [],
    metadata: metadata as unknown as Layer["metadata"],
  };
}

export interface CreateProjectOptions {
  name?: string;
  deviceId?: string;
  canvas?: Partial<CanvasConfig>;
  background?: BackgroundConfig;
  description?: string;
}

export function createProject(
  nameOrOptions: string | CreateProjectOptions = "Untitled project",
): Project {
  const options: CreateProjectOptions =
    typeof nameOrOptions === "string" ? { name: nameOrOptions } : nameOrOptions;

  const name = options.name?.trim() || "Untitled project";
  const now = new Date().toISOString();

  return {
    version: PROJECT_VERSION,
    id: createId("proj"),
    name,
    slug: uniqueSlug(name),
    description: options.description,
    canvas: { width: 1920, height: 1080, fps: 30, duration: 5, ...options.canvas },
    background: options.background ?? DEFAULT_BACKGROUND,
    layers: [createDeviceLayer(options.deviceId)],
    createdAt: now,
    updatedAt: now,
  };
}
