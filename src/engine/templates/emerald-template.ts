import type { Transform } from "@/types/layer";

import type {
  ProjectTemplate,
  TemplateEntrance,
  TemplateTextSpec,
} from "./project-templates";

/**
 * Emerald Finance Showcase.
 *
 * A poster, rebuilt as ordinary Framelo layers: a deep emerald background, one
 * very large three-quarter iPhone carrying a replaceable finance dashboard, an
 * editorial headline on the left and a restrained outline call to action.
 * Nothing here is a flattened picture of a design — every word is a text layer,
 * every ornament is an image layer, and the phone is a real device layer whose
 * screen goes through the ordinary Screen media controls.
 *
 * Composition is authored in *poster pixels* on the 1080 × 1350 canvas, which
 * is the space the layout was designed in, and converted to world units by the
 * two helpers below. Doing that arithmetic in one place is what keeps the
 * numbers further down readable as a layout rather than as a pile of decimals.
 */

/** Poster size the coordinates below are expressed in. */
const POSTER = { width: 1080, height: 1350 } as const;

const CAMERA_Z = 7.6;

/**
 * World units per poster pixel.
 *
 * The standard front camera sits at z 7.6 with a 32° vertical field of view, so
 * it sees 2 × 7.6 × tan(16°) ≈ 4.3585 world units of height — which is the
 * whole 1350-pixel poster.
 */
const UNIT = (2 * CAMERA_Z * Math.tan((16 * Math.PI) / 180)) / POSTER.height;

/** Composition pixels per world unit, matching `PIXELS_PER_WORLD_UNIT`. */
const TEXT_PX = 248;

/**
 * Perspective correction for a layer that is not on the z = 0 plane.
 *
 * A layer nearer the camera is magnified, so its size and its offset from the
 * centre both shrink by the same factor for it to land on the poster
 * coordinates it was authored at.
 */
function depthAt(z: number): number {
  return (CAMERA_Z - z) / CAMERA_Z;
}

/**
 * How a layer arrives.
 *
 * Travel is written in poster pixels — "this rises 40 pixels into place" — and
 * turned into the absolute world values the keyframe builder wants once the
 * resting transform is known. Authoring entrances as offsets is what stops a
 * nudged layout from silently leaving an entrance pointing at the old position.
 */
interface Reveal {
  start: number;
  end: number;
  /** Poster pixels travelled upward into place. Positive starts lower. */
  riseBy?: number;
  /** Poster pixels travelled rightward into place. Positive starts left. */
  shiftBy?: number;
  /** Uniform scale it starts at, relative to its resting scale. */
  scaleFrom?: number;
  /** Extra resting-transform overrides for the starting pose. */
  from?: Partial<Transform>;
  drift?: TemplateEntrance["drift"];
}

function entranceFor(
  reveal: Reveal,
  transform: Partial<Transform>,
  depth: number,
): TemplateEntrance {
  const travel = UNIT * depth;
  const restingX = transform.x ?? 0;
  const restingY = transform.y ?? 0;
  const scale = reveal.scaleFrom;

  return {
    start: reveal.start,
    end: reveal.end,
    from: {
      opacity: 0,
      ...(reveal.riseBy ? { y: restingY - reveal.riseBy * travel } : {}),
      ...(reveal.shiftBy ? { x: restingX - reveal.shiftBy * travel } : {}),
      ...(scale === undefined
        ? {}
        : {
            scaleX: (transform.scaleX ?? 1) * scale,
            scaleY: (transform.scaleY ?? 1) * scale,
            scaleZ: (transform.scaleZ ?? 1) * scale,
          }),
      ...reveal.from,
    },
    ...(reveal.drift ? { drift: reveal.drift } : {}),
  };
}

const solid = (color: string): TemplateTextSpec["style"]["fill"] => ({
  type: "solid",
  color,
  gradient: { from: color, to: color, angle: 0 },
});

interface TextOptions {
  /** Left edge of the text box, in poster pixels. */
  x: number;
  /** Top edge of the text block, in poster pixels. */
  y: number;
  /** Type size, in poster pixels. */
  size: number;
  /** Box width, in poster pixels. Fixed, so the block's centre is knowable. */
  width: number;
  z: number;
  reveal: Reveal;
  weight?: number;
  color?: string;
  gradient?: { from: string; to: string; angle: number };
  lineHeight?: number;
  letterSpacing?: number;
  align?: "left" | "center" | "right";
}

