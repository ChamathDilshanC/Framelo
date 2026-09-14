/**
 * Normalising text layer data that came from outside this session.
 *
 * Text is drawn with `fillText` onto a canvas and uploaded as a texture. It is
 * never inserted as markup, never evaluated and never handed to a style
 * attribute, so there is no injection surface here — the risk is different and
 * duller: a project from local storage, a share link or a future build can
 * carry a NaN font size, a negative line height, a colour string the canvas
 * rejects, or a megabyte of content, and any of those turns a text layer into
 * a broken editor rather than a broken layer.
 *
 * So every field is clamped into a range that can be drawn, and anything
 * unrecognised falls back to the default rather than propagating.
 */

import {
  DEFAULT_TEXT_STYLE,
  resolveTextMetadata,
  type TextAlign,
  type TextDirection,
  type TextLayerMetadata,
  type TextRevealMode,
  type TextTransformMode,
} from "./text-types";

/**
 * Longest content a single text layer may hold.
 *
 * Generous for any real caption or headline, and small enough that the layout
 * pass over it stays instant.
 */
export const MAX_TEXT_LENGTH = 5000;

export const TEXT_LIMITS = {
  fontSize: { min: 4, max: 800 },
  lineHeight: { min: 0.5, max: 4 },
  letterSpacing: { min: -50, max: 200 },
  boxWidth: { min: 40, max: 8000 },
  strokeWidth: { min: 0, max: 60 },
  shadowOffset: { min: -200, max: 200 },
  shadowBlur: { min: 0, max: 200 },
  padding: { min: 0, max: 400 },
  radius: { min: 0, max: 400 },
  weight: { min: 100, max: 900 },
} as const;

const ALIGNMENTS: readonly TextAlign[] = ["left", "center", "right", "justify"];
const TRANSFORMS: readonly TextTransformMode[] = ["none", "uppercase", "lowercase", "capitalize"];
const DIRECTIONS: readonly TextDirection[] = ["auto", "ltr", "rtl"];
const REVEAL_MODES: readonly TextRevealMode[] = ["none", "characters", "words", "lines"];

/**
 * Colours accepted for text.
 *
 * An allowlist of notations the canvas understands, rather than a blocklist:
 * hex, rgb/rgba, hsl/hsla and the CSS named colours. Anything else becomes the
 * default, so a malformed value shows as the wrong colour rather than silently
 * making `fillStyle` a no-op and painting the previous layer's colour.
 */
const COLOR_PATTERN =
  /^(?:#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgb|hsl)a?\(\s*[0-9a-z.,%\s/+-]{3,80}\)|[a-z]{3,20})$/i;

export function sanitizeColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 100) return fallback;
  return COLOR_PATTERN.test(trimmed) ? trimmed : fallback;
}

function num(value: unknown, fallback: number, range: { min: number; max: number }): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(range.max, Math.max(range.min, parsed));
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function unit(value: unknown, fallback: number): number {
  return num(value, fallback, { min: 0, max: 1 });
}

/** Bring a stored text layer's metadata into a state that can be drawn. */
export function sanitizeTextMetadata(raw: unknown): TextLayerMetadata {
  const input = resolveTextMetadata(raw);
  const d = DEFAULT_TEXT_STYLE;

  const content = typeof input.content === "string" ? input.content.slice(0, MAX_TEXT_LENGTH) : "";

  return {
    content,
    fontId: typeof input.fontId === "string" && input.fontId.length <= 60 ? input.fontId : d.fontId,
    // Rounded to a real step: a canvas will happily accept 437 and render the
    // nearest face anyway, so storing it only misleads the weight control.
    fontWeight: Math.round(num(input.fontWeight, d.fontWeight, TEXT_LIMITS.weight) / 100) * 100,
    fontStyle: input.fontStyle === "italic" ? "italic" : "normal",
    fontSize: num(input.fontSize, d.fontSize, TEXT_LIMITS.fontSize),

    fill: {
      type: input.fill?.type === "gradient" ? "gradient" : "solid",
      color: sanitizeColor(input.fill?.color, d.fill.color),
      gradient: {
        from: sanitizeColor(input.fill?.gradient?.from, d.fill.gradient.from),
        to: sanitizeColor(input.fill?.gradient?.to, d.fill.gradient.to),
        angle: num(input.fill?.gradient?.angle, d.fill.gradient.angle, { min: -360, max: 360 }),
      },
    },

    stroke: {
      enabled: bool(input.stroke?.enabled, d.stroke.enabled),
      color: sanitizeColor(input.stroke?.color, d.stroke.color),
      width: num(input.stroke?.width, d.stroke.width, TEXT_LIMITS.strokeWidth),
      opacity: unit(input.stroke?.opacity, d.stroke.opacity),
    },

    shadow: {
      enabled: bool(input.shadow?.enabled, d.shadow.enabled),
      color: sanitizeColor(input.shadow?.color, d.shadow.color),
      x: num(input.shadow?.x, d.shadow.x, TEXT_LIMITS.shadowOffset),
      y: num(input.shadow?.y, d.shadow.y, TEXT_LIMITS.shadowOffset),
      blur: num(input.shadow?.blur, d.shadow.blur, TEXT_LIMITS.shadowBlur),
      opacity: unit(input.shadow?.opacity, d.shadow.opacity),
    },

    backdrop: {
      enabled: bool(input.backdrop?.enabled, d.backdrop.enabled),
      color: sanitizeColor(input.backdrop?.color, d.backdrop.color),
      opacity: unit(input.backdrop?.opacity, d.backdrop.opacity),
      padding: num(input.backdrop?.padding, d.backdrop.padding, TEXT_LIMITS.padding),
      radius: num(input.backdrop?.radius, d.backdrop.radius, TEXT_LIMITS.radius),
    },

    textAlign: pick(input.textAlign, ALIGNMENTS, d.textAlign),
    lineHeight: num(input.lineHeight, d.lineHeight, TEXT_LIMITS.lineHeight),
    letterSpacing: num(input.letterSpacing, d.letterSpacing, TEXT_LIMITS.letterSpacing),
    textTransform: pick(input.textTransform, TRANSFORMS, d.textTransform),
    direction: pick(input.direction, DIRECTIONS, d.direction),

    boxMode: input.boxMode === "fixed" ? "fixed" : "auto",
    boxWidth: num(input.boxWidth, d.boxWidth, TEXT_LIMITS.boxWidth),

    revealMode: pick(input.revealMode, REVEAL_MODES, d.revealMode),
    autoName: bool(input.autoName, d.autoName),
  };
}
