/**
 * The text layer data model.
 *
 * A text layer is an ordinary Framelo `Layer` with `type: "text"`. Its
 * position, rotation, scale and opacity live in the layer's `transform` and its
 * keyframes live in the layer's `animations`, exactly like a device — so the
 * timeline, the evaluator, undo, autosave, sharing and export needed no text
 * specific code to carry it. Everything below is what a *device* layer would
 * never need: the words, the typeface and how they are painted.
 */

export type TextAlign = "left" | "center" | "right" | "justify";
export type TextTransformMode = "none" | "uppercase" | "lowercase" | "capitalize";
export type TextDirection = "auto" | "ltr" | "rtl";
export type TextBoxMode = "auto" | "fixed";

/**
 * How a `reveal` track is interpreted.
 *
 * The track itself is always a plain 0 → 1 curve; this only decides what the
 * fraction counts. Keeping it out of the track is what lets a user switch a
 * typewriter to a word reveal without re-keying the animation.
 */
export type TextRevealMode = "none" | "characters" | "words" | "lines";

export interface TextGradient {
  from: string;
  to: string;
  /** Degrees, clockwise from left-to-right, matching CSS `linear-gradient`. */
  angle: number;
}

export interface TextFill {
  type: "solid" | "gradient";
  color: string;
  gradient: TextGradient;
}

export interface TextStroke {
  enabled: boolean;
  color: string;
  /** Pixels, in composition space. */
  width: number;
  opacity: number;
}

export interface TextShadow {
  enabled: boolean;
  color: string;
  x: number;
  y: number;
  blur: number;
  opacity: number;
}

/** A plate behind the text — a caption chip, a lower third. */
export interface TextBackdrop {
  enabled: boolean;
  color: string;
  opacity: number;
  /** Pixels of padding around the text block. */
  padding: number;
  radius: number;
}

export interface TextLayerMetadata {
  content: string;

  /** Id into `FONT_REGISTRY`, not a raw family name. */
  fontId: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  /** Pixels in composition space. See `PIXELS_PER_WORLD_UNIT`. */
  fontSize: number;

  fill: TextFill;
  stroke: TextStroke;
  shadow: TextShadow;
  backdrop: TextBackdrop;

  textAlign: TextAlign;
  /** Multiplier of the font size, the way CSS unitless `line-height` works. */
  lineHeight: number;
  /** Pixels, positive or negative. */
  letterSpacing: number;
  textTransform: TextTransformMode;
  direction: TextDirection;

  boxMode: TextBoxMode;
  /** Wrapping width in pixels. Only meaningful when `boxMode` is "fixed". */
  boxWidth: number;

  revealMode: TextRevealMode;

  /**
   * Whether the layer name still follows the content.
   *
   * Set to false the moment a user renames the layer by hand, so their name
   * survives every later edit to the words (§28).
   */
  autoName: boolean;
}

/**
 * Defaults for a new text layer.
 *
 * One object, referenced everywhere, so "what does new text look like" is a
 * single answer rather than a constant repeated across components.
 */
export const DEFAULT_TEXT_STYLE: TextLayerMetadata = {
  content: "",
  fontId: "inter",
  fontWeight: 600,
  fontStyle: "normal",
  fontSize: 64,
  fill: {
    type: "solid",
    color: "#FFFFFF",
    gradient: { from: "#FFFFFF", to: "#7C5CFF", angle: 90 },
  },
  stroke: { enabled: false, color: "#000000", width: 2, opacity: 1 },
  shadow: { enabled: false, color: "#000000", x: 0, y: 8, blur: 24, opacity: 0.45 },
  backdrop: { enabled: false, color: "#000000", opacity: 0.5, padding: 24, radius: 12 },
  textAlign: "center",
  lineHeight: 1.2,
  letterSpacing: 0,
  textTransform: "none",
  direction: "auto",
  boxMode: "auto",
  boxWidth: 720,
  revealMode: "none",
  autoName: true,
};

/**
 * The placeholder a brand-new layer shows.
 *
 * Never written to the project: `createTextLayer` stores empty content and the
 * renderer draws this instead when there is nothing to draw, so a user who
 * creates a text layer and clicks away is left with an empty layer rather than
 * the words "Type something…" saved into their composition (§1).
 */
export const TEXT_PLACEHOLDER = "Type something...";

/**
 * How many composition pixels make up one world unit.
 *
 * Derived, not chosen: the default camera sits at z 7.6 with a 32° vertical
 * field of view, so it sees 2 × 7.6 × tan(16°) ≈ 4.359 world units of height.
 * A 1080-tall composition therefore spans 1080 / 4.359 ≈ 248 pixels per unit.
 *
 * This is what makes the font size honest — 64px text measures 64 real pixels
 * in a 1080p export, rather than an arbitrary number that happens to look
 * about right.
 */
export const PIXELS_PER_WORLD_UNIT = 248;

/** Composition pixels → world units. */
export function pxToWorld(pixels: number): number {
  return pixels / PIXELS_PER_WORLD_UNIT;
}

/** World units → composition pixels. */
export function worldToPx(units: number): number {
  return units * PIXELS_PER_WORLD_UNIT;
}

/** Fill in anything a stored layer is missing, so old and partial data loads. */
export function resolveTextMetadata(raw: unknown): TextLayerMetadata {
  const value = (raw ?? {}) as Partial<TextLayerMetadata>;
  return {
    ...DEFAULT_TEXT_STYLE,
    ...value,
    fill: { ...DEFAULT_TEXT_STYLE.fill, ...value.fill },
    stroke: { ...DEFAULT_TEXT_STYLE.stroke, ...value.stroke },
    shadow: { ...DEFAULT_TEXT_STYLE.shadow, ...value.shadow },
    backdrop: { ...DEFAULT_TEXT_STYLE.backdrop, ...value.backdrop },
  };
}

/** Apply the display-only casing. The stored content is never rewritten (§24). */
export function applyTextTransform(content: string, mode: TextTransformMode): string {
  switch (mode) {
    case "uppercase":
      return content.toLocaleUpperCase();
    case "lowercase":
      return content.toLocaleLowerCase();
    case "capitalize":
      // Unicode-aware: the first letter of each run of word characters, so
      // this behaves on accented and non-Latin text rather than only ASCII.
      return content.replace(/(^|\s)(\p{L})/gu, (_match, lead: string, letter: string) =>
        lead + letter.toLocaleUpperCase(),
      );
    default:
      return content;
  }
}

/** The layer name derived from its words (§28). */
export function nameFromContent(content: string): string {
  const cleaned = content.replace(/\s+/g, " ").trim();
  if (!cleaned) return "Text";
  return cleaned.length > 28 ? `${cleaned.slice(0, 28).trimEnd()}…` : cleaned;
}
