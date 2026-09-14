import type { CameraViewId } from "@/engine/devices/device-presets";
import type { MotionTrackSpecs } from "@/engine/motion/preset-types";
import type { BackgroundConfig } from "@/types/background";
import type { Transform } from "@/types/layer";

import type { TemplateTextSpec } from "./project-templates";

/**
 * Device motion templates.
 *
 * Three libraries now, and the boundaries between them are the point:
 *
 * | | Changes | Reach |
 * |---|---|---|
 * | **Motion preset** | animation tracks | one layer, stackable |
 * | **Device motion template** | the device's pose *and* its whole choreography | the device layer, plus the composition length |
 * | **Project template** | canvas, background, device, text, motion | the entire project |
 *
 * A preset is a verb you apply to something. A device motion template is a
 * finished piece of choreography — where the device rests, how long the shot
 * runs, which way the camera is looking, and every beat of the movement
 * between. It is what you reach for when you want the *shot*, not an effect.
 *
 * Why it is not simply a preset with extra fields: a preset must not move the
 * layer's resting transform. Stacking Float onto a device the user placed at
 * the left of frame has to leave it at the left of frame. A choreography, by
 * contrast, is only coherent at the pose it was designed for — Orbit Hero is
 * meaningless if the device is not turned to meet the arc — so it owns the
 * pose, says so on the card, and asks before it takes it.
 *
 * ## The uniqueness rule
 *
 * Fifteen templates that all fade a device in from somewhere would satisfy a
 * count and fail the brief. Every one of these was written against a map of
 * what the other fourteen animate, and no two share a property set. That is
 * checked mechanically in `device-motion.test.ts`, so a sixteenth template that
 * merely recolours a fifteenth cannot get in.
 *
 * ## Easing
 *
 * Curves are named, never hand-rolled, and resolve through the one easing
 * registry the evaluator uses (`@/engine/easing`). `expo`, `circ` and `quint`
 * arrived with this library; `smooth` and `sharp` are quart-out and
 * quart-in-out under names that predate it. Spring shapes are produced by
 * baking a simulated spring into ordinary keyframes rather than by teaching the
 * evaluator physics — see `motion/easing.ts`.
 *
 * ## Why ids carry a `dm-` prefix
 *
 * Three of these — Orbit Hero, Product Turn and Dolly Zoom — name concepts the
 * motion preset library already has an id for, and a project stores both a
 * `templateId` and a `deviceMotionTemplateId`. Without the prefix a bare
 * "dolly-zoom" would be ambiguous the first time anything resolved one without
 * knowing which catalogue it came from. The libraries stay separate; so do
 * their namespaces. A test enforces it.
 */

export const DEVICE_MOTION_CATEGORIES = [
  "entrance",
  "reveal",
  "showcase",
  "cinematic",
  "signature",
] as const;

export type DeviceMotionCategory = (typeof DEVICE_MOTION_CATEGORIES)[number];

export const DEVICE_MOTION_CATEGORY_LABELS: Record<DeviceMotionCategory, string> = {
  entrance: "Entrance",
  reveal: "Reveal",
  showcase: "Showcase",
  cinematic: "Cinematic",
  signature: "Signature",
};

/**
 * Where the movement comes from.
 *
 * Doubles as the filter in the browser and as the arrow drawn on the card, so
 * someone can find "the one that comes in from the right" without reading
 * fifteen descriptions.
 */
export const MOTION_ORIGINS = [
  "top",
  "bottom",
  "left",
  "right",
  "diagonal",
  "outward",
  "rotation",
  "depth-push",
  "depth-pull",
  "orbit",
] as const;

export type MotionOrigin = (typeof MOTION_ORIGINS)[number];

export const MOTION_ORIGIN_LABELS: Record<MotionOrigin, string> = {
  top: "Top → centre",
  bottom: "Bottom → centre",
  left: "Left → centre",
  right: "Right → centre",
  diagonal: "Diagonal → centre",
  outward: "Centre → outward",
  rotation: "3D rotation",
  "depth-push": "Depth push",
  "depth-pull": "Depth pull",
  orbit: "Orbital",
};

