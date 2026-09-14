export interface CameraConfig {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export interface DeviceScreenConfig {
  /** Screen size in scene units. */
  width: number;
  height: number;
  /** Corner radius of the screen cut-out, in scene units. */
  cornerRadius: number;
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface DeviceBodyConfig {
  width: number;
  height: number;
  depth: number;
  cornerRadius: number;
  /** Bezel thickness between body edge and screen. */
  bezel: number;
}

/**
 * How a device's screen mesh maps its UVs.
 *
 * Every GLB lays its display UVs out differently, so the texture matrix has to
 * be corrected per model before any fit/filter maths applies. The corrected
 * space ("canvas space") is always: 0..1, origin top-left, portrait.
 */
export interface ScreenUvTransform {
  /** Extra rotation applied around the UV centre, in radians. */
  rotation?: number;
  /** Mirror horizontally — common when a model's screen faces -Z natively. */
  mirrorX?: boolean;
  /**
   * Affine remap for meshes whose visible face does not span UV 0..1.
   * Applied instead of rotation/mirror when present.
   */
  repeat?: [number, number];
  offset?: [number, number];
}

/**
 * Some models have no modelled bezel — their display runs edge to edge. A
 * border is drawn inside the screen shader so those read like a real phone.
 * Values are in the device's own screen pixels.
 */
export interface ScreenInsetConfig {
  border: number;
  radius: number;
}

/** Per-material overrides applied to the imported GLB after cloning. */
export interface MaterialTweak {
  color?: number;
  emissive?: number;
  emissiveIntensity?: number;
  metalness?: number;
  roughness?: number;
  envMapIntensity?: number;
  toneMapped?: boolean;
  transparent?: boolean;
  opacity?: number;
  clearcoat?: number;
  /** Drop baked normal/roughness/metalness maps for a perfectly smooth surface. */
  stripMaps?: boolean;
  /** Promote the material's own base-colour map to an emissive map. */
  emissiveFromMap?: boolean;
  polygonOffset?: boolean;
  polygonOffsetFactor?: number;
  polygonOffsetUnits?: number;
  /** Exclude from the body-finish tinting pass. */
  keepFinish?: boolean;
}

export interface DeviceModelConfig {
  /** Public URL of the GLB. */
  path: string;
  /**
   * Candidate names of the display mesh. Checked before material names, so a
   * model whose screen material is shared with other parts still resolves.
   */
  screenMeshNames: string[];
  /** Candidate names of the display material — how most GLBs are keyed. */
  screenMaterialNames: string[];
  /** Model-space rotation that makes height = +Y and the screen face +Z. */
  rotation: [number, number, number];
  /** The model is uniformly scaled so its height matches this, in scene units. */
  normalizeHeight: number;
  /** Native screen resolution, used for aspect and inset maths. */
  screenPixels: [number, number];
  uv?: ScreenUvTransform;
  inset?: ScreenInsetConfig;
  tweaks?: Record<string, MaterialTweak>;
  /**
   * Roles for materials whose names mislead the classifier — several of these
   * models call the display bezel "Camera".
   */
  roles?: Record<string, MaterialRole>;
}

/**
 * Append-only: a finish id that has ever been written into a project must keep
 * resolving, so new finishes go on the end and none is ever renamed.
 */
export type DeviceFinishId =
  | "natural"
  | "dark"
  | "light"
  | "gold"
  | "silver"
  | "custom"
  | "black"
  | "white"
  | "blue";

export interface DeviceFinish {
  id: DeviceFinishId;
  label: string;
  /** Colour body materials are blended towards. */
  tint: string;
  /** 0 = keep the GLB's own colour, 1 = fully replace it. */
  mix: number;
  /** Multiplier applied to each body material's own roughness. */
  roughness: number;
  metalness: number;
  /**
   * Shade rails and buttons slightly differently from the back panel, the way
   * real anodised hardware does. Off for finishes meant to read as one material.
   */
  shadeParts?: boolean;
  /**
   * Adapt the blend to each material's own colour instead of applying it
   * evenly.
   *
   * Only "Natural" does this: it means "keep what the model shipped with, just
   * lift it out of silhouette", so near-black parts are pulled up and bright
   * ones are left alone. Every other finish is a colour the user explicitly
   * asked for, and must land on a white model as surely as on a black one.
   */
  adaptive?: boolean;
  /** The finish takes its colour from `deviceAppearance.bodyColor`. */
  custom?: boolean;
}

/**
 * What a material is for.
 *
 * Finishes recolour the body and frame; everything else is protected, because
 * a gold phone still has black glass and clear lenses.
 */
export type MaterialRole =
  | "body"
  | "frame"
  | "button"
  | "screen"
  | "glass"
  | "lens"
  | "sensor"
  | "logo";

/** Per-layer device appearance. Serialized into the project. */
export interface DeviceAppearance {
  finish: DeviceFinishId;
  /** Used only by the "custom" finish. */
  bodyColor?: string;
}

export const DEFAULT_DEVICE_APPEARANCE: DeviceAppearance = {
  finish: "natural",
  bodyColor: "#b6b1a8",
};

export interface DeviceDefinition {
  id: string;
  name: string;
  category: "phone" | "tablet" | "laptop" | "watch" | "browser";
  /** Photorealistic GLB. The procedural fallback renders when this is missing. */
  model?: DeviceModelConfig;
  /** Geometry for the procedural fallback body. */
  body: DeviceBodyConfig;
  screen: DeviceScreenConfig;
  defaultCamera: CameraConfig;
  /** Aspect of the screen, used for texture fitting. */
  screenAspect: number;
  /**
   * Finishes this device offers. Omitted means "all of them" — a device with
   * an unusual material set can narrow the list without the UI changing.
   */
  finishes?: DeviceFinishId[];
  /** Marketing-style blurb shown in the device library. */
  description: string;
  /** Display label for the screen aspect, e.g. "19.5 : 9". */
  ratioLabel?: string;
  available: boolean;
  features?: {
    dynamicIsland?: boolean;
    notch?: boolean;
    homeIndicator?: boolean;
    sideButtons?: boolean;
    cameraBump?: boolean;
  };
}

export type DeviceModelStatus = "idle" | "loading" | "ready" | "error";
