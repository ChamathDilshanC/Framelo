import type { CameraViewId } from "@/engine/devices/device-presets";
import type { TextLayerMetadata } from "@/engine/text/text-types";
import type { BackgroundConfig } from "@/types/background";
import type { DeviceFinishId } from "@/types/device";
import type { DeviceLayerMetadata, Transform } from "@/types/layer";
import type { EasingType } from "@/types/animation";
import { STUDIO_TEMPLATES } from "./studio-templates";
import { NEBULA_TEMPLATE } from "./nebula-template";
import { EMERALD_TEMPLATE } from "./emerald-template";
import { REFERENCE_TEMPLATES } from "./reference-templates";

/**
 * What a template is *for*, in the only terms a browser can filter on.
 *
 * The form factor, not the mood: someone opening the browser is deciding what
 * they are making a mockup of, and "editorial" versus "cinematic" is a
 * distinction they can only make after looking at the card anyway. Every
 * template carries this explicitly — nothing here is ever inferred from a
 * name, so renaming a template can never silently move it between tabs.
 */
export const TEMPLATE_CATEGORIES = ["mobile", "tablet", "laptop", "multi-device"] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  mobile: "Mobile",
  tablet: "Tablet",
  laptop: "Laptop",
  "multi-device": "Multi-device",
};

export interface TemplateEntrance {
  start: number;
  end: number;
  from: Partial<Transform>;
  easing?: EasingType;
  /** Optional restrained drift after the composition has settled. */
  drift?: { start: number; to: Partial<Transform>; easing?: EasingType };
}
export interface TemplateDeviceSpec {
  deviceId?: string;
  name: string;
  transform: Partial<Transform>;
  screenArtwork: NonNullable<DeviceLayerMetadata["screenArtwork"]>;
  shadowIntensity?: number;
  entrance: TemplateEntrance;
}
export interface TemplateTextSpec {
  content: string;
  style: Partial<TextLayerMetadata>;
  transform: Partial<Transform>;
  motionPresetIds?: string[];
  entrance?: TemplateEntrance;
  name?: string;
}
export interface ProjectTemplate {
  imageLayers?: { name: string; src: string; width: number; height: number; transform: Partial<Transform>; entrance: TemplateEntrance }[];
  id: string;
  name: string;
  description: string;
  canvas: { width: number; height: number; fps: number; duration: number };
  deviceId: string;
  finish: DeviceFinishId;
  background: BackgroundConfig;
  motionPresetIds: string[];
  tags: string[];
  deviceTransform?: Partial<Transform>;
  deviceLayers?: TemplateDeviceSpec[];
  textLayers?: TemplateTextSpec[];
  cameraView?: CameraViewId;
  posterTime?: number;
  /** Which form factor the composition is built around. Drives filtering. */
  category: TemplateCategory;
}
const fill = (color: string): TextLayerMetadata["fill"] => ({
  type: "solid", color, gradient: { from: color, to: color, angle: 0 },
});