export interface DeviceMotionTemplate {
  /** Bumped when the choreography changes. Applied templates are flattened to
   *  keyframes, so this never rewrites an existing project. */
  version: number;
  id: string;
  name: string;
  description: string;
  category: DeviceMotionCategory;
  origin: MotionOrigin;
  /** Seconds. Becomes the composition duration when applied. */
  duration: number;
  /**
   * The pose the choreography resolves to.
   *
   * Relative keyframes offset from here, so the pose is both the resting state
   * and the origin of every measurement in `tracks`.
   */
  pose: Partial<Transform>;
  tracks: MotionTrackSpecs;
  /** Viewport framing this was designed against. Not project data — a request. */
  cameraView?: CameraViewId;
  /** Easing families used, named for the card. */
  easing: string[];
  tags: string[];
  /** Optional extras. Applying them is opt-in, and off unless the user says so. */
  background?: BackgroundConfig;
  text?: TemplateTextSpec[];
}

const VERSION = 1;

/**
 * Magnitudes.
 *
 * Every device in the library is normalised to three scene units tall, so these
 * read the same whichever phone is in the composition. Travel is expressed as a
 * fraction of that: `OFFSCREEN_Y` is far enough that the device is genuinely
 * outside the frame at the top of a 16:9 canvas, not merely high up in it.
 */
const OFFSCREEN_Y = 4.2;
const OFFSCREEN_X = 5.4;

