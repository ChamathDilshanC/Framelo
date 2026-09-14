/**
 * Text measurement, wrapping and reveal.
 *
 * Layout is done against a real `CanvasRenderingContext2D`, which means the
 * browser's own text engine does the measuring — including the shaping of
 * Sinhala, Tamil, Devanagari and Arabic, where a cluster's width is not the sum
 * of its characters' widths. Any measurement Framelo invented itself would be
 * wrong for exactly the scripts this feature exists to support.
 */

import { isRtlText } from "./text-script";
import type { TextAlign, TextLayerMetadata, TextRevealMode } from "./text-types";
import { applyTextTransform } from "./text-types";

export interface TextLine {
  text: string;
  width: number;
}

export interface TextBlockLayout {
  lines: TextLine[];
  /** Widest line, in pixels. */
  width: number;
  /** Total block height, in pixels. */
  height: number;
  lineHeightPx: number;
  /** Distance from a line's top to its baseline. */
  baselineOffset: number;
  rtl: boolean;
}

/**
 * One shared measuring context.
 *
 * Creating a canvas per measurement is the kind of thing that looks harmless
 * and then shows up as jank with 50 text layers on screen (§54).
 */
let measureContext: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext) return measureContext;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  measureContext = canvas.getContext("2d");
  return measureContext;
}

