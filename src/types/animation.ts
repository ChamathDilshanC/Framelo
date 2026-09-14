/**
 * Animation data model.
 *
 * Every animatable property owns a single track of keyframes. The timeline's
 * `currentTime` is the only source of truth: the engine derives values from it.
 */

/**
 * The properties every layer has, because every layer has a transform.
 */
export const TRANSFORM_PROPERTIES = [
  "x",
  "y",
  "z",
  "rotationX",
  "rotationY",
  "rotationZ",
  "scaleX",
  "scaleY",
  "scaleZ",
  "opacity",
] as const;

export type TransformProperty = (typeof TRANSFORM_PROPERTIES)[number];

/**
 * Properties only a text layer has.
 *
 * These are ordinary tracks on the ordinary `animations` array — the same
 * keyframes, the same easing, the same evaluator. What differs is only where
 * the evaluated number is *read*: the transform properties become a matrix,
 * these become typography. That is deliberate; a separate keyframe system for
 * text would mean a second timeline, a second undo path and a second exporter.
 *
 * `reveal` is the one that earns its place. It runs 0 → 1 and says how much of
 * the text is shown, which is what makes typewriter and letter/word reveals a
 * normal animation curve: scrubbable, serializable, and identical in the
 * editor, the export and a shared link. The alternative — a timer ticking
 * characters out — is none of those things.
 */
export const TEXT_PROPERTIES = [
  "fontSize",
  "letterSpacing",
  "lineHeight",
  "reveal",
  "blur",
] as const;

export type TextAnimatableProperty = (typeof TEXT_PROPERTIES)[number];

export const ANIMATABLE_PROPERTIES = [...TRANSFORM_PROPERTIES, ...TEXT_PROPERTIES] as const;

export type AnimatableProperty = (typeof ANIMATABLE_PROPERTIES)[number];

const TRANSFORM_PROPERTY_SET: ReadonlySet<string> = new Set(TRANSFORM_PROPERTIES);

/** Narrows a track's property to one the transform actually carries. */
export function isTransformProperty(property: string): property is TransformProperty {
  return TRANSFORM_PROPERTY_SET.has(property);
}

/**
 * Easing curves, stored by name in the project file.
 *
 * Append-only: a name that has ever been written to a project must keep
 * resolving, so curves are added to the end and never removed or repurposed.
 * The first four are the original set; the rest arrived with the motion
 * library and give it the overshoot and settle that separate designed motion
 * from a linear tween.
 */
export const EASING_TYPES = [
  "linear",
  "easeIn",
  "easeOut",
  "easeInOut",
  "smooth",
  "sharp",
  "back",
  "elastic",
  "spring",
  // Added with the easing editor. Three genuinely new shapes — the families a
  // motion tool is expected to offer that this list did not already contain.
  // `cubic`, `quart` and their in-out forms are deliberately absent: `easeIn`,
  // `easeOut` and `easeInOut` *are* the cubic family, and `smooth` and `sharp`
  // are quart-out and quart-in-out. Adding a second name for a curve that is
  // already here would put two chips in the editor that do the same thing.
  "expo",
  "circ",
  "quint",
] as const;

export type EasingType = (typeof EASING_TYPES)[number];

export interface Keyframe {
  id: string;
  time: number;
  value: number;
  /** Easing applied on the segment that *starts* at this keyframe. */
  easing: EasingType;
}

export interface AnimationTrack {
  property: AnimatableProperty;
  keyframes: Keyframe[];
}

/**
 * Display names.
 *
 * Several carry their mathematical family in brackets. That is not decoration:
 * someone arriving from After Effects looks for "quart", and without the hint
 * they would never find it behind the name "Smooth" and would ask for a curve
 * the library already has.
 */
export const EASING_LABELS: Record<EasingType, string> = {
  linear: "Linear",
  easeIn: "Ease In",
  easeOut: "Ease Out",
  easeInOut: "Ease In Out (Cubic)",
  smooth: "Smooth (Quart Out)",
  sharp: "Sharp (Quart In Out)",
  back: "Back",
  elastic: "Elastic",
  spring: "Spring",
  expo: "Expo",
  circ: "Circ",
  quint: "Quint",
};

export const PROPERTY_LABELS: Record<AnimatableProperty, string> = {
  x: "Position X",
  y: "Position Y",
  z: "Position Z",
  rotationX: "Rotation X",
  rotationY: "Rotation Y",
  rotationZ: "Rotation Z",
  scaleX: "Scale X",
  scaleY: "Scale Y",
  scaleZ: "Scale Z",
  opacity: "Opacity",
  fontSize: "Font Size",
  letterSpacing: "Letter Spacing",
  lineHeight: "Line Height",
  reveal: "Reveal",
  blur: "Blur",
};
