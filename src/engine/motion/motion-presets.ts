import type { LayerType } from "@/types/layer";

import type { MotionCategory, MotionPresetDefinition } from "./preset-types";
import { SIGNATURE_MOTION_PRESETS } from "./signature-presets";
import { TEXT_MOTION_PRESETS } from "./text-presets";

/**
 * The Framelo motion library.
 *
 * Every entry is data: normalised keyframes plus a declaration of which
 * parameters it honours. Adding a preset is adding an object here — no
 * component, no branch, no new code path.
 *
 * Two rules shape the whole catalogue:
 *
 * 1. **Subtle beats dramatic.** These sit under app mockups and product
 *    launches. A 6° sway reads as premium; a 30° one reads as a toy. Travel is
 *    measured in fractions of the device, and rotations stay in single or low
 *    double digits unless the whole point is a full turn.
 *
 * 2. **Motion settles, it does not stop.** Entrances overshoot slightly and
 *    come back, and the last third of an entrance is almost always spent
 *    arriving. That is the difference between designed motion and a tween.
 *
 * Scene units are roughly decimetres — every device is normalised to 3 units
 * tall — so a `y` of 1 is a third of the device's height on any model. Nothing
 * here is tied to a particular phone.
 */

const VERSION = 1;

const DEVICE_MOTION_PRESETS: MotionPresetDefinition[] = [
  // ===========================================================================
  // ENTRANCE
  // ===========================================================================
  {
    version: VERSION,
    id: "rise-in",
    name: "Rise In",
    category: "entrance",
    duration: 2.4,
    description: "Lifts into frame and settles.",
    tags: ["entrance", "up", "fade", "subtle"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      // Arrives at 70% and holds: the pause at the end is what makes it land.
      y: [
        { at: 0, value: -1.6, relative: true, scaled: true, easing: "smooth" },
        { at: 0.7, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.45, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "slide-in-left",
    name: "Slide In Left",
    category: "entrance",
    duration: 2.2,
    description: "Enters from the left and eases to centre.",
    tags: ["entrance", "slide", "horizontal", "left"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      x: [
        { at: 0, value: -4, relative: true, scaled: true, easing: "smooth" },
        { at: 0.72, value: 0, relative: true, easing: "linear" },
      ],
      // A few degrees of trailing rotation: the device looks like it carries
      // momentum rather than sliding on rails.
      rotationY: [
        { at: 0, value: -14, relative: true, scaled: true, easing: "smooth" },
        { at: 0.8, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.4, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "slide-in-right",
    name: "Slide In Right",
    category: "entrance",
    duration: 2.2,
    description: "Enters from the right and eases to centre.",
    tags: ["entrance", "slide", "horizontal", "right"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      x: [
        { at: 0, value: 4, relative: true, scaled: true, easing: "smooth" },
        { at: 0.72, value: 0, relative: true, easing: "linear" },
      ],
      rotationY: [
        { at: 0, value: 14, relative: true, scaled: true, easing: "smooth" },
        { at: 0.8, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.4, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "slide-in-top",
    name: "Slide In Top",
    category: "entrance",
    duration: 2.2,
    description: "Drops in from above and settles.",
    tags: ["entrance", "slide", "vertical", "top", "drop"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      y: [
        { at: 0, value: 3.2, relative: true, scaled: true, easing: "smooth" },
        { at: 0.72, value: 0, relative: true, easing: "linear" },
      ],
      rotationX: [
        { at: 0, value: 8, relative: true, scaled: true, easing: "smooth" },
        { at: 0.85, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.4, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "slide-in-bottom",
    name: "Slide In Bottom",
    category: "entrance",
    duration: 2.2,
    description: "Pushes up from below the frame.",
    tags: ["entrance", "slide", "vertical", "bottom", "up"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      y: [
        { at: 0, value: -3.2, relative: true, scaled: true, easing: "smooth" },
        { at: 0.72, value: 0, relative: true, easing: "linear" },
      ],
      rotationX: [
        { at: 0, value: -8, relative: true, scaled: true, easing: "smooth" },
        { at: 0.85, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.4, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "scale-in",
    name: "Scale In",
    category: "entrance",
    duration: 2,
    description: "Grows from small to full size.",
    tags: ["entrance", "scale", "zoom", "grow"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      scaleX: [
        { at: 0, value: 0.82, scaled: true, easing: "smooth" },
        { at: 0.75, value: 1, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.82, scaled: true, easing: "smooth" },
        { at: 0.75, value: 1, easing: "linear" },
      ],
      scaleZ: [
        { at: 0, value: 0.82, scaled: true, easing: "smooth" },
        { at: 0.75, value: 1, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.4, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "pop-in",
    name: "Pop In",
    category: "entrance",
    duration: 1.4,
    description: "Fast scale up with a light overshoot.",
    tags: ["entrance", "scale", "pop", "overshoot", "snappy"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      // The explicit 1.04 beat is the overshoot: `back` easing alone would
      // overshoot too, but keyframing it makes the amount editable afterwards.
      scaleX: [
        { at: 0, value: 0.7, scaled: true, easing: "easeOut" },
        { at: 0.55, value: 1.04, easing: "smooth" },
        { at: 1, value: 1, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.7, scaled: true, easing: "easeOut" },
        { at: 0.55, value: 1.04, easing: "smooth" },
        { at: 1, value: 1, easing: "linear" },
      ],
      scaleZ: [
        { at: 0, value: 0.7, scaled: true, easing: "easeOut" },
        { at: 0.55, value: 1.04, easing: "smooth" },
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
    id: "blur-reveal",
    name: "Soft Reveal",
    category: "entrance",
    duration: 2.6,
    description: "Fades up from a slight push back.",
    tags: ["entrance", "fade", "soft", "reveal", "depth"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      // Depth stands in for blur. Rasterising the device to blur it would cost
      // a full-resolution render target every frame and throw away the crisp
      // model, so the softness is suggested with Z and opacity instead.
      z: [
        { at: 0, value: -1.4, relative: true, scaled: true, easing: "smooth" },
        { at: 0.8, value: 0, relative: true, easing: "linear" },
      ],
      scaleX: [
        { at: 0, value: 0.94, scaled: true, easing: "smooth" },
        { at: 0.8, value: 1, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.94, scaled: true, easing: "smooth" },
        { at: 0.8, value: 1, easing: "linear" },
      ],
      scaleZ: [
        { at: 0, value: 0.94, scaled: true, easing: "smooth" },
        { at: 0.8, value: 1, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "smooth" },
        { at: 0.65, value: 1, easing: "linear" },
      ],
    },
  },

  // ===========================================================================
  // EXIT
  // ===========================================================================
  {
    version: VERSION,
    id: "fade-out",
    name: "Fade Out",
    category: "exit",
    duration: 1.6,
    description: "Settles back and fades away.",
    tags: ["exit", "fade", "out"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      opacity: [
        { at: 0.25, value: 1, easing: "smooth" },
        { at: 1, value: 0, easing: "linear" },
      ],
      scaleX: [
        { at: 0.25, value: 1, easing: "smooth" },
        { at: 1, value: 0.94, scaled: true, easing: "linear" },
      ],
      scaleY: [
        { at: 0.25, value: 1, easing: "smooth" },
        { at: 1, value: 0.94, scaled: true, easing: "linear" },
      ],
      scaleZ: [
        { at: 0.25, value: 1, easing: "smooth" },
        { at: 1, value: 0.94, scaled: true, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "slide-out-right",
    name: "Slide Out Right",
    category: "exit",
    duration: 1.8,
    description: "Leaves frame to the right.",
    tags: ["exit", "slide", "right", "out"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      x: [
        { at: 0.2, value: 0, relative: true, easing: "smooth" },
        { at: 1, value: 4.5, relative: true, scaled: true, easing: "linear" },
      ],
      rotationY: [
        { at: 0.2, value: 0, relative: true, easing: "smooth" },
        { at: 1, value: 16, relative: true, scaled: true, easing: "linear" },
      ],
      opacity: [
        { at: 0.5, value: 1, easing: "easeIn" },
        { at: 1, value: 0, easing: "linear" },
      ],
    },
  },

  // ===========================================================================
  // MOVEMENT
  // ===========================================================================
  {
    version: VERSION,
    id: "float",
    name: "Float",
    category: "movement",
    duration: 5,
    description: "Weightless vertical drift.",
    tags: ["movement", "float", "loop", "idle", "subtle"],
    loop: true,
    supports: { intensity: true },
    tracks: {
      y: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.5, value: 0.3, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
    },
  },
  {
    version: VERSION,
    id: "drift",
    name: "Drift",
    category: "movement",
    duration: 7,
    description: "Slow horizontal glide across the frame.",
    tags: ["movement", "drift", "horizontal", "slow"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      x: [
        { at: 0, value: -0.7, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0.7, relative: true, scaled: true, easing: "linear" },
      ],
      rotationY: [
        { at: 0, value: -5, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 5, relative: true, scaled: true, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "bounce",
    name: "Bounce",
    category: "movement",
    duration: 2.4,
    description: "A controlled drop with two settling bounces.",
    tags: ["movement", "bounce", "drop", "playful"],
    supports: { intensity: true, delay: true },
    tracks: {
      // Successive bounces decay to roughly a third each time; equal bounces
      // read as a bug rather than as weight.
      y: [
        { at: 0, value: 1.6, relative: true, scaled: true, easing: "easeIn" },
        { at: 0.35, value: 0, relative: true, easing: "easeOut" },
        { at: 0.58, value: 0.45, relative: true, scaled: true, easing: "easeIn" },
        { at: 0.76, value: 0, relative: true, easing: "easeOut" },
        { at: 0.89, value: 0.14, relative: true, scaled: true, easing: "easeIn" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "sway",
    name: "Sway",
    category: "movement",
    duration: 6,
    description: "Gentle rocking from side to side.",
    tags: ["movement", "sway", "rotation", "loop", "idle"],
    loop: true,
    supports: { intensity: true },
    tracks: {
      rotationZ: [
        { at: 0, value: -2.5, relative: true, scaled: true, easing: "easeInOut" },
        { at: 0.5, value: 2.5, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: -2.5, relative: true, scaled: true, easing: "easeInOut" },
      ],
    },
  },
  {
    version: VERSION,
    id: "hover",
    name: "Hover",
    category: "movement",
    duration: 6,
    description: "Floating with a slow turn — the classic idle.",
    tags: ["movement", "hover", "float", "rotation", "loop", "idle"],
    loop: true,
    supports: { intensity: true },
    tracks: {
      // The Y and rotation cycles are deliberately in quarter-phase: perfectly
      // synced axes read as one mechanical motion, offset ones read as drift.
      y: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.5, value: 0.26, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      rotationY: [
        { at: 0, value: -4, relative: true, scaled: true, easing: "easeInOut" },
        { at: 0.25, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.75, value: 4, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: -4, relative: true, scaled: true, easing: "easeInOut" },
      ],
      rotationZ: [
        { at: 0, value: 1.4, relative: true, scaled: true, easing: "easeInOut" },
        { at: 0.5, value: -1.4, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 1.4, relative: true, scaled: true, easing: "easeInOut" },
      ],
    },
  },

  // ===========================================================================
  // 3D
  // ===========================================================================
  {
    version: VERSION,
    id: "device-spin",
    name: "Device Spin",
    category: "3d",
    duration: 4,
    description: "A full 360° turn around the vertical axis.",
    tags: ["3d", "spin", "rotation", "360", "product"],
    loop: true,
    supports: { easing: true, delay: true },
    tracks: {
      rotationY: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.5, value: 180, relative: true, easing: "linear" },
        { at: 1, value: 360, relative: true, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "half-spin",
    name: "Half Spin",
    category: "3d",
    duration: 2.6,
    description: "Turns to show the back and stops.",
    tags: ["3d", "spin", "rotation", "180", "back"],
    supports: { easing: true, delay: true, spring: true },
    tracks: {
      rotationY: [
        { at: 0, value: 0, relative: true, easing: "smooth" },
        { at: 0.85, value: 180, relative: true, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "turntable",
    name: "Turntable",
    category: "3d",
    duration: 9,
    description: "A slow, even product turn.",
    tags: ["3d", "turntable", "spin", "rotation", "360", "slow", "product", "loop"],
    loop: true,
    supports: {},
    tracks: {
      // Strictly linear: a turntable that eases is a turntable with a visible
      // seam every revolution.
      rotationY: [
        { at: 0, value: 0, relative: true, easing: "linear" },
        { at: 1, value: 360, relative: true, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "tilt-reveal",
    name: "Tilt Reveal",
    category: "3d",
    duration: 2.8,
    description: "Starts tilted away and settles square.",
    tags: ["3d", "tilt", "reveal", "entrance", "settle"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      rotationX: [
        { at: 0, value: 16, relative: true, scaled: true, easing: "smooth" },
        { at: 0.8, value: 0, relative: true, easing: "linear" },
      ],
      rotationY: [
        { at: 0, value: -28, relative: true, scaled: true, easing: "smooth" },
        { at: 0.85, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.4, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "flip-3d",
    name: "3D Flip",
    category: "3d",
    duration: 2.2,
    description: "Flips through 180° and lands flat.",
    tags: ["3d", "flip", "rotation", "reveal"],
    supports: { easing: true, delay: true, spring: true },
    tracks: {
      rotationY: [
        { at: 0, value: -180, relative: true, easing: "smooth" },
        { at: 0.9, value: 0, relative: true, easing: "linear" },
      ],
      // A touch of scale through the middle sells the perspective.
      scaleX: [
        { at: 0, value: 0.9, easing: "easeInOut" },
        { at: 0.5, value: 1.02, easing: "easeInOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.9, easing: "easeInOut" },
        { at: 0.5, value: 1.02, easing: "easeInOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
      scaleZ: [
        { at: 0, value: 0.9, easing: "easeInOut" },
        { at: 0.5, value: 1.02, easing: "easeInOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "orbit",
    name: "Orbit",
    category: "3d",
    duration: 8,
    description: "Turns while arcing gently through the frame.",
    tags: ["3d", "orbit", "spin", "rotation", "360", "movement", "loop"],
    loop: true,
    supports: { intensity: true },
    tracks: {
      rotationY: [
        { at: 0, value: 0, relative: true, easing: "linear" },
        { at: 1, value: 360, relative: true, easing: "linear" },
      ],
      // A quarter-phase offset between X and Z traces an ellipse rather than a
      // line, which is what makes it read as an orbit.
      x: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.25, value: 0.5, relative: true, scaled: true, easing: "easeInOut" },
        { at: 0.75, value: -0.5, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      z: [
        { at: 0, value: 0.4, relative: true, scaled: true, easing: "easeInOut" },
        { at: 0.5, value: -0.4, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0.4, relative: true, scaled: true, easing: "easeInOut" },
      ],
    },
  },

  // ===========================================================================
  // CINEMATIC
  // ===========================================================================
  {
    version: VERSION,
    id: "cinematic-reveal",
    name: "Cinematic Reveal",
    category: "cinematic",
    duration: 4,
    description: "Scale, position and rotation resolving together.",
    tags: ["cinematic", "hero", "product", "reveal", "premium"],
    supports: { intensity: true, direction: true, easing: true, delay: true, spring: true },
    tracks: {
      scaleX: [
        { at: 0, value: 0.86, scaled: true, easing: "smooth" },
        { at: 0.85, value: 1, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.86, scaled: true, easing: "smooth" },
        { at: 0.85, value: 1, easing: "linear" },
      ],
      scaleZ: [
        { at: 0, value: 0.86, scaled: true, easing: "smooth" },
        { at: 0.85, value: 1, easing: "linear" },
      ],
      y: [
        { at: 0, value: -0.8, relative: true, scaled: true, easing: "smooth" },
        { at: 0.85, value: 0, relative: true, easing: "linear" },
      ],
      x: [
        { at: 0, value: -0.5, relative: true, scaled: true, directional: true, easing: "smooth" },
        { at: 0.85, value: 0, relative: true, easing: "linear" },
      ],
      rotationY: [
        { at: 0, value: -18, relative: true, scaled: true, directional: true, easing: "smooth" },
        { at: 0.9, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "smooth" },
        { at: 0.5, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "hero-push",
    name: "Hero Push",
    category: "cinematic",
    duration: 5,
    description: "A slow push in that never quite stops.",
    tags: ["cinematic", "hero", "zoom", "slow", "push"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      // Ends slightly above 1 and still moving: a hero shot that settles
      // completely looks like it finished, which kills a looping banner.
      scaleX: [
        { at: 0, value: 0.92, scaled: true, easing: "easeInOut" },
        { at: 1, value: 1.06, scaled: true, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.92, scaled: true, easing: "easeInOut" },
        { at: 1, value: 1.06, scaled: true, easing: "linear" },
      ],
      scaleZ: [
        { at: 0, value: 0.92, scaled: true, easing: "easeInOut" },
        { at: 1, value: 1.06, scaled: true, easing: "linear" },
      ],
      y: [
        { at: 0, value: -0.18, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0.06, relative: true, scaled: true, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "camera-push",
    name: "Camera Push",
    category: "cinematic",
    duration: 5.5,
    description: "Dollies toward the device along Z.",
    tags: ["cinematic", "camera", "push", "depth", "dolly"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      // Moving the device along Z rather than the camera keeps this animatable:
      // camera views frame the shot and are deliberately not part of the
      // timeline, so a "camera" move is expressed in the device's own depth.
      z: [
        { at: 0, value: -1.8, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0.5, relative: true, scaled: true, easing: "linear" },
      ],
      rotationY: [
        { at: 0, value: 6, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: -2, relative: true, scaled: true, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "cinematic-drift",
    name: "Cinematic Drift",
    category: "cinematic",
    duration: 8,
    description: "A long, slow move that never draws attention.",
    tags: ["cinematic", "drift", "slow", "loop", "background"],
    supports: { intensity: true },
    tracks: {
      x: [
        { at: 0, value: -0.45, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0.45, relative: true, scaled: true, easing: "linear" },
      ],
      y: [
        { at: 0, value: 0.12, relative: true, scaled: true, easing: "easeInOut" },
        { at: 0.5, value: -0.12, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0.12, relative: true, scaled: true, easing: "easeInOut" },
      ],
      rotationY: [
        { at: 0, value: -7, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 7, relative: true, scaled: true, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "focus-reveal",
    name: "Focus Reveal",
    category: "cinematic",
    duration: 3.2,
    description: "Comes forward into focus and holds.",
    tags: ["cinematic", "focus", "reveal", "depth", "subtle"],
    supports: { intensity: true, easing: true, delay: true, spring: true },
    tracks: {
      z: [
        { at: 0, value: -1.1, relative: true, scaled: true, easing: "smooth" },
        { at: 0.75, value: 0, relative: true, easing: "linear" },
      ],
      scaleX: [
        { at: 0, value: 0.93, scaled: true, easing: "smooth" },
        { at: 0.75, value: 1, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.93, scaled: true, easing: "smooth" },
        { at: 0.75, value: 1, easing: "linear" },
      ],
      scaleZ: [
        { at: 0, value: 0.93, scaled: true, easing: "smooth" },
        { at: 0.75, value: 1, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "smooth" },
        { at: 0.55, value: 1, easing: "linear" },
      ],
    },
  },

  // ===========================================================================
  // PRODUCT
  // ===========================================================================
  {
    version: VERSION,
    id: "product-reveal",
    name: "Product Reveal",
    category: "product",
    duration: 3,
    description: "Rises into frame while settling from a tilt.",
    tags: ["product", "reveal", "entrance", "rotation"],
    supports: { intensity: true, direction: true, easing: true, delay: true, spring: true },
    tracks: {
      y: [
        { at: 0, value: -2.2, relative: true, scaled: true, easing: "smooth" },
        { at: 0.75, value: 0, relative: true, easing: "linear" },
      ],
      rotationY: [
        { at: 0, value: -32, relative: true, scaled: true, directional: true, easing: "smooth" },
        { at: 0.9, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.35, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "hero-product",
    name: "Hero Product",
    category: "product",
    duration: 6,
    description: "A premium slow reveal that keeps breathing.",
    tags: ["product", "hero", "premium", "slow", "launch"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      // Entrance in the first 45%, then a long, almost-still drift. The device
      // should look alive while the viewer reads the copy beside it.
      scaleX: [
        { at: 0, value: 0.88, scaled: true, easing: "smooth" },
        { at: 0.45, value: 1, easing: "easeInOut" },
        { at: 1, value: 1.02, scaled: true, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.88, scaled: true, easing: "smooth" },
        { at: 0.45, value: 1, easing: "easeInOut" },
        { at: 1, value: 1.02, scaled: true, easing: "linear" },
      ],
      scaleZ: [
        { at: 0, value: 0.88, scaled: true, easing: "smooth" },
        { at: 0.45, value: 1, easing: "easeInOut" },
        { at: 1, value: 1.02, scaled: true, easing: "linear" },
      ],
      y: [
        { at: 0, value: -1.1, relative: true, scaled: true, easing: "smooth" },
        { at: 0.45, value: 0, relative: true, easing: "easeInOut" },
        { at: 1, value: 0.14, relative: true, scaled: true, easing: "linear" },
      ],
      rotationY: [
        { at: 0, value: -22, relative: true, scaled: true, easing: "smooth" },
        { at: 0.5, value: 0, relative: true, easing: "easeInOut" },
        { at: 1, value: 5, relative: true, scaled: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "smooth" },
        { at: 0.3, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "product-turn",
    name: "Product Turn",
    category: "product",
    duration: 5,
    description: "Turns to three-quarter and holds there.",
    tags: ["product", "turn", "spin", "rotation", "3d", "showcase"],
    supports: { intensity: true, direction: true, easing: true, delay: true, spring: true },
    tracks: {
      rotationY: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.55, value: -38, relative: true, scaled: true, directional: true, easing: "smooth" },
        { at: 1, value: -32, relative: true, scaled: true, directional: true, easing: "linear" },
      ],
      rotationX: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.55, value: 5, relative: true, scaled: true, easing: "smooth" },
        { at: 1, value: 4, relative: true, scaled: true, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "floating-product",
    name: "Floating Product",
    category: "product",
    duration: 7,
    description: "Settles in, then hangs weightless.",
    tags: ["product", "float", "hover", "premium", "idle"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      y: [
        { at: 0, value: -0.9, relative: true, scaled: true, easing: "smooth" },
        { at: 0.3, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.65, value: 0.28, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      rotationZ: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.35, value: -1.8, relative: true, scaled: true, easing: "easeInOut" },
        { at: 0.75, value: 1.8, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "smooth" },
        { at: 0.25, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "showcase",
    name: "Showcase",
    category: "product",
    duration: 4.5,
    description: "Enters, turns to show the form, settles.",
    tags: ["product", "showcase", "entrance", "rotation", "combo"],
    supports: { intensity: true, easing: true, delay: true },
    tracks: {
      y: [
        { at: 0, value: -1.4, relative: true, scaled: true, easing: "smooth" },
        { at: 0.35, value: 0, relative: true, easing: "easeInOut" },
      ],
      rotationY: [
        { at: 0, value: -40, relative: true, scaled: true, easing: "smooth" },
        { at: 0.45, value: 14, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "linear" },
      ],
      scaleX: [
        { at: 0, value: 0.9, scaled: true, easing: "smooth" },
        { at: 0.45, value: 1, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.9, scaled: true, easing: "smooth" },
        { at: 0.45, value: 1, easing: "linear" },
      ],
      scaleZ: [
        { at: 0, value: 0.9, scaled: true, easing: "smooth" },
        { at: 0.45, value: 1, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.3, value: 1, easing: "linear" },
      ],
    },
  },

  // ===========================================================================
  // LOOP
  // ===========================================================================
  {
    version: VERSION,
    id: "floating-loop",
    name: "Floating Loop",
    category: "loop",
    duration: 6,
    description: "Continuous up and down, seamless.",
    tags: ["loop", "float", "idle", "seamless", "subtle"],
    loop: true,
    supports: { intensity: true },
    tracks: {
      y: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.5, value: 0.32, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
    },
  },
  {
    version: VERSION,
    id: "sway-loop",
    name: "Sway Loop",
    category: "loop",
    duration: 7,
    description: "Continuous rocking, seamless.",
    tags: ["loop", "sway", "rotation", "idle", "seamless"],
    loop: true,
    supports: { intensity: true },
    tracks: {
      rotationY: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.25, value: 9, relative: true, scaled: true, easing: "easeInOut" },
        { at: 0.75, value: -9, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
    },
  },
  {
    version: VERSION,
    id: "turntable-loop",
    name: "Turntable Loop",
    category: "loop",
    duration: 12,
    description: "An unhurried full rotation, forever.",
    tags: ["loop", "turntable", "spin", "rotation", "360", "seamless", "product"],
    loop: true,
    supports: {},
    tracks: {
      rotationY: [
        { at: 0, value: 0, relative: true, easing: "linear" },
        { at: 1, value: 360, relative: true, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "cinematic-loop",
    name: "Cinematic Loop",
    category: "loop",
    duration: 10,
    description: "A long drift built to repeat without a seam.",
    tags: ["loop", "cinematic", "drift", "slow", "seamless", "background"],
    loop: true,
    supports: { intensity: true },
    tracks: {
      // Every track returns to its start value, which is what makes the repeat
      // invisible. Editing any endpoint away from its partner breaks the loop.
      y: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.5, value: 0.22, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      x: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.25, value: 0.3, relative: true, scaled: true, easing: "easeInOut" },
        { at: 0.75, value: -0.3, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      rotationY: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.25, value: 6, relative: true, scaled: true, easing: "easeInOut" },
        { at: 0.75, value: -6, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      rotationZ: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.5, value: -1.6, relative: true, scaled: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
    },
  },
];

/**
 * Presets that were removed from the catalogue.
 *
 * Applying a preset flattens it into ordinary keyframes, so nothing in a saved
 * project points back here — but a template, a shared link or a future
 * "reapply this preset" feature could still name one. Keeping the definitions
 * resolvable means such a reference degrades to the right motion instead of
 * silently doing nothing.
 *
 * These never appear in the browser, in search, or as a starting point for a
 * new project.
 */
/**
 * The whole library.
 *
 * Text presets are appended rather than kept in a separate list: they are
 * the same kind of object, and one library means one search, one favourites
 * store and one apply path. Which layer kinds each is offered for is
 * declared per preset by `appliesTo`.
 */
export const MOTION_PRESETS: MotionPresetDefinition[] = [
  ...DEVICE_MOTION_PRESETS,
  ...SIGNATURE_MOTION_PRESETS,
  ...TEXT_MOTION_PRESETS,
];

export const LEGACY_MOTION_PRESETS: MotionPresetDefinition[] = [
  {
    version: VERSION,
    id: "screen-fade",
    name: "Screen Fade",
    category: "entrance",
    duration: 2,
    description: "Fades up from transparent. Retired — use Soft Reveal.",
    tags: ["legacy", "fade"],
    supports: {},
    tracks: {
      opacity: [
        { at: 0, value: 0, easing: "easeInOut" },
        { at: 1, value: 1, easing: "linear" },
      ],
    },
  },
  // Renamed when the library was categorised; the motion lives on as Hero Push.
  {
    version: VERSION,
    id: "cinematic-zoom",
    name: "Cinematic Zoom",
    category: "cinematic",
    duration: 5,
    description: "Slow push in with a gentle rotation. Retired — use Hero Push.",
    tags: ["legacy", "cinematic"],
    supports: {},
    tracks: {
      scaleX: [
        { at: 0, value: 0.72, easing: "easeInOut" },
        { at: 1, value: 1.05, easing: "linear" },
      ],
      scaleY: [
        { at: 0, value: 0.72, easing: "easeInOut" },
        { at: 1, value: 1.05, easing: "linear" },
      ],
      scaleZ: [
        { at: 0, value: 0.72, easing: "easeInOut" },
        { at: 1, value: 1.05, easing: "linear" },
      ],
      rotationY: [
        { at: 0, value: 18, relative: true, easing: "easeInOut" },
        { at: 1, value: -6, relative: true, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "slide-in",
    name: "Slide In",
    category: "entrance",
    duration: 2.5,
    description: "Enters from the left. Retired — use Slide In Left.",
    tags: ["legacy", "entrance"],
    supports: {},
    tracks: {
      x: [
        { at: 0, value: -5, relative: true, easing: "easeOut" },
        { at: 0.8, value: 0, relative: true, easing: "linear" },
      ],
      opacity: [
        { at: 0, value: 0, easing: "easeOut" },
        { at: 0.4, value: 1, easing: "linear" },
      ],
    },
  },
  {
    version: VERSION,
    id: "floating-device",
    name: "Floating Device",
    category: "movement",
    duration: 6,
    description: "Weightless hover. Retired — use Hover.",
    tags: ["legacy", "movement"],
    supports: {},
    tracks: {
      y: [
        { at: 0, value: 0, relative: true, easing: "easeInOut" },
        { at: 0.5, value: 0.35, relative: true, easing: "easeInOut" },
        { at: 1, value: 0, relative: true, easing: "easeInOut" },
      ],
      rotationZ: [
        { at: 0, value: -2.5, relative: true, easing: "easeInOut" },
        { at: 0.5, value: 2.5, relative: true, easing: "easeInOut" },
        { at: 1, value: -2.5, relative: true, easing: "easeInOut" },
      ],
    },
  },
];

const BY_ID = new Map<string, MotionPresetDefinition>([
  ...MOTION_PRESETS.map((preset) => [preset.id, preset] as const),
  ...LEGACY_MOTION_PRESETS.map((preset) => [preset.id, preset] as const),
]);

/** Resolves live presets and retired ones alike. Retired ids are never listed. */
export function getMotionPreset(id: string): MotionPresetDefinition | undefined {
  return BY_ID.get(id);
}

export function isLegacyPreset(id: string): boolean {
  return LEGACY_MOTION_PRESETS.some((preset) => preset.id === id);
}

/** Categories that actually contain presets, in catalogue order. */
export function activeMotionCategories(layerType?: LayerType): MotionCategory[] {
  // Derived from the presets the selected layer can actually use, so a chip
  // never leads to an empty list — "Text" is not offered for a phone, and a
  // future category appears the moment its first preset does.
  const present = new Set(
    MOTION_PRESETS.filter(
      (preset) => !layerType || !preset.appliesTo || preset.appliesTo.includes(layerType),
    ).map((preset) => preset.category),
  );
  return (
    ["text", "entrance", "movement", "3d", "cinematic", "product", "loop", "exit", "combo"] as const
  ).filter((category) => present.has(category));
}

/**
 * Search across name, description, category and tags.
 *
 * Tags are what make this scale: "spin" finds Device Spin, Half Spin,
 * Turntable and Product Turn without any of them sharing a word in their name.
 */
export function searchMotionPresets(
  category: MotionCategory | "all",
  query: string,
  layerType?: LayerType,
): MotionPresetDefinition[] {
  const needle = query.trim().toLowerCase();

  return MOTION_PRESETS.filter((preset) => {
    // A preset that cannot do anything to the selected layer is not a
    // result. Offering a typewriter for a phone would let someone apply it,
    // see nothing happen, and have no way to tell why.
    if (layerType && preset.appliesTo && !preset.appliesTo.includes(layerType)) return false;
    if (category !== "all" && preset.category !== category) return false;
    if (!needle) return true;

    return (
      preset.name.toLowerCase().includes(needle) ||
      preset.description.toLowerCase().includes(needle) ||
      preset.category.includes(needle) ||
      preset.tags.some((tag) => tag.includes(needle))
    );
  });
}