export const DEVICE_MOTION_TEMPLATES: DeviceMotionTemplate[] = [
  // -------------------------------------------------------------------------
  // Entrances
  // -------------------------------------------------------------------------
  {
    version: VERSION,
    id: "dm-floating-hero",
    name: "Floating Hero",
    description: "Drifts up into frame and never quite stops moving.",
    category: "entrance",
    origin: "bottom",
    duration: 4.2,
    pose: { rotationY: -8, rotationX: 3 },
    cameraView: "front",
    easing: ["smooth", "easeInOut"],
    tags: ["float", "hero", "gentle", "ambient", "product"],
    tracks: {
      // The tail is what makes this one. Most entrances stop dead on arrival;
      // this keeps a slow quarter-unit breath going afterwards, so a still
      // frame taken at any point past the entrance still has life in it.
      y: [
        { at: 0, value: -1.9, relative: true, scaled: true, easing: "smooth" },
        { at: 0.42, value: 0.08, relative: true, easing: "easeInOut" },
        { at: 0.64, value: -0.05, relative: true, easing: "easeInOut" },
        { at: 0.84, value: 0.06, relative: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.28, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "dm-vertical-drop",
    name: "Vertical Drop",
    description: "Falls in from above and lands with weight.",
    category: "entrance",
    origin: "top",
    duration: 1.9,
    pose: {},
    cameraView: "front",
    easing: ["easeIn", "back", "smooth"],
    tags: ["drop", "fall", "impact", "squash", "weight"],
    tracks: {
      // Accelerating in and decelerating out would read as a hover. A drop
      // needs `easeIn` on the way down — gravity does not ease out.
      y: [
        { at: 0, value: OFFSCREEN_Y, relative: true, scaled: true, easing: "easeIn" },
        { at: 0.54, value: 0, relative: true, easing: "easeOut" },
        { at: 0.72, value: 0.12, relative: true, easing: "easeIn" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      // The landing squash. Two scale axes moving against each other for four
      // frames is the difference between a device that lands and one that
      // simply stops — and it is the only place in this library they part.
      scaleX: [
        { at: 0, value: 0.97, easing: "easeIn" },
        { at: 0.54, value: 1.07, easing: "easeOut" },
        { at: 0.78, value: 0.99, easing: "easeInOut" },
        { at: 1, value: 1, easing: "smooth" },
      ],
      scaleY: [
        { at: 0, value: 1.04, easing: "easeIn" },
        { at: 0.54, value: 0.92, easing: "easeOut" },
        { at: 0.78, value: 1.01, easing: "easeInOut" },
        { at: 1, value: 1, easing: "smooth" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.18, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "dm-vertical-lift",
    name: "Vertical Lift",
    description: "Rises from below, overshoots, tips back and settles.",
    category: "entrance",
    origin: "bottom",
    duration: 1.7,
    pose: { rotationX: 4 },
    cameraView: "front",
    easing: ["expo", "back"],
    tags: ["lift", "rise", "overshoot", "tilt", "launch"],
    tracks: {
      // `expo` covers most of the distance in the last third, which is what
      // makes a lift feel powered rather than merely upward.
      y: [
        { at: 0, value: -3.4, relative: true, scaled: true, easing: "expo" },
        { at: 0.66, value: 0.34, relative: true, easing: "back" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      // Tipping back through the rise sells the vertical travel: a flat panel
      // moving straight up has no cue that it is moving toward you at all.
      rotationX: [
        { at: 0, value: -9, relative: true, scaled: true, easing: "expo" },
        { at: 0.66, value: 2.5, relative: true, easing: "back" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.3, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "dm-spin-entrance",
    name: "Spin Entrance",
    description: "Turns three quarters into view while growing into place.",
    category: "entrance",
    origin: "rotation",
    duration: 2.2,
    pose: { rotationY: -14, rotationX: 4 },
    cameraView: "front",
    easing: ["circ", "smooth"],
    tags: ["spin", "rotate", "scale", "entrance", "3d"],
    tracks: {
      // `circ` runs near-constant through the middle and arrives slowly, which
      // is exactly how a turn should behave — a cubic ease makes a rotation
      // look like it is being dragged.
      rotationY: [
        { at: 0, value: -250, relative: true, scaled: true, easing: "circ" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      scaleX: [
        { at: 0, value: 0.68, scaled: true, easing: "circ" },
        { at: 1, value: 1, easing: "smooth" },
      ],
      scaleY: [
        { at: 0, value: 0.68, scaled: true, easing: "circ" },
        { at: 1, value: 1, easing: "smooth" },
      ],
      scaleZ: [
        { at: 0, value: 0.68, scaled: true, easing: "circ" },
        { at: 1, value: 1, easing: "smooth" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.26, value: 1, easing: "linear" },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Reveals
  // -------------------------------------------------------------------------
  {
    version: VERSION,
    id: "dm-flip-reveal",
    name: "Flip Reveal",
    description: "Lies face-down, flips upright and comes forward.",
    category: "reveal",
    origin: "rotation",
    duration: 1.8,
    pose: {},
    cameraView: "front",
    easing: ["quint", "back"],
    tags: ["flip", "reveal", "rotationX", "depth", "3d"],
    tracks: {
      // Around X, not Y: the device starts face-down and comes up to meet the
      // camera, which reads as revealing a screen rather than turning an object.
      rotationX: [
        { at: 0, value: -88, relative: true, scaled: true, easing: "quint" },
        { at: 0.74, value: 6, relative: true, easing: "back" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      // Travelling forward through the flip keeps the device the same apparent
      // size while its face is foreshortened; without it the reveal appears to
      // shrink before it opens.
      z: [
        { at: 0, value: -1.4, relative: true, scaled: true, easing: "quint" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.2, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "dm-horizontal-slide",
    name: "Horizontal Slide",
    description: "Comes in from the left, trailing behind itself.",
    category: "entrance",
    origin: "left",
    duration: 1.7,
    pose: {},
    cameraView: "front",
    easing: ["expo", "smooth"],
    tags: ["slide", "left", "momentum", "lean", "entrance"],
    tracks: {
      x: [
        { at: 0, value: -OFFSCREEN_X, relative: true, scaled: true, directional: true, easing: "expo" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      // Momentum. The device leans into the direction of travel and rights
      // itself on arrival — a rigid slab sliding across frame reads as a
      // transition, this reads as an object with mass.
      rotationZ: [
        { at: 0, value: 7, relative: true, scaled: true, directional: true, easing: "expo" },
        { at: 0.72, value: -1.8, relative: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.16, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "dm-right-sweep",
    name: "Right Sweep",
    description: "Sweeps in from the right, turned away, and squares up.",
    category: "entrance",
    origin: "right",
    duration: 1.9,
    pose: { rotationY: -6 },
    cameraView: "right-hero",
    easing: ["circ", "smooth"],
    tags: ["sweep", "right", "turn", "directional", "entrance"],
    tracks: {
      x: [
        { at: 0, value: OFFSCREEN_X, relative: true, scaled: true, easing: "circ" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      // Facing away on entry and turning to camera on arrival. Its sibling,
      // Horizontal Slide, leans in Z instead — same job, different axis, so the
      // pair read as a matched set rather than as one animation mirrored.
      rotationY: [
        { at: 0, value: 34, relative: true, scaled: true, easing: "circ" },
        { at: 0.78, value: -4, relative: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.18, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "dm-diagonal-reveal",
    name: "Diagonal Reveal",
    description: "Travels in on a diagonal from the lower left.",
    category: "reveal",
    origin: "diagonal",
    duration: 2,
    pose: { rotationY: -12, rotationZ: -2 },
    cameraView: "left-hero",
    easing: ["quint", "smooth"],
    tags: ["diagonal", "corner", "editorial", "entrance"],
    tracks: {
      // Both axes on one curve, so the path is a straight diagonal. Giving each
      // axis its own easing would bend it into an arc — which is a different
      // template (Orbit Hero) and should not happen here by accident.
      x: [
        { at: 0, value: -3.6, relative: true, scaled: true, directional: true, easing: "quint" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      y: [
        { at: 0, value: -2.4, relative: true, scaled: true, easing: "quint" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.24, value: 1, easing: "linear" },
      ],
    },
  },

  // -------------------------------------------------------------------------
  // Showcase
  // -------------------------------------------------------------------------
  {
    version: VERSION,
    id: "dm-orbit-hero",
    name: "Orbit Hero",
    description: "Swings around the device on an arc and rests at three quarters.",
    category: "showcase",
    origin: "orbit",
    duration: 4.6,
    pose: { rotationY: -26, rotationX: 5 },
    cameraView: "three-quarter",
    easing: ["circ", "easeInOut"],
    tags: ["orbit", "arc", "product", "hero", "3d"],
    tracks: {
      // An arc, not a slide: X and Z are a quarter-cycle out of phase, so the
      // device travels around a centre instead of across the frame. That phase
      // offset is the entire template.
      x: [
        { at: 0, value: 2.9, relative: true, scaled: true, easing: "circ" },
        { at: 0.5, value: 1.5, relative: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      z: [
        { at: 0, value: -2.2, relative: true, scaled: true, easing: "easeInOut" },
        { at: 0.5, value: 0.5, relative: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "circ" },
      ],
      rotationY: [
        { at: 0, value: 42, relative: true, scaled: true, easing: "circ" },
        { at: 0.5, value: 18, relative: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
    },
  },
  {
    version: VERSION,
    id: "dm-product-turn",
    name: "Product Turn",
    description: "A full turn on the spot, breathing toward the camera.",
    category: "showcase",
    origin: "rotation",
    duration: 5,
    pose: { rotationX: 3 },
    cameraView: "front",
    easing: ["linear", "easeInOut"],
    tags: ["turntable", "360", "loop", "product", "catalogue"],
    tracks: {
      // Linear on purpose. Any easing on a full revolution puts a visible stall
      // at the seam, and this is meant to be left running.
      rotationY: [
        { at: 0, value: 0, relative: true, easing: "linear" },
        { at: 1, value: 360, relative: true, easing: "linear" },
      ],
      // The depth breath is what stops a turntable reading as a GIF: it is out
      // of phase with nothing, returns exactly to where it started, and gives
      // the revolution a reason to be watched twice.
      z: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.5, value: 0.85, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
    },
  },
  {
    version: VERSION,
    id: "dm-cinematic-push",
    name: "Cinematic Push",
    description: "A long, slow push out of depth with a drift of rotation.",
    category: "cinematic",
    origin: "depth-push",
    duration: 6,
    pose: { rotationY: -10, rotationX: 4 },
    cameraView: "front",
    easing: ["expo", "smooth"],
    tags: ["cinematic", "push", "depth", "slow", "title"],
    tracks: {
      // Real depth, not scale. A device that gets bigger is a zoom; a device
      // that comes closer changes its own perspective as it arrives, and only
      // moving it through Z does that.
      z: [
        { at: 0, value: -5.2, relative: true, scaled: true, easing: "expo" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      rotationY: [
        { at: 0, value: 16, relative: true, scaled: true, easing: "expo" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.34, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "dm-dolly-zoom",
    name: "Dolly Zoom",
    description: "Pushes in while scaling back. The vertigo shot.",
    category: "cinematic",
    origin: "depth-pull",
    duration: 3.2,
    // Turned, and that is not a styling choice.
    //
    // A dolly zoom is legible because the subject's *perspective* changes while
    // its size does not. On a phone seen face-on there is almost no perspective
    // to change — it is a flat rectangle, and it stays a flat rectangle of the
    // same size, so the shot reads as nothing happening. A browser sweep found
    // exactly that: at -4 degrees this template rendered indistinguishable from
    // an ambient float.
    //
    // At -28 the device presents its face and its rail together, and moving
    // through depth visibly changes the ratio between them. Framelo's
    // background is a flat layer with no depth of its own, so the subject's own
    // foreshortening is the only cue available — which makes the angle the
    // thing that decides whether this template works at all.
    pose: { rotationY: -28, rotationX: 6 },
    cameraView: "three-quarter",
    easing: ["easeInOut"],
    tags: ["dolly", "vertigo", "counter-motion", "cinematic", "dramatic"],
    tracks: {
      // Counter-motion. Depth and scale cancel, so the device stays roughly the
      // same size on screen while its perspective changes underneath it. Every
      // other template here has its properties pulling the same way.
      //
      // The magnitudes here are the whole difficulty, and the first attempt got
      // them wrong. Starting 2.6 units back with a 1.42 scale cancelled almost
      // perfectly — which sounds like success and is the opposite: the frame
      // became indistinguishable from a device sitting still, because the only
      // thing left changing was a perspective shift too small to read. A
      // browser sweep caught it by finding this template visually identical to
      // an ambient float.
      //
      // The camera sits 7.6 units out. Travelling from -5.6 changes the
      // subject's distance from 13.2 to 7.6 — a 42% change rather than 25% —
      // which is enough foreshortening to see. Scale compensates by the same
      // ratio (13.2 / 7.6 = 1.74) so the subject still holds its size, which is
      // what makes it a dolly zoom rather than a push.
      z: [
        { at: 0, value: -5.6, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      scaleX: [
        { at: 0, value: 1.74, scaled: true, easing: "easeInOut" },
        { at: 1, value: 1, easing: "easeInOut" },
      ],
      scaleY: [
        { at: 0, value: 1.74, scaled: true, easing: "easeInOut" },
        { at: 1, value: 1, easing: "easeInOut" },
      ],
    },
  },
  {
    version: VERSION,
    id: "dm-magnetic-landing",
    name: "Magnetic Landing",
    description: "Pulls back against the target, then snaps into it.",
    category: "signature",
    origin: "diagonal",
    duration: 2.4,
    pose: { rotationY: -16, rotationX: 4 },
    cameraView: "left-hero",
    easing: ["easeIn", "back", "smooth"],
    tags: ["magnetic", "anticipation", "snap", "spring", "signature"],
    tracks: {
      // Anticipation: it moves *away* before it moves toward. That backward
      // beat at 0.24 is the whole template — without it this is a diagonal
      // slide, and with it the device reads as being pulled by something.
      x: [
        { at: 0, value: -2.8, relative: true, scaled: true, easing: "easeOut" },
        { at: 0.24, value: -3.3, relative: true, scaled: true, easing: "easeIn" },
        { at: 0.78, value: 0.18, relative: true, easing: "back" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      y: [
        { at: 0, value: -1.3, relative: true, scaled: true, easing: "easeOut" },
        { at: 0.24, value: -1.6, relative: true, scaled: true, easing: "easeIn" },
        { at: 0.78, value: 0.1, relative: true, easing: "back" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      scaleX: [
        { at: 0, value: 0.86, scaled: true, easing: "easeIn" },
        { at: 0.78, value: 1.03, easing: "back" },
        { at: 1, value: 1, easing: "smooth" },
      ],
      scaleY: [
        { at: 0, value: 0.86, scaled: true, easing: "easeIn" },
        { at: 0.78, value: 1.03, easing: "back" },
        { at: 1, value: 1, easing: "smooth" },
      ],
      scaleZ: [
        { at: 0, value: 0.86, scaled: true, easing: "easeIn" },
        { at: 0.78, value: 1.03, easing: "back" },
        { at: 1, value: 1, easing: "smooth" },
      ],
    },
  },
  {
    version: VERSION,
    id: "dm-card-flip",
    name: "Card Flip",
    description: "Turns edge-on like a card and lands showing its face.",
    category: "reveal",
    origin: "rotation",
    duration: 1.5,
    pose: {},
    cameraView: "front",
    easing: ["sharp", "back"],
    tags: ["card", "flip", "half-turn", "snap", "reveal"],
    tracks: {
      // A half turn, and `sharp` keeps the slowest part of it at the edge-on
      // midpoint — which is where there is least to look at. Racing through
      // the middle is what makes this read as a card rather than as a spin.
      rotationY: [
        { at: 0, value: 180, relative: true, scaled: true, directional: true, easing: "sharp" },
        { at: 0.82, value: -8, relative: true, easing: "back" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      rotationZ: [
        { at: 0, value: -5, relative: true, scaled: true, directional: true, easing: "sharp" },
        { at: 1, value: 0, relative: true, easing: "smooth" },
      ],
      // A whisker of vertical stretch through the turn. Cards are not rigid.
      scaleY: [
        { at: 0, value: 1.05, scaled: true, easing: "sharp" },
        { at: 0.5, value: 0.96, easing: "easeInOut" },
        { at: 1, value: 1, easing: "smooth" },
      ],
    },
  },
  {
    version: VERSION,
    id: "dm-premium-showcase",
    name: "Premium Showcase",
    description: "Five beats: bloom, lift, turn, settle, float.",
    category: "signature",
    origin: "outward",
    duration: 7,
    pose: { rotationY: -22, rotationX: 5 },
    cameraView: "three-quarter",
    easing: ["circ", "expo", "easeInOut"],
    tags: ["showcase", "multi-stage", "premium", "hero", "signature", "long"],
    tracks: {
      // The only genuinely multi-stage piece in the library. Each track has its
      // own beats and they deliberately do not line up: the turn begins while
      // the lift is still finishing, which is what keeps a seven-second shot
      // from reading as four separate animations played in a row.
      scaleX: [
        { at: 0, value: 0.55, scaled: true, easing: "circ" },
        { at: 0.22, value: 1.02, easing: "easeInOut" },
        { at: 0.34, value: 1, easing: "easeInOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.55, scaled: true, easing: "circ" },
        { at: 0.22, value: 1.02, easing: "easeInOut" },
        { at: 0.34, value: 1, easing: "easeInOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
      scaleZ: [
        { at: 0, value: 0.55, scaled: true, easing: "circ" },
        { at: 0.34, value: 1, easing: "easeInOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
      y: [
        { at: 0, value: -0.55, relative: true, scaled: true, easing: "circ" },
        { at: 0.18, value: -0.4, relative: true, easing: "expo" },
        { at: 0.46, value: 0.28, relative: true, easing: "easeInOut" },
        { at: 0.72, value: 0.16, relative: true, easing: "easeInOut" },
        { at: 0.88, value: 0.24, relative: true, easing: "easeInOut" },
        { at: 1, value: 0.2, relative: true, easing: "easeInOut" },
      ],
      z: [
        { at: 0, value: -1.8, relative: true, scaled: true, easing: "circ" },
        { at: 0.46, value: -0.3, relative: true, easing: "expo" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      rotationY: [
        { at: 0, value: 30, relative: true, scaled: true, easing: "easeInOut" },
        { at: 0.34, value: 24, relative: true, easing: "circ" },
        { at: 0.68, value: -3, relative: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      rotationX: [
        { at: 0, value: -6, relative: true, scaled: true, easing: "circ" },
        { at: 0.46, value: 2.2, relative: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.16, value: 1, easing: "linear" },
      ],
    },
  },
];

const BY_ID = new Map(DEVICE_MOTION_TEMPLATES.map((template) => [template.id, template]));

export function getDeviceMotionTemplate(id: string): DeviceMotionTemplate | undefined {
  return BY_ID.get(id);
}

/** Categories that actually have templates in them. */
export function activeDeviceMotionCategories(): DeviceMotionCategory[] {
  const present = new Set(DEVICE_MOTION_TEMPLATES.map((template) => template.category));
  return DEVICE_MOTION_CATEGORIES.filter((category) => present.has(category));
}

/**
 * Search the catalogue.
 *
 * Matches name, description and tags so "from the right", "vertigo" and
 * "bounce" all find something — the words people actually use are rarely the
 * words on the card.
 */
export function searchDeviceMotionTemplates(
  category: DeviceMotionCategory | "all",
  query: string,
): DeviceMotionTemplate[] {
  const needle = query.trim().toLowerCase();

  return DEVICE_MOTION_TEMPLATES.filter((template) => {
    if (category !== "all" && template.category !== category) return false;
    if (!needle) return true;

    return (
      template.name.toLowerCase().includes(needle) ||
      template.description.toLowerCase().includes(needle) ||
      template.origin.includes(needle) ||
      MOTION_ORIGIN_LABELS[template.origin].toLowerCase().includes(needle) ||
      template.tags.some((tag) => tag.includes(needle))
    );
  });
}

/** Re-exported so the store can type its action without importing the builder. */
export type { DeviceMotionBuild } from "./device-motion-builder";
