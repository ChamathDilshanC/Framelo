import type { MotionPresetDefinition } from "./preset-types";

/**
 * Text motion.
 *
 * Same data model as the device library and the same generator — these are
 * ordinary presets that happen to declare `appliesTo: ["text"]`, so they appear
 * only when a text layer is selected and produce ordinary keyframes when
 * applied. There is no separate text animation system (§72).
 *
 * Two things differ from the device presets, both because of scale:
 *
 * 1. **Travel is much smaller.** A device is 3 world units tall; a 64px
 *    headline is about a quarter of one. A device's 1.6-unit rise would throw
 *    text clean out of frame, so travel here is measured in tenths.
 *
 * 2. **They end sooner.** A headline is read, not admired: 1.2-1.8 seconds is
 *    an entrance, and anything longer keeps the viewer waiting for words they
 *    can already half-see.
 *
 * The house style is the same one the device library follows — ease out, a
 * short settle, no bounce for its own sake (§64).
 */

const VERSION = 1;

/** Opacity ramp shared by most entrances: in early, so the motion is visible. */
const FADE_IN = [
  { at: 0, value: 0, easing: "easeOut" as const },
  { at: 0.5, value: 1, easing: "linear" as const },
];

export const TEXT_MOTION_PRESETS: MotionPresetDefinition[] = [
  {
    version: VERSION,
    id: "text-fade-in",
    name: "Fade In",
    category: "text",
    appliesTo: ["text"],
    duration: 1.2,
    description: "Simply appears. The safe choice under a headline.",
    tags: ["text", "entrance", "fade", "subtle", "simple"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "text-slide-up",
    name: "Slide Up",
    category: "text",
    appliesTo: ["text"],
    duration: 1.4,
    description: "Rises a short distance and settles. The default for a headline.",
    tags: ["text", "entrance", "up", "rise", "slide"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      y: [
        { at: 0, value: -0.34, relative: true, scaled: true, easing: "smooth" },
        { at: 0.75, value: 0, relative: true, easing: "linear" },
      ],
      opacity: FADE_IN,
    },
  },
  {
    version: VERSION,
    id: "text-slide-down",
    name: "Slide Down",
    category: "text",
    appliesTo: ["text"],
    duration: 1.4,
    description: "Drops in from above.",
    tags: ["text", "entrance", "down", "slide"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      y: [
        { at: 0, value: 0.34, relative: true, scaled: true, easing: "smooth" },
        { at: 0.75, value: 0, relative: true, easing: "linear" },
      ],
      opacity: FADE_IN,
    },
  },
  {
    version: VERSION,
    id: "text-slide-left",
    name: "Slide Left",
    category: "text",
    appliesTo: ["text"],
    duration: 1.4,
    description: "Enters from the right and eases to rest.",
    tags: ["text", "entrance", "slide", "horizontal", "left"],
    supports: { intensity: true, direction: true, easing: true, delay: true, spring: true },
    tracks: {
      x: [
        { at: 0, value: 0.5, relative: true, scaled: true, directional: true, easing: "smooth" },
        { at: 0.75, value: 0, relative: true, easing: "linear" },
      ],
      opacity: FADE_IN,
    },
  },
  {
    version: VERSION,
    id: "text-slide-right",
    name: "Slide Right",
    category: "text",
    appliesTo: ["text"],
    duration: 1.4,
    description: "Enters from the left and eases to rest.",
    tags: ["text", "entrance", "slide", "horizontal", "right"],
    supports: { intensity: true, direction: true, easing: true, delay: true, spring: true },
    tracks: {
      x: [
        { at: 0, value: -0.5, relative: true, scaled: true, directional: true, easing: "smooth" },
        { at: 0.75, value: 0, relative: true, easing: "linear" },
      ],
      opacity: FADE_IN,
    },
  },
  {
    version: VERSION,
    id: "text-scale-in",
    // Not "Scale In": the device library already has one, and device presets
    // are offered for text too, so a text layer would show two cards with the
    // same name. This one is the gentler, type-tuned version.
    name: "Gentle Scale",
    category: "text",
    appliesTo: ["text"],
    duration: 1.3,
    description: "Grows into place from slightly small.",
    tags: ["text", "entrance", "scale", "zoom", "grow"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      // 0.88 rather than 0: text scaling from nothing reads as a glitch, and
      // the last 12% is where the movement is legible anyway.
      scaleX: [
        { at: 0, value: 0.88, scaled: true, easing: "smooth" },
        { at: 0.8, value: 1, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.88, scaled: true, easing: "smooth" },
        { at: 0.8, value: 1, easing: "linear" },
      ],
      opacity: FADE_IN,
    },
  },
  {
    version: VERSION,
    id: "text-pop-in",
    name: "Quick Pop",
    category: "text",
    appliesTo: ["text"],
    duration: 1.1,
    description: "Overshoots slightly, then settles. Good on a badge or a CTA.",
    tags: ["text", "entrance", "pop", "scale", "overshoot", "playful"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      scaleX: [
        { at: 0, value: 0.8, scaled: true, easing: "easeOut" },
        { at: 0.55, value: 1.05, easing: "back" },
        { at: 1, value: 1, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.8, scaled: true, easing: "easeOut" },
        { at: 0.55, value: 1.05, easing: "back" },
        { at: 1, value: 1, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.35, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "text-bounce-in",
    name: "Bounce In",
    category: "text",
    appliesTo: ["text"],
    duration: 1.5,
    description: "Drops in and settles with a controlled bounce.",
    tags: ["text", "entrance", "bounce", "playful", "drop"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      y: [
        { at: 0, value: 0.45, relative: true, scaled: true, easing: "easeIn" },
        // One overshoot and one correction. More than that stops reading as
        // weight and starts reading as a wobble (§64).
        { at: 0.55, value: -0.08, relative: true, scaled: true, easing: "easeOut" },
        { at: 0.78, value: 0.02, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.3, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "text-blur-reveal",
    name: "Blur Reveal",
    category: "text",
    appliesTo: ["text"],
    duration: 1.6,
    description: "Resolves out of a soft blur, like a lens pulling focus.",
    tags: ["text", "entrance", "blur", "focus", "cinematic", "reveal"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      // A real Gaussian blur, rasterised per sampled frame — not a scale
      // pretending to be one.
      blur: [
        { at: 0, value: 14, scaled: true, easing: "smooth" },
        { at: 0.8, value: 0, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.4, value: 1, easing: "linear" },
      ],
      scaleX: [
        { at: 0, value: 1.04, scaled: true, easing: "smooth" },
        { at: 0.85, value: 1, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 1.04, scaled: true, easing: "smooth" },
        { at: 0.85, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "text-typewriter",
    name: "Typewriter",
    category: "text",
    appliesTo: ["text"],
    duration: 2.2,
    description: "Types out one character at a time.",
    tags: ["text", "typewriter", "reveal", "characters", "terminal", "type"],
    supports: { easing: true, delay: true },
    revealMode: "characters",
    tracks: {
      // Linear on purpose: a typist does not accelerate, and an eased
      // typewriter looks like a dropped frame rather than a person typing.
      reveal: [
        { at: 0, value: 0, easing: "linear" },
        { at: 1, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "text-word-reveal",
    name: "Word Reveal",
    category: "text",
    appliesTo: ["text"],
    duration: 1.8,
    description: "Builds the line one word at a time.",
    tags: ["text", "reveal", "words", "kinetic", "build"],
    supports: { easing: true, delay: true },
    revealMode: "words",
    tracks: {
      reveal: [
        { at: 0, value: 0, easing: "smooth" },
        { at: 1, value: 1, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 1, easing: "linear" },
        { at: 1, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "text-letter-reveal",
    name: "Letter Reveal",
    category: "text",
    appliesTo: ["text"],
    duration: 1.6,
    description: "Letters arrive in sequence, easing as the line completes.",
    tags: ["text", "reveal", "letters", "characters", "kinetic"],
    supports: { easing: true, delay: true },
    revealMode: "characters",
    tracks: {
      // Unlike the typewriter this eases out, so the line finishes gracefully
      // rather than stopping dead on its last letter.
      reveal: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "text-tracking-reveal",
    name: "Tracking Reveal",
    category: "text",
    appliesTo: ["text"],
    duration: 1.8,
    description: "Letter spacing closes up as the line fades in.",
    tags: ["text", "tracking", "letter spacing", "editorial", "luxury", "reveal"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      letterSpacing: [
        { at: 0, value: 18, scaled: true, easing: "smooth" },
        { at: 0.85, value: 0, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.5, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "text-kinetic-rise",
    name: "Kinetic Rise",
    category: "text",
    appliesTo: ["text"],
    duration: 1.7,
    description: "Words rise into place as the line builds. Social-ready.",
    tags: ["text", "kinetic", "words", "rise", "social", "energetic"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    revealMode: "words",
    tracks: {
      reveal: [
        { at: 0, value: 0, easing: "smooth" },
        { at: 0.8, value: 1, easing: "linear" },
      ],
      y: [
        { at: 0, value: -0.22, relative: true, scaled: true, easing: "smooth" },
        { at: 0.85, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.25, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "text-cinematic",
    name: "Cinematic Text",
    category: "text",
    appliesTo: ["text"],
    duration: 2.6,
    description: "A slow push with tracking and a long settle. Title-card pacing.",
    tags: ["text", "cinematic", "title", "slow", "premium", "push"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      scaleX: [
        { at: 0, value: 1.08, scaled: true, easing: "smooth" },
        { at: 1, value: 1, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 1.08, scaled: true, easing: "smooth" },
        { at: 1, value: 1, easing: "linear" },
      ],
      letterSpacing: [
        { at: 0, value: 8, scaled: true, easing: "smooth" },
        { at: 1, value: 0, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        // Takes its time: the slow fade is most of what makes this read as a
        // title card rather than a notification.
        { at: 0.55, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "text-line-reveal",
    name: "Line Reveal",
    category: "text",
    appliesTo: ["text"],
    duration: 2,
    description: "Brings a paragraph in line by line.",
    tags: ["text", "reveal", "lines", "paragraph", "build", "editorial"],
    supports: { easing: true, delay: true },
    revealMode: "lines",
    tracks: {
      // `lines` counts *rendered* lines, so this follows the wrap: narrowing
      // the text box changes how many beats the reveal has, which is correct —
      // the animation is about the shape on screen, not the source string.
      reveal: [
        { at: 0, value: 0, easing: "smooth" },
        { at: 0.88, value: 1, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.12, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "text-mask-reveal",
    name: "Mask Reveal",
    category: "text",
    appliesTo: ["text"],
    duration: 1.5,
    description: "Wipes in from the left as though a mask were pulled back.",
    tags: ["text", "mask", "wipe", "reveal", "editorial", "clean"],
    supports: { intensity: true, easing: true, delay: true },
    // Characters rather than words: at this speed the eye reads a moving edge,
    // and a word-by-word step is visible as a stutter.
    revealMode: "characters",
    tracks: {
      // There is no real alpha mask here and this does not pretend there is.
      //
      // A true mask needs a second pass — render the text, then composite it
      // through a gradient — and adding one to the text renderer would cost a
      // framebuffer per text layer for an effect that can be had another way.
      // What this does instead is genuinely a wipe: the reveal edge sweeps
      // across at a constant rate while the line slides a little the other
      // way, which is what a mask wipe looks like. `expo` keeps the edge fast
      // through the middle so the mechanism is not legible as typing.
      reveal: [
        { at: 0, value: 0, easing: "expo" },
        { at: 0.82, value: 1, easing: "linear" },
      ],
      x: [
        { at: 0, value: -0.16, relative: true, scaled: true, easing: "expo" },
        { at: 0.9, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.1, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "text-letter-scatter",
    name: "Letter Scatter",
    category: "text",
    appliesTo: ["text"],
    duration: 1.9,
    description: "Letters land from a loose, wide-set spray.",
    tags: ["text", "scatter", "letters", "playful", "kinetic", "energetic"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    revealMode: "characters",
    tracks: {
      // Scatter, within what the renderer can honestly do.
      //
      // Per-glyph positions would need each character to be its own object;
      // the text renderer draws a line into one canvas texture, by design —
      // that is what makes Sinhala conjuncts and Arabic joining come out right.
      // So the scatter is made from the three things that *are* per-line:
      // tracking that collapses from very wide, a rotation that unwinds, and a
      // character reveal underneath. The letters genuinely arrive at different
      // times and genuinely converge; they do not each take their own path.
      letterSpacing: [
        { at: 0, value: 34, scaled: true, easing: "expo" },
        { at: 0.72, value: -1.5, easing: "easeInOut" },
        { at: 1, value: 0, easing: "linear" },
      ],
      rotationZ: [
        { at: 0, value: -7, relative: true, scaled: true, directional: true, easing: "expo" },
        { at: 0.72, value: 1.4, relative: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
      reveal: [
        { at: 0, value: 0.15, easing: "smooth" },
        { at: 0.7, value: 1, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.22, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "text-glitch-lite",
    name: "Glitch Lite",
    category: "text",
    appliesTo: ["text"],
    duration: 1.1,
    description: "Two hard jumps and a snap into place. Restrained on purpose.",
    tags: ["text", "glitch", "digital", "snap", "sharp", "tech"],
    supports: { intensity: true, delay: true },
    tracks: {
      // "Lite" is the brief and the constraint. A real glitch means RGB
      // separation and torn scanlines, which would mean shader work in the
      // text renderer and a different look in the export than in the editor.
      // This is the readable part of the effect: a couple of hard offsets on
      // `linear` segments — no easing, so each jump is instant — and an opacity
      // that flickers with them. Three beats, then it stops; a glitch that
      // keeps going is a broken render, not an effect.
      x: [
        { at: 0, value: 0.07, relative: true, scaled: true, easing: "linear" },
        { at: 0.18, value: -0.05, relative: true, scaled: true, easing: "linear" },
        { at: 0.34, value: 0.03, relative: true, scaled: true, easing: "linear" },
        { at: 0.5, value: 0, relative: true, easing: "linear" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "linear" },
        { at: 0.1, value: 1, easing: "linear" },
        { at: 0.2, value: 0.35, easing: "linear" },
        { at: 0.3, value: 1, easing: "linear" },
        { at: 0.42, value: 0.7, easing: "linear" },
        { at: 0.52, value: 1, easing: "linear" },
      ],
      letterSpacing: [
        { at: 0, value: 6, scaled: true, easing: "linear" },
        { at: 0.34, value: -2, scaled: true, easing: "linear" },
        { at: 0.56, value: 0, easing: "linear" },
      ],
    },
  },
];
