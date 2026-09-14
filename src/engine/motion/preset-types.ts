import type { TextRevealMode } from "@/engine/text/text-types";
import type { AnimatableProperty, EasingType } from "@/types/animation";
import type { LayerType } from "@/types/layer";

/**
 * The motion preset data model.
 *
 * A preset is **data**, not code: a list of normalised keyframes per property
 * plus a declaration of which parameters it honours. The generator turns that
 * into ordinary Framelo keyframes, so a preset can never introduce a second
 * animation system — everything it produces is the same track format the
 * timeline, the evaluator and the exporter already read.
 */

export const MOTION_CATEGORIES = [
  "entrance",
  "exit",
  "movement",
  "3d",
  "cinematic",
  "product",
  "loop",
  "combo",
  "text",
] as const;

export type MotionCategory = (typeof MOTION_CATEGORIES)[number];

export const MOTION_CATEGORY_LABELS: Record<MotionCategory, string> = {
  entrance: "Entrance",
  exit: "Exit",
  movement: "Movement",
  "3d": "3D",
  cinematic: "Cinematic",
  product: "Product",
  loop: "Loop",
  combo: "Combo",
  text: "Text",
};

export const MOTION_DIRECTIONS = ["left", "center", "right", "top", "bottom"] as const;
export type MotionDirection = (typeof MOTION_DIRECTIONS)[number];

/**
 * One keyframe in preset space.
 *
 * `at` is normalised to [0, 1] across the preset's duration, so a preset can
 * be fitted to any composition length without rewriting it.
 */
export interface MotionKeyframeSpec {
  at: number;
  value: number;
  easing?: EasingType;
  /** Added to the layer's current static value rather than replacing it. */
  relative?: boolean;
  /**
   * Scale this value by the intensity parameter.
   *
   * Only the *travel* should scale — a rise-in that starts 2 units below
   * should start further below at higher intensity, but its resting value must
   * stay put, or the device ends up somewhere the user did not ask for.
   */
  scaled?: boolean;
  /**
   * Flip or redirect with the direction parameter. Applies to position and
   * rotation specs where "from the left" is a meaningful variation.
   */
  directional?: boolean;
}

export type MotionTrackSpecs = Partial<Record<AnimatableProperty, MotionKeyframeSpec[]>>;

/** Which controls a preset actually honours, so the UI only offers what works. */
export interface MotionPresetSupports {
  intensity?: boolean;
  direction?: boolean;
  easing?: boolean;
  delay?: boolean;
  /** Offers the spring controls, which bake sampled keyframes. */
  spring?: boolean;
}

export interface SpringParameters {
  mass: number;
  stiffness: number;
  damping: number;
}

export interface MotionPresetParameters {
  /** 0–2, where 1 is the preset as designed. */
  intensity: number;
  direction: MotionDirection;
  /** `null` keeps each keyframe's own designed easing. */
  easing: EasingType | null;
  /** Seconds before the motion starts. */
  delay: number;
  /** 0 disables spring baking and uses the designed easing. */
  springIntensity: number;
  spring: SpringParameters;
}

export interface MotionPresetDefinition {
  /**
   * Bumped when a preset's motion changes meaningfully.
   *
   * Applied presets are flattened into plain keyframes, so a project is never
   * retroactively altered by a new version — this exists so a future
   * "update to the latest version of this preset" can tell them apart.
   */
  version: number;
  id: string;
  name: string;
  category: MotionCategory;
  /** Designed length in seconds. */
  duration: number;
  description: string;
  tags: string[];
  tracks: MotionTrackSpecs;
  supports?: MotionPresetSupports;
  /**
   * First and last keyframes match, so the motion can repeat without a seam.
   * The UI says so, and the generator refuses to add a delay that would break it.
   */
  loop?: boolean;
  /**
   * Layer kinds this preset is offered for. Absent means every kind.
   *
   * A device spin on a headline is meaningless, and a typewriter on a phone
   * is worse than meaningless — its reveal track would animate nothing while
   * appearing to have been applied.
   */
  appliesTo?: LayerType[];
  /**
   * Reveal mode this preset needs on the layer.
   *
   * A reveal track says *how much* is shown; this says what the fraction
   * counts. Applying the preset sets it, in the same commit, so a typewriter
   * types characters without the user having to find a second control.
   */
  revealMode?: TextRevealMode;
}

export const DEFAULT_SPRING: SpringParameters = {
  mass: 1,
  stiffness: 170,
  damping: 22,
};

export const DEFAULT_PRESET_PARAMETERS: MotionPresetParameters = {
  intensity: 1,
  direction: "center",
  easing: null,
  delay: 0,
  springIntensity: 0,
  spring: DEFAULT_SPRING,
};

/** How an applied preset should treat properties that are already animated. */
export type ConflictResolution = "replace" | "keep";

export interface ApplyPresetOptions {
  parameters?: Partial<MotionPresetParameters>;
  /** Composition length the preset is fitted into. */
  duration: number;
  conflict?: ConflictResolution;
}
