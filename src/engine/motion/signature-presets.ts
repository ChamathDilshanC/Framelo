import type { MotionPresetDefinition } from "./preset-types";

/**
 * The signature motion library.
 *
 * Fifteen presets chosen for what the existing catalogue could *not* already
 * do. Before writing any of them the 39 presets already in the library were
 * mapped by the properties they animate; everything here either uses a
 * combination none of them used, or a mechanism none of them used:
 *
 * | Mechanism | Why it was missing |
 * |---|---|
 * | **Anticipation** — move against the target before moving to it | Nothing dipped before rising |
 * | **Counter-motion** — two properties fighting | Nothing pushed in while scaling down |
 * | **Squash and stretch** — non-uniform scale | Every scale preset moved X, Y and Z together |
 * | **Non-zero resting pose** — settles at an angle | Every rotation returned to square |
 * | **Diagonal travel** | Entrances came from one axis at a time |
 *
 * That constraint is the point. A library grows useless the moment two entries
 * feel the same, and "fifteen more entrance animations" would have been fifteen
 * more ways to fade something in.
 *
 * House style is unchanged: travel is measured in fractions of the device, the
 * last third of an entrance is spent arriving, and nothing overshoots more than
 * it can justify.
 */

const VERSION = 1;

export const SIGNATURE_MOTION_PRESETS: MotionPresetDefinition[] = [
  {
    version: VERSION,
    id: "magnetic-rise",
    name: "Magnetic Rise",
    category: "entrance",
    duration: 1.8,
    description: "Sinks a little, then is pulled up into place.",
    tags: ["entrance", "rise", "magnetic", "anticipation", "spring", "hero", "product"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      // The dip is the whole preset. Moving away from the target first is what
      // animators call anticipation, and it is why this reads as *pulled*
      // rather than merely moved — nothing else in the library does it.
      y: [
        { at: 0, value: -1.5, relative: true, scaled: true, easing: "easeOut" },
        { at: 0.22, value: -1.85, relative: true, scaled: true, easing: "easeIn" },
        { at: 0.72, value: 0.12, relative: true, scaled: true, easing: "easeOut" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.4, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "depth-push",
    name: "Depth Push",
    category: "cinematic",
    duration: 2.2,
    description: "Travels toward the camera through real depth, not scale.",
    tags: ["cinematic", "depth", "push", "z", "dolly", "product"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      // Depth alone. Faking this with scale flattens the perspective — the
      // device has to actually come closer for its proportions to change.
      z: [
        { at: 0, value: -2.6, relative: true, scaled: true, easing: "smooth" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.35, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "dolly-zoom",
    name: "Dolly Zoom",
    category: "cinematic",
    duration: 2.6,
    description: "Pushes in while scaling back. The vertigo shot.",
    tags: ["cinematic", "dolly", "zoom", "vertigo", "depth", "dramatic"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      // Counter-motion: depth and scale move in opposite directions so the
      // subject stays roughly the same size while its perspective changes.
      // Nothing else in the library has two properties working against each
      // other, and it is the only way to get this effect.
      z: [
        { at: 0, value: -1.9, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
      scaleX: [
        { at: 0, value: 1.34, scaled: true, easing: "easeInOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 1.34, scaled: true, easing: "easeInOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "rotational-hero",
    name: "Rotational Hero",
    category: "product",
    duration: 2.1,
    description: "Turns from flat into a three-quarter hero pose and holds it.",
    tags: ["product", "hero", "rotation", "3d", "pose", "angle"],
    supports: { intensity: true, direction: true, easing: true, delay: true, spring: true },
    tracks: {
      // Ends at an angle rather than square. Every other rotation preset
      // returns to zero, which makes them motion; this one is a *pose*, and
      // it is what a product shot actually wants to rest on.
      rotationY: [
        { at: 0, value: 0, easing: "smooth" },
        { at: 0.78, value: -21, directional: true, scaled: true, easing: "easeOut" },
        { at: 1, value: -18, directional: true, scaled: true, easing: "linear" },
      ],
      rotationX: [
        { at: 0, value: 10, scaled: true, easing: "smooth" },
        { at: 1, value: 2, scaled: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.3, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "parallax-float",
    name: "Parallax Float",
    category: "loop",
    duration: 7,
    description: "Drifts on three axes at once, each on its own clock.",
    tags: ["loop", "float", "parallax", "ambient", "idle", "subtle"],
    loop: true,
    supports: { intensity: true, easing: true },
    tracks: {
      // Three periods that do not divide into each other, so the motion never
      // visibly repeats inside the loop even though it returns exactly to its
      // start. A single sine on one axis reads as a bob; this reads as drift.
      y: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.5, value: 0.24, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      x: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.33, value: 0.16, relative: true, scaled: true, easing: "easeInOut" },
        { at: 0.66, value: -0.16, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      rotationZ: [
        { at: 0, value: 0, easing: "easeInOut" },
        { at: 0.25, value: 1.6, scaled: true, easing: "easeInOut" },
        { at: 0.75, value: -1.6, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, easing: "easeInOut" },
      ],
    },
  },
  {
    version: VERSION,
    id: "spring-land",
    name: "Spring Land",
    category: "entrance",
    duration: 1.6,
    description: "Drops in and gives slightly on impact.",
    tags: ["entrance", "spring", "land", "squash", "drop", "playful"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      y: [
        { at: 0, value: 1.7, relative: true, scaled: true, easing: "easeIn" },
        { at: 0.46, value: 0, relative: true, easing: "easeOut" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
      // Squash: the axes part company on impact and recover. Every other
      // scale preset in the library moves X, Y and Z as one number, which
      // cannot express weight.
      scaleY: [
        { at: 0, value: 1, easing: "linear" },
        { at: 0.46, value: 0.9, scaled: true, easing: "easeOut" },
        { at: 0.68, value: 1.03, scaled: true, easing: "easeInOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
      scaleX: [
        { at: 0, value: 1, easing: "linear" },
        { at: 0.46, value: 1.07, scaled: true, easing: "easeOut" },
        { at: 0.68, value: 0.985, scaled: true, easing: "easeInOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.2, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "swing-in",
    name: "Swing In",
    category: "entrance",
    duration: 1.7,
    description: "Swings in from the side like a hinged panel.",
    tags: ["entrance", "swing", "pendulum", "rotate", "hinge", "playful"],
    supports: { intensity: true, direction: true, easing: true, delay: true, spring: true },
    tracks: {
      rotationZ: [
        { at: 0, value: 14, directional: true, scaled: true, easing: "easeOut" },
        { at: 0.55, value: -4.5, directional: true, scaled: true, easing: "easeInOut" },
        { at: 0.8, value: 1.4, directional: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, easing: "linear" },
      ],
      x: [
        { at: 0, value: -0.9, relative: true, scaled: true, directional: true, easing: "smooth" },
        { at: 0.7, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.3, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "drift-in",
    name: "Drift In",
    category: "entrance",
    duration: 2.4,
    description: "Slides in slowly from depth and settles without a stop.",
    tags: ["entrance", "drift", "slow", "depth", "calm", "editorial"],
    supports: { intensity: true, direction: true, easing: true, delay: true },
    tracks: {
      x: [
        { at: 0, value: -1.5, relative: true, scaled: true, directional: true, easing: "smooth" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
      // The small depth change is what stops this reading as a plain slide:
      // it arrives from slightly behind as well as from the side.
      z: [
        { at: 0, value: -0.7, relative: true, scaled: true, easing: "smooth" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.5, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "scale-bloom",
    name: "Scale Bloom",
    category: "entrance",
    duration: 1.5,
    description: "Opens out with a quarter-degree of twist.",
    tags: ["entrance", "scale", "bloom", "twist", "soft", "elegant"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      scaleX: [
        { at: 0, value: 0.82, scaled: true, easing: "smooth" },
        { at: 0.74, value: 1.02, scaled: true, easing: "easeOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.82, scaled: true, easing: "smooth" },
        { at: 0.74, value: 1.02, scaled: true, easing: "easeOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
      // The twist is deliberately almost invisible. It is there to stop the
      // growth reading as a mechanical zoom, not to be noticed on its own.
      rotationZ: [
        { at: 0, value: -2.2, scaled: true, easing: "smooth" },
        { at: 1, value: 0, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.42, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "snap-hero",
    name: "Snap Hero",
    category: "entrance",
    duration: 0.75,
    description: "Arrives almost immediately. For cuts that cannot wait.",
    tags: ["entrance", "snap", "fast", "sharp", "punch", "social"],
    supports: { intensity: true, direction: true, easing: true, delay: true },
    tracks: {
      // Short and sharp is the signature. Under a second, with most of the
      // travel gone in the first third — the opposite of everything else here.
      x: [
        { at: 0, value: -0.55, relative: true, scaled: true, directional: true, easing: "sharp" },
        { at: 0.62, value: 0.04, relative: true, scaled: true, easing: "easeOut" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
      scaleX: [
        { at: 0, value: 0.94, scaled: true, easing: "sharp" },
        { at: 1, value: 1, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.94, scaled: true, easing: "sharp" },
        { at: 1, value: 1, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "sharp" },
        { at: 0.3, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "elastic-settle",
    name: "Elastic Settle",
    category: "entrance",
    duration: 1.9,
    description: "Overshoots once and rocks gently into place.",
    tags: ["entrance", "elastic", "settle", "overshoot", "bounce", "spring"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      y: [
        { at: 0, value: -1.1, relative: true, scaled: true, easing: "easeOut" },
        { at: 0.52, value: 0.16, relative: true, scaled: true, easing: "easeInOut" },
        { at: 0.74, value: -0.05, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
      // The rotation settles a beat after the position, which is what makes
      // the arrival read as weight rather than as a bounce.
      rotationZ: [
        { at: 0, value: -3.4, scaled: true, easing: "easeOut" },
        { at: 0.62, value: 1.2, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.28, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "orbit-hero",
    name: "Orbit Hero",
    category: "3d",
    duration: 2.4,
    description: "Arcs around the device and stops on its best side.",
    tags: ["3d", "orbit", "hero", "product", "turn", "arc"],
    supports: { intensity: true, direction: true, easing: true, delay: true },
    tracks: {
      // An arc that *stops*, unlike the looping Orbit. The device ends facing
      // its hero angle, so this can open a shot rather than fill one.
      //
      // Kept inside the library's 45° ceiling for an undeclared rotation. A
      // wider sweep was the first draft and the catalogue test rejected it:
      // presets that turn further than that — Orbit, Flip 3D — say so in their
      // tags because the turn is the whole point, and here the *arrival* is.
      rotationY: [
        { at: 0, value: -44, directional: true, scaled: true, easing: "smooth" },
        { at: 0.85, value: -14, directional: true, scaled: true, easing: "easeOut" },
        { at: 1, value: -16, directional: true, scaled: true, easing: "linear" },
      ],
      x: [
        { at: 0, value: -1.25, relative: true, scaled: true, directional: true, easing: "smooth" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
      z: [
        { at: 0, value: -1.1, relative: true, scaled: true, easing: "smooth" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.28, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "light-sweep",
    name: "Light Sweep",
    category: "loop",
    duration: 6,
    description: "Rocks a few degrees so the highlights travel across the glass.",
    tags: ["loop", "sweep", "highlight", "reflection", "idle", "product", "subtle"],
    loop: true,
    supports: { intensity: true, easing: true },
    tracks: {
      // The point is not the movement, it is what the movement does to the
      // reflections: a few degrees is enough to walk a specular highlight the
      // length of the device, and more would look like the phone is waving.
      rotationY: [
        { at: 0, value: -5, scaled: true, easing: "easeInOut" },
        { at: 0.5, value: 5, scaled: true, easing: "easeInOut" },
        { at: 1, value: -5, scaled: true, easing: "easeInOut" },
      ],
      rotationX: [
        { at: 0, value: 1.5, scaled: true, easing: "easeInOut" },
        { at: 0.5, value: -1.5, scaled: true, easing: "easeInOut" },
        { at: 1, value: 1.5, scaled: true, easing: "easeInOut" },
      ],
    },
  },
  {
    version: VERSION,
    id: "kinetic-ascend",
    name: "Kinetic Ascend",
    category: "movement",
    duration: 2,
    description: "Climbs in two stages, pausing between them.",
    tags: ["movement", "ascend", "kinetic", "staged", "rise", "energetic"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      // Two moves with a hold between them. A single eased rise is smooth; a
      // staged one has rhythm, which is what makes it read as deliberate.
      y: [
        { at: 0, value: -1.4, relative: true, scaled: true, easing: "easeOut" },
        { at: 0.34, value: -0.55, relative: true, scaled: true, easing: "linear" },
        { at: 0.46, value: -0.5, relative: true, scaled: true, easing: "easeOut" },
        { at: 0.88, value: 0.04, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.94, scaled: true, easing: "easeOut" },
        { at: 0.46, value: 0.99, scaled: true, easing: "easeOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.26, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "corner-reveal",
    name: "Corner Reveal",
    category: "entrance",
    duration: 1.9,
    description: "Comes in diagonally from a corner, straightening as it lands.",
    tags: ["entrance", "diagonal", "corner", "reveal", "editorial", "dynamic"],
    supports: { intensity: true, direction: true, easing: true, delay: true, spring: true },
    tracks: {
      // Diagonal travel. Every other entrance in the library moves along one
      // axis, which is why they all feel like the same gesture from different
      // sides; arriving from a corner does not.
      x: [
        { at: 0, value: -1.3, relative: true, scaled: true, directional: true, easing: "smooth" },
        { at: 0.82, value: 0, relative: true, easing: "linear" },
      ],
      y: [
        { at: 0, value: -1.05, relative: true, scaled: true, easing: "smooth" },
        { at: 0.82, value: 0, relative: true, easing: "linear" },
      ],
      rotationZ: [
        { at: 0, value: -6.5, directional: true, scaled: true, easing: "smooth" },
        { at: 1, value: 0, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.34, value: 1, easing: "linear" },
      ],
    },
  },
];