/** All composition and entrance data becomes ordinary editable layers. */
export const PROJECT_TEMPLATES: ProjectTemplate[] = [{
  id: "kinetic-mobile-presentation",
  name: "Kinetic Mobile Presentation",
  description: "Editorial mobile showcase with layered cinematic device motion.",
  category: "mobile",
  canvas: { width: 1080, height: 1920, fps: 60, duration: 6 },
  deviceId: "iphone-17-pro", finish: "silver", cameraView: "front", posterTime: 3,
  background: {
    type: "pattern", patternId: null, name: "Kinetic studio floor", opacity: 1,
    css: { backgroundColor: "#030303", backgroundImage: "radial-gradient(ellipse at 50% 112%, #777777 0%, #282828 24%, #080808 42%, #030303 58%)" },
  },
  motionPresetIds: [], tags: ["editorial", "cinematic", "mobile", "portrait"],
  deviceLayers: [
    {
      name: "01 / Editorial - main", screenArtwork: "editorial",
      transform: { x: -0.38, y: -0.38, z: 0.12, rotationX: 8, rotationY: -16, rotationZ: 14, scaleX: 0.58, scaleY: 0.58, scaleZ: 0.58 },
      entrance: { start: 0.4, end: 1.6, from: { y: -0.95, rotationX: 18, rotationY: -28, rotationZ: 22, scaleX: 0.528, scaleY: 0.528, scaleZ: 0.528, opacity: 0 } },
    },
    {
      name: "02 / Manifesto - behind", screenArtwork: "manifesto",
      transform: { x: 0.38, y: -0.25, z: -0.32, rotationX: -8, rotationY: -34, rotationZ: -17, scaleX: 0.55, scaleY: 0.55, scaleZ: 0.55 },
      entrance: { start: 0.7, end: 2, from: { x: 0.7, y: -0.85, rotationY: -48, rotationZ: -27, scaleX: 0.495, scaleY: 0.495, scaleZ: 0.495, opacity: 0 } },
    },
    {
      name: "03 / Landscape - foreground", screenArtwork: "landscape",
      transform: { x: 0.37, y: -1.02, z: 0.65, rotationX: 19, rotationY: -20, rotationZ: -31, scaleX: 0.49, scaleY: 0.49, scaleZ: 0.49 },
      entrance: { start: 1, end: 2.3, from: { x: 0.85, y: -1.65, rotationX: 30, rotationZ: -47, scaleX: 0.441, scaleY: 0.441, scaleZ: 0.441, opacity: 0 } },
    },
  ],
  textLayers: [
    {
      name: "Headline", content: "Mobile\nPresentation",
      style: { fontId: "inter", fontWeight: 600, fontSize: 65, letterSpacing: -3.2, lineHeight: 0.98, textAlign: "left", fill: fill("#f4f3ef") },
      transform: { x: 0, y: 1.29, z: 0.1 },
      entrance: { start: 0.15, end: 1.25, from: { y: 1.15, opacity: 0 } },
    },
    {
      name: "Description", content: "The mobile experience focuses\non speed and usability.",
      style: { fontId: "inter", fontWeight: 400, fontSize: 17, lineHeight: 1.4, textAlign: "left", fill: fill("#91918e") },
      transform: { x: -0.34, y: 0.81, z: 0.1 },
      entrance: { start: 0.55, end: 1.65, from: { y: 0.75, opacity: 0 } },
    },
    {
      name: "Vermilion spark", content: "✳",
      style: { fontId: "inter", fontWeight: 500, fontSize: 57, fill: fill("#f04c2f") },
      transform: { x: -0.86, y: 1.87, z: 0.1 },
      entrance: { start: 0, end: 1.1, from: { rotationZ: -22, scaleX: 0.8, scaleY: 0.8, opacity: 0 } },
    },
  ],
}, NEBULA_TEMPLATE, EMERALD_TEMPLATE, ...STUDIO_TEMPLATES, ...REFERENCE_TEMPLATES];

const BY_ID = new Map(PROJECT_TEMPLATES.map((template) => [template.id, template]));

export function getProjectTemplate(id: string): ProjectTemplate | undefined {
  return BY_ID.get(id);
}

/** Every device the composition places, in layer order and without repeats. */
export function templateDeviceIds(template: ProjectTemplate): string[] {
  const ids = template.deviceLayers?.map((spec) => spec.deviceId ?? template.deviceId) ?? [
    template.deviceId,
  ];
  return [...new Set(ids)];
}

/** Categories that actually have templates in them. */
export function activeTemplateCategories(): TemplateCategory[] {
  const present = new Set(PROJECT_TEMPLATES.map((template) => template.category));
  return TEMPLATE_CATEGORIES.filter((category) => present.has(category));
}

/**
 * Filter the catalogue.
 *
 * Category comes from the template's own metadata, never from its name, so the
 * tabs keep meaning the same thing after a rename. The query matches the name,
 * the description, the tags and the category label, because "iPad", "phone"
 * and "green" are all things someone reasonably types looking for a layout.
 */
export function searchProjectTemplates(
  category: TemplateCategory | "all",
  query: string,
): ProjectTemplate[] {
  const needle = query.trim().toLowerCase();

  return PROJECT_TEMPLATES.filter((template) => {
    if (category !== "all" && template.category !== category) return false;
    if (!needle) return true;

    return (
      template.name.toLowerCase().includes(needle) ||
      template.description.toLowerCase().includes(needle) ||
      TEMPLATE_CATEGORY_LABELS[template.category].toLowerCase().includes(needle) ||
      template.tags.some((tag) => tag.toLowerCase().includes(needle))
    );
  });
}
