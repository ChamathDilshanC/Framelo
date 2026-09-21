import { z } from "zod";

import { DEFAULT_DEVICE_ID } from "@/devices/registry";
import { validatePatternCss } from "@/engine/background/css-safety";
import { uniqueSlug } from "@/lib/slug";
import { ANIMATABLE_PROPERTIES, EASING_TYPES } from "@/types/animation";
import { sanitizeTextMetadata } from "@/engine/text/text-safety";
import { DEFAULT_DEVICE_APPEARANCE, type DeviceFinishId } from "@/types/device";
import { PROJECT_VERSION, type Project } from "@/types/project";

const hexColor = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid hex colour");
/** Colours inside a background may be any CSS notation the validator accepts. */
const cssColor = z.string().min(1).max(200);

export const TransformSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
  rotationX: z.number(),
  rotationY: z.number(),
  rotationZ: z.number(),
  scaleX: z.number(),
  scaleY: z.number(),
  scaleZ: z.number(),
  opacity: z.number().min(0).max(1),
});

export const KeyframeSchema = z.object({
  id: z.string(),
  time: z.number().min(0),
  value: z.number(),
  easing: z.enum(EASING_TYPES),
});

export const AnimationTrackSchema = z.object({
  property: z.enum(ANIMATABLE_PROPERTIES),
  keyframes: z.array(KeyframeSchema),
});