function text(name: string, content: string, options: TextOptions): TemplateTextSpec {
  const depth = depthAt(options.z);
  const scale = UNIT * TEXT_PX * depth;
  const lineHeight = options.lineHeight ?? 1.2;

  // A fixed box makes the plane exactly `width` wide whatever the glyphs
  // measure, so the centre below is the centre the layout was drawn against.
  const blockHeight = content.split("\n").length * options.size * lineHeight;
  const centreX = options.x + options.width / 2;
  const centreY = options.y + blockHeight / 2;

  const transform = {
    x: (centreX - POSTER.width / 2) * UNIT * depth,
    y: (POSTER.height / 2 - centreY) * UNIT * depth,
    z: options.z,
  };

  const color = options.color ?? "#f2fbf6";

  return {
    name,
    content,
    transform,
    style: {
      fontId: "inter",
      fontWeight: options.weight ?? 400,
      fontSize: options.size * scale,
      lineHeight,
      letterSpacing: (options.letterSpacing ?? 0) * scale,
      textAlign: options.align ?? "left",
      boxMode: "fixed",
      boxWidth: options.width * scale,
      fill: options.gradient
        ? { type: "gradient", color, gradient: options.gradient }
        : solid(color),
    },
    entrance: entranceFor(options.reveal, transform, depth),
  };
}