/** The canvas `font` shorthand for a style. */
export function canvasFontString(
  style: Pick<TextLayerMetadata, "fontStyle" | "fontWeight" | "fontSize">,
  stack: string,
): string {
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${stack}`;
}

/**
 * Measure a string, including letter spacing.
 *
 * `letterSpacing` on a 2D context is still not universally supported, so the
 * spacing is added arithmetically: one gap per character *boundary*, which is
 * `count - 1`, not `count`. Using the character count adds a phantom trailing
 * gap that pushes centred text off centre by half a letter.
 */
export function measureText(
  ctx: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number,
): number {
  if (!text) return 0;
  const base = ctx.measureText(text).width;
  if (!letterSpacing) return base;
  // Count by code point, so a surrogate pair or an emoji is one character.
  const count = [...text].length;
  return base + letterSpacing * Math.max(0, count - 1);
}

/**
 * Break text into lines.
 *
 * Explicit newlines always break. When the box is a fixed width, words wrap
 * into it; a single word wider than the box is left to overflow rather than
 * broken mid-cluster, because breaking inside a Devanagari or Sinhala cluster
 * produces visibly broken glyphs.
 */
export function layoutText(
  style: TextLayerMetadata,
  content: string,
  stack: string,
): TextBlockLayout {
  const ctx = getMeasureContext();
  const lineHeightPx = style.fontSize * style.lineHeight;
  const rtl = resolveRtl(style, content);

  if (!ctx) {
    // Server render or a context-less environment: return a plausible box so
    // layout maths does not divide by zero before the browser takes over.
    const lines = content.split("\n").map((text) => ({ text, width: text.length * style.fontSize * 0.5 }));
    return {
      lines,
      width: Math.max(0, ...lines.map((line) => line.width)),
      height: Math.max(lineHeightPx, lines.length * lineHeightPx),
      lineHeightPx,
      baselineOffset: lineHeightPx * 0.5 + style.fontSize * 0.36,
      rtl,
    };
  }

  ctx.font = canvasFontString(style, stack);

  const paragraphs = content.split("\n");
  const lines: TextLine[] = [];

  for (const paragraph of paragraphs) {
    if (style.boxMode === "auto" || style.boxWidth <= 0) {
      lines.push({ text: paragraph, width: measureText(ctx, paragraph, style.letterSpacing) });
      continue;
    }
    lines.push(...wrapParagraph(ctx, paragraph, style));
  }

  // An empty string still occupies a line, or an empty text layer would have
  // no box to select and no caret to place.
  if (lines.length === 0) lines.push({ text: "", width: 0 });

  const width = Math.max(0, ...lines.map((line) => line.width));

  return {
    lines,
    width,
    height: lines.length * lineHeightPx,
    lineHeightPx,
    // Centres the glyphs inside the line box: half the leading above, then
    // roughly the cap-height share of the em below.
    baselineOffset: lineHeightPx * 0.5 + style.fontSize * 0.36,
    rtl,
  };
}

function wrapParagraph(
  ctx: CanvasRenderingContext2D,
  paragraph: string,
  style: TextLayerMetadata,
): TextLine[] {
  const lines: TextLine[] = [];
  // Keep the spaces in the token list so a wrapped line can be rebuilt with
  // its original spacing rather than a normalised single space.
  const tokens = paragraph.split(/(\s+)/).filter((token) => token.length > 0);

  let current = "";

  for (const token of tokens) {
    const candidate = current + token;
    const width = measureText(ctx, candidate.trimEnd(), style.letterSpacing);

    if (width <= style.boxWidth || current === "") {
      current = candidate;
      continue;
    }

    lines.push({ text: current.trimEnd(), width: measureText(ctx, current.trimEnd(), style.letterSpacing) });
    // A line never starts with the whitespace that caused the break.
    current = /^\s+$/.test(token) ? "" : token;
  }

  if (current !== "" || lines.length === 0) {
    const text = current.trimEnd();
    lines.push({ text, width: measureText(ctx, text, style.letterSpacing) });
  }

  return lines;
}

function resolveRtl(style: TextLayerMetadata, content: string): boolean {
  if (style.direction === "rtl") return true;
  if (style.direction === "ltr") return false;
  return isRtlText(content);
}

// ---------------------------------------------------------------------------
// Reveal
// ---------------------------------------------------------------------------

/**
 * How much of the text a `reveal` value shows.
 *
 * Pure and deterministic: the same progress always yields the same string, so
 * scrubbing backwards, exporting a single frame and replaying a shared link all
 * agree. That is the whole reason reveal is a keyframed number rather than a
 * timer ticking characters out (§32).
 *
 * Whitespace is never counted as a unit. Counting it makes a typewriter appear
 * to stall on every space, because a frame's worth of progress is spent
 * revealing something invisible.
 */
export function revealContent(
  content: string,
  mode: TextRevealMode,
  progress: number,
): string {
  if (mode === "none") return content;
  if (progress >= 1) return content;
  if (progress <= 0) return "";

  switch (mode) {
    case "characters":
      return revealCharacters(content, progress);
    case "words":
      return revealWords(content, progress);
    case "lines":
      return revealLines(content, progress);
    default:
      return content;
  }
}

function revealCharacters(content: string, progress: number): string {
  // By code point, so an emoji or a surrogate pair is never split in half —
  // half a surrogate pair is not a character, it is a replacement glyph (§52).
  const characters = [...content];
  const visible = characters.filter((char) => !/\s/.test(char)).length;
  const target = Math.round(visible * progress);

  let shown = 0;
  let index = 0;
  for (; index < characters.length; index += 1) {
    if (shown >= target) break;
    if (!/\s/.test(characters[index])) shown += 1;
  }

  return characters.slice(0, index).join("");
}

function revealWords(content: string, progress: number): string {
  const tokens = content.split(/(\s+)/);
  const words = tokens.filter((token) => token.trim().length > 0).length;
  const target = Math.round(words * progress);

  let shown = 0;
  let index = 0;
  for (; index < tokens.length; index += 1) {
    if (shown >= target) break;
    if (tokens[index].trim().length > 0) shown += 1;
  }

  return tokens.slice(0, index).join("");
}

function revealLines(content: string, progress: number): string {
  const lines = content.split("\n");
  const target = Math.max(0, Math.round(lines.length * progress));
  return lines.slice(0, target).join("\n");
}

/**
 * The content to draw at a moment in time.
 *
 * Casing is applied after the reveal so a capitalised typewriter still
 * capitalises the word it is part-way through, rather than only once the space
 * before it arrives.
 */
export function visibleContent(
  style: TextLayerMetadata,
  content: string,
  reveal: number | undefined,
): string {
  const revealed =
    style.revealMode === "none" || reveal === undefined
      ? content
      : revealContent(content, style.revealMode, reveal);
  return applyTextTransform(revealed, style.textTransform);
}

/** Horizontal offset of a line inside the block, for an alignment. */
export function lineOffset(
  align: TextAlign,
  lineWidth: number,
  blockWidth: number,
  rtl: boolean,
): number {
  const resolved = resolveAlign(align, rtl);
  if (resolved === "center") return (blockWidth - lineWidth) / 2;
  if (resolved === "right") return blockWidth - lineWidth;
  return 0;
}

/**
 * Alignment in visual terms.
 *
 * "Left" in a right-to-left paragraph means the start of the line, which is on
 * the right — so the two flip together. Justify falls back to the start edge,
 * since per-line justification is applied when the line is drawn.
 */
export function resolveAlign(align: TextAlign, rtl: boolean): "left" | "center" | "right" {
  if (align === "center") return "center";
  if (align === "justify") return rtl ? "right" : "left";
  if (rtl) return align === "left" ? "right" : "left";
  return align === "right" ? "right" : "left";
}
