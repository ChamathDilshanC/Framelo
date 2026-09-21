import { getMotionPreset } from "@/engine/motion/motion-presets";
import { generateTracks, mergePresetTracks, planDuration } from "@/engine/motion/preset-generator";
import { DEFAULT_TEXT_STYLE, nameFromContent, type TextLayerMetadata } from "@/engine/text/text-types";
import { createId } from "@/lib/id";
import { DEFAULT_DEVICE_METADATA } from "@/lib/project-factory";
import { DEFAULT_DEVICE_APPEARANCE } from "@/types/device";
import { IDENTITY_TRANSFORM, type Layer, type Transform } from "@/types/layer";
import type { TransformProperty, AnimationTrack } from "@/types/animation";

import type { ProjectTemplate, TemplateTextSpec, TemplateEntrance } from "./project-templates";

/** Build ordinary layers without store side effects, preserving the main screenshot. */
export interface TemplateBuildResult {
  layers: Layer[];
  /** The device layer's id, so the caller can keep it selected. */
  deviceLayerId: string;
}

export function buildTemplateLayers(
  template: ProjectTemplate,
  existingDevice: Layer | null,
): TemplateBuildResult {
  const devices = template.deviceLayers?.map((spec, index) => {
    const layer = buildDeviceLayer({ ...template, deviceId: spec.deviceId ?? template.deviceId, deviceTransform: spec.transform }, index === 0 ? existingDevice : null);
    layer.name = spec.name;
    layer.metadata = { ...layer.metadata, screenArtwork: spec.screenArtwork, ...(spec.shadowIntensity === undefined ? {} : { shadowIntensity: spec.shadowIntensity }) };
    layer.animations = entranceTracks(layer.transform, spec.entrance, template.canvas.duration);
    return layer;
  }) ?? [buildDeviceLayer(template, existingDevice)];
  const device = devices[0];
  const texts = (template.textLayers ?? []).map((spec) => buildTextLayer(spec, template));
  const images: Layer[] = (template.imageLayers ?? []).map((spec) => {
    const transform = { ...IDENTITY_TRANSFORM, ...spec.transform };
    return { id: createId("layer"), name: spec.name, type: "image", visible: true, locked: false,
      transform, animations: entranceTracks(transform, spec.entrance, template.canvas.duration),
      metadata: { imageSrc: spec.src, imageWidth: spec.width, imageHeight: spec.height } };
  });

  return {
    // Transparent planes do not write depth, so rear artwork also needs to
    // draw before foreground artwork. Preserve the existing device ordering.
    layers: [
      ...[...texts, ...images].filter((layer) => layer.transform.z < 0).sort((a, b) => a.transform.z - b.transform.z),
      ...devices,
      ...texts.filter((layer) => layer.transform.z >= 0),
      ...images.filter((layer) => layer.transform.z >= 0),
    ],
    deviceLayerId: device.id,
  };
}

function buildDeviceLayer(template: ProjectTemplate, existing: Layer | null): Layer {
  const transform: Transform = { ...IDENTITY_TRANSFORM, ...template.deviceTransform };

  const tracks = tracksFor(template.motionPresetIds, transform, template.canvas.duration);

  // Keep the layer's identity when there is one, so keyframes the user may
  // still undo back to are attached to the same id.
  const id = existing?.id ?? createId("layer");

  return {
    id,
    name: existing?.name ?? "Device",
    type: "device",
    visible: true,
    locked: false,
    transform,
    animations: tracks,
    metadata: {
      ...DEFAULT_DEVICE_METADATA,
      deviceId: template.deviceId,
      deviceAppearance: { ...DEFAULT_DEVICE_APPEARANCE, finish: template.finish },
      // The user's screenshot survives the template, unlike everything else.
      screenAssetId: existing?.metadata?.screenAssetId ?? null,
    },
  };
}

function buildTextLayer(spec: TemplateTextSpec, template: ProjectTemplate): Layer {
  const style: TextLayerMetadata = { ...DEFAULT_TEXT_STYLE, ...spec.style, content: spec.content };
  const transform: Transform = { ...IDENTITY_TRANSFORM, z: 0.6, ...spec.transform };

  return {
    id: createId("layer"),
    name: spec.name ?? nameFromContent(spec.content),
    type: "text",
    visible: true,
    locked: false,
    transform,
    animations: spec.entrance ? entranceTracks(transform, spec.entrance, template.canvas.duration) : tracksFor(spec.motionPresetIds ?? [], transform, template.canvas.duration, style),
    metadata: structuredClone(style) as unknown as Layer["metadata"],
  };
}

/**
 * Generate the keyframes a list of presets produces.
 *
 * Goes through the ordinary preset generator, so a template's motion is the
 * same data a user would get by applying those presets by hand — editable,
 * undoable, and with no second animation format anywhere in the project.
 */
function tracksFor(
  presetIds: string[],
  baseTransform: Transform,
  duration: number,
  baseMetadata?: unknown,
): AnimationTrack[] {
  return presetIds.reduce<AnimationTrack[]>((accumulated, presetId) => {
    const preset = getMotionPreset(presetId);
    if (!preset) return accumulated;

    const plan = planDuration(preset, duration, "fit");
    const generated = generateTracks(preset, {
      baseTransform,
      baseMetadata,
      duration: plan.presetSpan,
    });

    return mergePresetTracks(accumulated, generated).tracks;
  }, []);
}

/** Composition fingerprint, excluding palette so colour variants cannot collide silently. */
export function templateSignature(template: ProjectTemplate): string {
  const device = { ...IDENTITY_TRANSFORM, ...template.deviceTransform };

  const text = (template.textLayers ?? []).map((spec) => {
    const style = { ...DEFAULT_TEXT_STYLE, ...spec.style };
    return [
      style.fontId,
      style.fontWeight,
      Math.round(style.fontSize / 8),
      style.textAlign,
      style.textTransform,
      Math.round((spec.transform.x ?? 0) * 4),
      Math.round((spec.transform.y ?? 0) * 4),
    ].join(":");
  });

  return JSON.stringify({
    canvas: [template.canvas.width, template.canvas.height],
    device: [
      Math.round(device.x * 4),
      Math.round(device.y * 4),
      Math.round(device.rotationY / 5),
      Math.round(device.rotationZ / 5),
      Math.round(device.scaleX * 10),
    ],
    devices: template.deviceLayers?.map((spec) => ({ transform: spec.transform, entrance: spec.entrance })),
    backgroundKind: template.background.type,
    motion: [...template.motionPresetIds].sort(),
    text,
  });
}

/** Native timeline keyframes, with a staggered expo entrance and a final hold. */
function entranceTracks(transform: Transform, entrance: TemplateEntrance, duration: number): AnimationTrack[] {
  const properties = new Set([...Object.keys(entrance.from), ...Object.keys(entrance.drift?.to ?? {})]);
  return ([...properties] as TransformProperty[]).map((property) => {
    const from = entrance.from[property] ?? transform[property];
    const points = [
      { time: 0, value: from },
      ...(entrance.start > 0 ? [{ time: entrance.start, value: from }] : []),
      { time: entrance.end, value: transform[property] },
      ...(entrance.drift && entrance.drift.start > entrance.end
        ? [{ time: entrance.drift.start, value: transform[property] }] : []),
      { time: duration, value: entrance.drift?.to[property] ?? transform[property] },
    ];
    return { property, keyframes: points.map((point) => ({
      ...point, id: createId("kf"),
      easing: entrance.drift && point.time >= entrance.drift.start
        ? entrance.drift.easing ?? "expo"
        : entrance.easing ?? "expo",
    })) };
  });
}