interface ImageOptions {
  /** Top-left corner and size, in poster pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  reveal: Reveal;
  opacity?: number;
}

type ImageSpec = NonNullable<ProjectTemplate["imageLayers"]>[number];

function image(name: string, src: string, options: ImageOptions): ImageSpec {
  const depth = depthAt(options.z);
  const transform = {
    x: (options.x + options.width / 2 - POSTER.width / 2) * UNIT * depth,
    y: (POSTER.height / 2 - options.y - options.height / 2) * UNIT * depth,
    z: options.z,
    opacity: options.opacity ?? 1,
  };

  return {
    name,
    src,
    width: options.width * UNIT * depth,
    height: options.height * UNIT * depth,
    transform,
    entrance: entranceFor(options.reveal, transform, depth),
  };
}

/**
 * Depth order, back to front: atmosphere, market rows, the phone, then every
 * piece of typography and ornament. The two background layers sit at negative
 * z so the builder draws them before the device; everything else is in front,
 * which is what lets the headline cross the phone the way the reference does.
 */
const HEADER_Z = 0.45;
const COPY_Z = 0.5;
const HEADLINE_Z = 0.55;

/** The device's resting pose, referenced by its own entrance below. */
const PHONE: Partial<Transform> = {
  // Far enough right that the headline only grazes the phone's left flank the
  // way the poster does, and the body crops off the right edge of frame.
  x: 0.94,
  y: -0.54,
  z: -0.35,
  rotationX: 3,
  rotationY: 20,
  rotationZ: -8,
  scaleX: 1.42,
  scaleY: 1.42,
  scaleZ: 1.42,
};

export const EMERALD_TEMPLATE: ProjectTemplate = {
  id: "emerald-finance-showcase",
  name: "Emerald Finance Showcase",
  description:
    "A deep-emerald finance poster: one oversized three-quarter iPhone, an editorial left-hand headline and a restrained outline call to action.",
  category: "mobile",
  canvas: { width: POSTER.width, height: POSTER.height, fps: 60, duration: 6 },
  deviceId: "iphone-17-pro",
  finish: "black",
  cameraView: "front",
  posterTime: 3.4,
  motionPresetIds: [],
  tags: ["finance", "editorial", "mobile", "portrait", "emerald"],

  // Layered radial glows rather than one flat ramp: the poster reads as lit
  // from the upper right and falls to almost-black in both bottom corners.
  background: {
    type: "pattern",
    patternId: null,
    name: "Emerald / cinematic forest",
    opacity: 1,
    css: {
      backgroundColor: "#021712",
      backgroundImage: [
        "radial-gradient(ellipse 70% 52% at 88% 6%, #0d513c 0%, rgba(13,81,60,0.42) 38%, rgba(13,81,60,0) 68%)",
        "radial-gradient(ellipse 96% 62% at 6% 0%, #031f18 0%, rgba(3,31,24,0.6) 44%, rgba(3,31,24,0) 74%)",
        "radial-gradient(ellipse 110% 58% at 46% 46%, #07372b 0%, rgba(7,55,43,0.5) 46%, rgba(7,55,43,0) 78%)",
        "radial-gradient(ellipse 120% 54% at 50% 108%, #021712 0%, rgba(2,23,18,0.72) 40%, rgba(2,23,18,0) 76%)",
        "linear-gradient(168deg, #031f18 0%, #052c22 34%, #07372b 58%, #041f19 82%, #021712 100%)",
      ].join(", "),
    },
  },

  deviceLayers: [
    {
      name: "Main iPhone device",
      screenArtwork: "emerald",
      // No contact shadow. The sprite is a ground-contact patch, and nothing
      // here is standing on a floor — at this scale it would only smear the
      // lower right of a composition that lights itself.
      shadowIntensity: 0,
      // Upper right, dramatically large, three-quarter turned so the left
      // flank and its buttons catch the light and the body crops off frame.
      transform: PHONE,
      entrance: entranceFor(
        {
          start: 0.4,
          end: 1.6,
          riseBy: -50,
          shiftBy: -50,
          scaleFrom: 1.08,
          from: { rotationY: 25, rotationZ: -11 },
        },
        PHONE,
        depthAt(PHONE.z ?? 0),
      ),
    },
  ],

  imageLayers: [
    image("Background / emerald atmosphere", "/templates/emerald/glow.svg", {
      x: 430,
      y: -190,
      width: 960,
      height: 1160,
      z: -0.9,
      opacity: 0.34,
      reveal: {
        start: 0.3,
        end: 1.3,
        scaleFrom: 1.08,
        drift: { start: 3.2, to: { opacity: 0.4, scaleX: 1.04, scaleY: 1.04 } },
      },
    }),
    image("Background finance decorations", "/templates/emerald/market.svg", {
      x: 26,
      y: 742,
      width: 1010,
      height: 626,
      z: -0.55,
      opacity: 0.13,
      reveal: { start: 1.5, end: 2.7, riseBy: 18 },
    }),
    image("Top separator", "/templates/emerald/rule.svg", {
      x: 62,
      y: 132,
      width: 952,
      height: 8,
      z: HEADER_Z,
      reveal: { start: 0.25, end: 1.25, from: { scaleX: 0.86 } },
    }),
    image("CTA container", "/templates/emerald/cta.svg", {
      x: 56,
      y: 1002,
      width: 500,
      height: 72,
      z: COPY_Z,
      reveal: { start: 1.2, end: 2.3, riseBy: 16 },
    }),
    image("CTA NOW pill", "/templates/emerald/now.svg", {
      x: 76,
      y: 1012,
      width: 128,
      height: 52,
      z: COPY_Z + 0.02,
      reveal: { start: 1.35, end: 2.35, scaleFrom: 0.84 },
    }),
    image("Bottom brand mark", "/templates/emerald/monogram.svg", {
      x: 56,
      y: 1176,
      width: 66,
      height: 66,
      z: COPY_Z,
      reveal: { start: 1.6, end: 2.6, riseBy: 12 },
    }),
  ],

  textLayers: [
    text("Top brand", "VERDANT", {
      x: 62,
      y: 86,
      size: 26,
      width: 320,
      z: HEADER_Z,
      weight: 600,
      letterSpacing: 2.4,
      color: "#eaf7f0",
      reveal: { start: 0.2, end: 1.2, riseBy: 10 },
    }),
    text("Top status", "Coming soon", {
      x: 694,
      y: 86,
      size: 26,
      width: 320,
      z: HEADER_Z,
      weight: 400,
      align: "right",
      color: "#bcd8cb",
      reveal: { start: 0.3, end: 1.3, riseBy: 10 },
    }),

    text("Headline", "What if you\nhad access to\nthis service?", {
      x: 56,
      y: 618,
      size: 76,
      width: 640,
      z: HEADLINE_Z,
      weight: 600,
      lineHeight: 0.99,
      letterSpacing: -2.6,
      color: "#ffffff",
      // White falling to mint down the block, which is how the reference lands
      // its third line — one editable headline rather than two stacked layers.
      gradient: { from: "#ffffff", to: "#74dba9", angle: 180 },
      reveal: { start: 0.7, end: 1.8, riseBy: 34 },
    }),

    text(
      "Body copy",
      "Through intelligent strategies in modern financing,\nyou can unlock faster growth and sustainable\ninvestment opportunities with confidence.",
      {
        x: 58,
        y: 886,
        size: 21,
        width: 620,
        z: COPY_Z,
        weight: 400,
        lineHeight: 1.52,
        color: "#dbeee4",
        reveal: { start: 1, end: 2, riseBy: 22 },
      },
    ),

    text("CTA NOW label", "NOW", {
      x: 76,
      y: 1024,
      size: 22,
      width: 128,
      z: COPY_Z + 0.04,
      weight: 700,
      align: "center",
      letterSpacing: 0.8,
      color: "#03291a",
      reveal: { start: 1.4, end: 2.4 },
    }),
    text("CTA label", "Access and Start Today!", {
      x: 226,
      y: 1023,
      size: 24,
      width: 312,
      z: COPY_Z + 0.04,
      weight: 600,
      color: "#f2fbf6",
      reveal: { start: 1.45, end: 2.45, shiftBy: 18 },
    }),

    text("Bottom brand", "VERDANT", {
      x: 138,
      y: 1180,
      size: 30,
      width: 300,
      z: COPY_Z,
      weight: 600,
      letterSpacing: 2.8,
      color: "#f2fbf6",
      reveal: { start: 1.6, end: 2.6, riseBy: 12 },
    }),
    text("Bottom brand line", "SMART FINANCE", {
      x: 139,
      y: 1226,
      size: 13,
      width: 300,
      z: COPY_Z,
      weight: 500,
      letterSpacing: 4,
      color: "#89bfa6",
      reveal: { start: 1.7, end: 2.7, riseBy: 12 },
    }),
    text(
      "Bottom description",
      "Verdant connects modern financial tools with accessible digital\nexperiences, helping people understand, manage and grow their\nassets through one clear and secure interface.",
      {
        x: 390,
        y: 1178,
        size: 13,
        width: 630,
        z: COPY_Z,
        weight: 400,
        lineHeight: 1.55,
        color: "#95bdac",
        reveal: { start: 1.8, end: 2.8, riseBy: 12 },
      },
    ),
  ],
};