export const LayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["device", "image", "video", "text", "shape", "camera"]),
  visible: z.boolean(),
  locked: z.boolean(),
  transform: TransformSchema,
  animations: z.array(AnimationTrackSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Pattern CSS is shape-checked here and content-checked by the validator.
 *
 * Zod can confirm these are short strings; only `validatePatternCss` can say
 * whether a value is safe to hand to the DOM, so the migration runs it over
 * every pattern that comes out of storage.
 */
export const PatternCssSchema = z.object({
  backgroundColor: z.string().max(200).optional(),
  backgroundImage: z.string().max(4000).optional(),
  backgroundSize: z.string().max(200).optional(),
  backgroundPosition: z.string().max(200).optional(),
  backgroundRepeat: z.string().max(60).optional(),
});

export const BackgroundSchema = z.union([
  z.object({ type: z.literal("solid"), value: cssColor }),
  z.object({ type: z.literal("transparent") }),
  z.object({
    type: z.literal("gradient"),
    mode: z.enum(["linear", "radial", "conic"]),
    from: cssColor,
    to: cssColor,
    angle: z.number(),
    position: z.number(),
    opacity: z.number().min(0).max(1),
  }),
  z.object({
    type: z.literal("pattern"),
    patternId: z.string().max(80).nullable(),
    name: z.string().max(120),
    css: PatternCssSchema,
    colors: z.object({ base: cssColor, accent: cssColor }).optional(),
    opacity: z.number().min(0).max(1),
  }),
  z.object({
    type: z.literal("image"),
    assetId: z.string(),
    fit: z.enum(["cover", "contain", "fill"]),
    opacity: z.number().min(0).max(1),
  }),
  // Version 1's gradient. Accepted so an old project still parses; the
  // migration below rewrites it into the current shape.
  z.object({
    type: z.literal("linear-gradient"),
    from: hexColor,
    to: hexColor,
    angle: z.number(),
  }),
]);

export const WorkAreaSchema = z.object({
  in: z.number().min(0).max(120),
  out: z.number().min(0).max(120),
  enabled: z.boolean(),
});

export const CanvasSchema = z.object({
  width: z.number().int().min(64).max(7680),
  height: z.number().int().min(64).max(7680),
  fps: z.number().int().min(1).max(120),
  duration: z.number().min(0.1).max(120),
  workArea: WorkAreaSchema.optional(),
});

export const ExportSettingsSchema = z.object({
  format: z.string().max(12),
  resolutionId: z.string().max(12),
  transparent: z.boolean(),
  range: z.enum(["composition", "work-area"]),
});

const Vector3Schema = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
export const ProjectEditorStateSchema = z.object({
  currentTime: z.number().finite().min(0),
  cameraView: z.enum(["front", "back", "left-hero", "right-hero", "three-quarter", "custom"]),
  camera: z.object({ position: Vector3Schema, target: Vector3Schema }).refine(
    pose => pose.position.some((value, index) => Math.abs(value - pose.target[index]) > 0.001),
    "Camera position must differ from its target",
  ),
  selectedLayerId: z.string().nullable(),
});

export const ProjectSchema = z.object({
  version: z.number().int().min(1),
  id: z.string(),
  name: z.string().min(1).max(120),
  slug: z.string().max(120).optional(),
  description: z.string().max(2000).optional(),
  canvas: CanvasSchema,
  background: BackgroundSchema,
  layers: z.array(LayerSchema),
  templateId: z.string().max(80).optional(),
  deviceMotionTemplateId: z.string().max(80).optional(),
  exportSettings: ExportSettingsSchema.optional(),
  editorState: ProjectEditorStateSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ParsedProject = z.infer<typeof ProjectSchema>;

export interface ProjectParseResult {
  ok: boolean;
  project?: Project;
  error?: string;
}

/**
 * Never trust project JSON coming from storage or the network.
 * Unknown future versions are rejected rather than silently mis-rendered.
 */
export function parseProject(input: unknown): ProjectParseResult {
  const result = ProjectSchema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    return {
      ok: false,
      error: first
        ? `${first.path.join(".") || "project"}: ${first.message}`
        : "Invalid project data",
    };
  }

  const migrated = migrateProject(result.data);
  if (!migrated) {
    return { ok: false, error: `Unsupported project version ${result.data.version}` };
  }

  return { ok: true, project: migrated };
}

/**
 * Device ids that existed before the photorealistic models shipped. A project
 * saved against one of these still opens — on the device that replaced it.
 */
const LEGACY_DEVICE_IDS: Record<string, string> = {
  iphone: DEFAULT_DEVICE_ID,
};

/** Version gate + migration hook. Add cases here as the format evolves. */
export function migrateProject(project: ParsedProject): Project | null {
  if (project.version > PROJECT_VERSION) return null;

  const migrated = project as unknown as Project;

  // v2: projects gained a slug, so public URLs need not expose an id.
  if (!migrated.slug) migrated.slug = uniqueSlug(migrated.name);

  migrated.background = migrateBackground(project.background);

  for (const layer of migrated.layers) {
    // Text arrives from local storage, a share link or another build, so its
    // style is normalised rather than trusted: clamped sizes, checked colours,
    // a bounded content length. A text layer is drawn to a canvas and never
    // inserted as markup, but a NaN font size or a 50 MB string would still
    // take the editor down.
    if (layer.type === "text") {
      layer.metadata = sanitizeTextMetadata(layer.metadata) as typeof layer.metadata;
      continue;
    }

    if (layer.type !== "device" || !layer.metadata) continue;
    const metadata = layer.metadata;

    const replacement = LEGACY_DEVICE_IDS[String(metadata.deviceId)];
    if (replacement) metadata.deviceId = replacement;

    metadata.screenContrast ??= 1;
    metadata.screenSaturation ??= 1;

    // v2: `bodyFinish` + `bodyColor` became a single appearance object.
    if (!metadata.deviceAppearance) {
      const legacyFinish = metadata.bodyFinish;
      metadata.deviceAppearance = {
        finish: isFinishId(legacyFinish) ? legacyFinish : DEFAULT_DEVICE_APPEARANCE.finish,
        bodyColor:
          typeof metadata.bodyColor === "string"
            ? metadata.bodyColor
            : DEFAULT_DEVICE_APPEARANCE.bodyColor,
      };
    }
  }

  // v3: the composition gained a work area. A project written before this has
  // none, which already means "the whole composition" — so there is nothing to
  // backfill. What does need doing is bounding a range that is out of step with
  // the duration, which can happen if a composition was shortened by an older
  // build that knew nothing about the range.
  migrated.canvas.workArea = migrateWorkArea(migrated.canvas);

  migrated.version = PROJECT_VERSION;
  return migrated;
}

function migrateWorkArea(canvas: Project["canvas"]): Project["canvas"]["workArea"] {
  const area = canvas.workArea;
  if (!area) return undefined;

  const start = Math.max(0, Math.min(area.in, canvas.duration));
  const end = Math.max(start, Math.min(area.out, canvas.duration));

  // A range that has collapsed to nothing is not a range; drop it rather than
  // leave the user with an in/out they cannot see or drag apart.
  if (end - start < 0.01) return undefined;

  return { in: start, out: end, enabled: area.enabled };
}

const FINISH_IDS: readonly DeviceFinishId[] = [
  "natural",
  "dark",
  "light",
  "gold",
  "silver",
  "custom",
  "black",
  "white",
  "blue",
];

function isFinishId(value: unknown): value is DeviceFinishId {
  return typeof value === "string" && (FINISH_IDS as readonly string[]).includes(value);
}

/**
 * Bring a stored background up to the current model.
 *
 * Pattern CSS is re-validated here rather than trusted: this is the boundary
 * where data written by another version — or edited by hand — becomes something
 * the app is about to put in the DOM.
 */
function migrateBackground(background: ParsedProject["background"]): Project["background"] {
  if (background.type === "linear-gradient") {
    return {
      type: "gradient",
      mode: "linear",
      from: background.from,
      to: background.to,
      angle: background.angle,
      position: 50,
      opacity: 1,
    };
  }

  if (background.type === "pattern") {
    const { css } = validatePatternCss(background.css);
    return { ...background, css };
  }

  return background;
}
