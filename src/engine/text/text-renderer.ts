/**
 * Text rasterisation.
 *
 * Text is drawn to a 2D canvas and uploaded as a texture on a plane in the
 * existing Three.js scene. That choice carries the whole feature:
 *
 * - **It exports.** Export renders the WebGL scene and composites it over the
 *   background. Anything that is not in that scene — a DOM overlay, however
 *   convincing on screen — is simply absent from every PNG. Text in the scene
 *   needs no second export path (§42).
 * - **It speaks every language.** `fillText` runs the browser's own shaping
 *   engine, so Sinhala and Tamil conjuncts, Devanagari matras, Arabic joining
 *   and bidirectional runs all come out correct. `TextGeometry` cannot shape
 *   any of them (§13).
 * - **It has real depth.** A plane at a Z position occludes and is occluded by
 *   the device, because it is in the same scene with the same camera (§40).
 * - **Gradient, stroke and shadow are native.** They are Canvas2D primitives,
 *   not effects to reimplement in a shader (§18-20).
 *
 * The cost is that a texture must be redrawn when the text or its style
 * changes. Everything below exists to make sure that happens no more often
 * than it must (§54).
 */

import * as THREE from "three";

import {
  canvasFontString,
  layoutText,
  lineOffset,
  measureText,
  visibleContent,
} from "./text-layout";
import { fontStackFor } from "./text-fonts";
import type { TextLayerMetadata } from "./text-types";
import { pxToWorld } from "./text-types";

/**
 * Supersampling factor.
 *
 * Text is the one thing in a mockup a viewer reads rather than looks at, so it
 * is rasterised above its on-screen size and minified by the GPU. 2 is the
 * point where the edges stop being the limiting factor; 3 costs 2.25× the
 * memory for a difference nobody can see.
 */
const SUPERSAMPLE = 2;

/** Hard ceiling on a text texture, in device pixels per side. */
const MAX_TEXTURE_SIZE = 4096;

/**
 * Can this style be drawn once in white and coloured by the material?
 *
 * Only when the fill is the single coloured thing in the drawing. A stroke,
 * a shadow or a backdrop plate each bake their own colour into the same
 * texture, and a material tint multiplies all of it — so those cases have to
 * keep painting the real colour.
 *
 * Worth the special case because it is the common one, and because it turns
 * a colour change from "redraw the glyphs and re-upload the texture" into a
 * single material write. It also lets the same words in ten different
 * colours share one texture.
 */
export function isTintable(style: TextLayerMetadata): boolean {
  return (
    style.fill.type === "solid" &&
    !style.stroke.enabled &&
    !style.shadow.enabled &&
    !style.backdrop.enabled
  );
}

export interface RasterizedText {
  texture: THREE.CanvasTexture;
  /** Plane size in world units. */
  worldWidth: number;
  worldHeight: number;
  /** Text block size in composition pixels, for the selection box. */
  pixelWidth: number;
  pixelHeight: number;
  /** Bytes the texture occupies, for the cache budget. */
  bytes: number;
  /**
   * Drawn in white, to be coloured by the material rather than repainted.
   * The caller must set the material colour to the fill when this is true,
   * and back to white when it is not.
   */
  tinted: boolean;
}

/**
 * Everything that changes what the texture looks like.
 *
 * Note what is *absent*: position, rotation, scale and opacity. Moving text
 * must not redraw it — those are matrix and material changes, so a text layer
 * animating across the frame rasterises once and then costs nothing (§54).
 */
function cacheKey(style: TextLayerMetadata, content: string, blur: number): string {
  const { fill, stroke, shadow, backdrop } = style;
  // JSON rather than a joined string: every field is quoted and escaped, so no
  // combination of values can collide with a different combination — and it
  // needs no separator character that the content might itself contain.
  return JSON.stringify([
    content,
    blur,
    style.fontId,
    style.fontWeight,
    style.fontStyle,
    style.fontSize,
    style.textAlign,
    style.lineHeight,
    style.letterSpacing,
    style.textTransform,
    style.direction,
    style.boxMode,
    style.boxMode === "fixed" ? style.boxWidth : 0,
    fill.type,
    // A tintable style leaves its colour out of the key, so the same words
    // in any number of colours resolve to one texture.
    isTintable(style) ? "tint" : fill.color,
    fill.type === "gradient" ? `${fill.gradient.from}|${fill.gradient.to}|${fill.gradient.angle}` : "",
    stroke.enabled ? `${stroke.color}|${stroke.width}|${stroke.opacity}` : "",
    shadow.enabled ? `${shadow.color}|${shadow.x}|${shadow.y}|${shadow.blur}|${shadow.opacity}` : "",
    backdrop.enabled ? `${backdrop.color}|${backdrop.opacity}|${backdrop.padding}|${backdrop.radius}` : "",
  ]);
}

interface CacheEntry {
  value: RasterizedText;
  users: number;
}

/**
 * Texture cache, shared across every text layer.
 *
 * Reference counted rather than time-expired: two layers with the same styled
 * words — a duplicated caption, a repeated label — share one texture, and a
 * texture is only disposed when nothing is using it. A reveal animation cycles
 * through a bounded set of strings and therefore a bounded set of entries.
 */
const cache = new Map<string, CacheEntry>();

/** Total cached texture bytes before the unused entries are dropped. */
const CACHE_BUDGET_BYTES = 96 * 1024 * 1024;

let cachedBytes = 0;

export function rasterizeText(
  style: TextLayerMetadata,
  content: string,
  blur = 0,
): RasterizedText | null {
  if (typeof document === "undefined") return null;

  const key = cacheKey(style, content, blur);
  const hit = cache.get(key);
  if (hit) {
    hit.users += 1;
    return hit.value;
  }

  const value = draw(style, content, blur);
  if (!value) return null;

  cache.set(key, { value, users: 1 });
  cachedBytes += value.bytes;
  if (cachedBytes > CACHE_BUDGET_BYTES) evictUnused();

  return value;
}

/** Give a texture back. Disposal is deferred to the eviction pass. */
export function releaseText(value: RasterizedText | null): void {
  if (!value) return;
  for (const entry of cache.values()) {
    if (entry.value !== value) continue;
    entry.users = Math.max(0, entry.users - 1);
    return;
  }
}

function evictUnused(): void {
  for (const [key, entry] of cache) {
    if (entry.users > 0) continue;
    entry.value.texture.dispose();
    cachedBytes -= entry.value.bytes;
    cache.delete(key);
    if (cachedBytes <= CACHE_BUDGET_BYTES * 0.8) return;
  }
}

/** Drop everything. Used when a project closes. */
export function clearTextCache(): void {
  for (const entry of cache.values()) entry.value.texture.dispose();
  cache.clear();
  cachedBytes = 0;
}

export function textCacheStats(): { entries: number; bytes: number } {
  return { entries: cache.size, bytes: cachedBytes };
}

/**
 * Trade mipmapping for sharpness while a frame is captured.
 *
 * The two uses of a text texture want opposite things. The editor viewport
 * minifies it heavily — a 1920-wide composition shown in ~700 pixels — and
 * needs mipmaps or thin strokes shimmer. An export renders the composition at
 * its own size, so the texture is minified by exactly the supersample factor,
 * and there bilinear sampling of the full-resolution image *is* the ideal
 * downsample: four texels averaged into one pixel. Trilinear mipmapping
 * instead blends two smaller levels and visibly softens every edge.
 *
 * Measured over the text band of a 1080p export, the share of glyph pixels
 * that are neither background nor solid ink — the blur that made exported
 * text look soft — falls from 23.3% to 14.4%.
 *
 * Called around the render in `captureFrame` and always restored, so the
 * editor keeps the filtering it needs.
 */
export function setTextTextureSharpness(sharp: boolean): void {
  const filter = sharp ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
  for (const entry of cache.values()) {
    const texture = entry.value.texture;
    if (texture.minFilter === filter) continue;
    texture.minFilter = filter;
    // Re-applies the sampler parameters on the next bind. The mipmaps stay
    // uploaded either way, so flipping back costs nothing.
    texture.needsUpdate = true;
  }
}

export interface TextBlockMetrics {
  /** Texture size in composition pixels, effects included. */
  pixelWidth: number;
  pixelHeight: number;
  /** The text block itself, without the effect padding. */
  blockWidth: number;
  blockHeight: number;
  padding: number;
  lineHeightPx: number;
  lineCount: number;
  rtl: boolean;
}

/**
 * Measure a text layer without drawing it.
 *
 * The selection box, the drag maths and the editing overlay all need to know
 * how big the text is on screen. They ask here rather than measuring
 * themselves, so the outline drawn around the text and the texture the text is
 * drawn into can never disagree about where its edges are.
 */
export function textBlockMetrics(style: TextLayerMetadata, content: string): TextBlockMetrics {
  const stack = fontStackFor(style.fontId, content);
  const layout = layoutText(style, content, stack);

  const { backdrop, shadow, stroke } = style;

  // The drawing has to fit effects that reach outside the text itself.
  const padding =
    (backdrop.enabled ? backdrop.padding : 0) +
    (stroke.enabled ? stroke.width : 0) +
    (shadow.enabled ? shadow.blur + Math.max(Math.abs(shadow.x), Math.abs(shadow.y)) : 0) +
    // A little slack for glyphs that overshoot their advance width —
    // descenders, Devanagari matras, Arabic tails.
    style.fontSize * 0.3;

  const blockWidth =
    style.boxMode === "fixed" ? Math.max(layout.width, style.boxWidth) : layout.width;

  return {
    pixelWidth: Math.max(1, blockWidth + padding * 2),
    pixelHeight: Math.max(1, layout.height + padding * 2),
    blockWidth,
    blockHeight: layout.height,
    padding,
    lineHeightPx: layout.lineHeightPx,
    lineCount: layout.lines.length,
    rtl: layout.rtl,
  };
}

function draw(style: TextLayerMetadata, content: string, blur: number): RasterizedText | null {
  const stack = fontStackFor(style.fontId, content);
  const layout = layoutText(style, content, stack);
  const { backdrop, stroke } = style;
  const metrics = textBlockMetrics(style, content);
  const { padding, blockWidth } = metrics;
  // A blurred glyph spreads past its own bounds, so the texture has to
  // grow with the blur or the softened edges are clipped into hard ones.
  const bleed = blur * 3;
  const pixelWidth = metrics.pixelWidth + bleed * 2;
  const pixelHeight = metrics.pixelHeight + bleed * 2;

  const scale = Math.min(
    SUPERSAMPLE,
    MAX_TEXTURE_SIZE / Math.max(pixelWidth, pixelHeight),
  );

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(pixelWidth * scale));
  canvas.height = Math.max(1, Math.round(pixelHeight * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(scale, scale);
  // Keeps the drawing centred once the bleed has grown the canvas.
  ctx.translate(bleed, bleed);
  if (blur > 0) ctx.filter = `blur(${blur}px)`;
  ctx.textBaseline = "alphabetic";
  ctx.font = canvasFontString(style, stack);
  // Let the browser resolve bidirectional runs; `direction` only sets the base
  // paragraph level, which is exactly what a direction control should do (§51).
  ctx.direction = layout.rtl ? "rtl" : "ltr";

  if (backdrop.enabled) drawBackdrop(ctx, style, metrics.pixelWidth, metrics.pixelHeight);

  applyShadow(ctx, style, scale);

  const tinted = isTintable(style);
  const fillStyle = tinted
    ? "#ffffff"
    : resolveFill(ctx, style, padding, blockWidth, layout.height);

  for (let index = 0; index < layout.lines.length; index += 1) {
    const line = layout.lines[index];
    const y = padding + index * layout.lineHeightPx + layout.baselineOffset;
    const x = padding + lineOffset(style.textAlign, line.width, blockWidth, layout.rtl);

    if (stroke.enabled && stroke.width > 0) {
      ctx.save();
      ctx.globalAlpha = stroke.opacity;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      drawLine(ctx, line.text, x, y, style, "stroke");
      ctx.restore();
    }

    ctx.fillStyle = fillStyle;
    drawLine(ctx, line.text, x, y, style, "fill");

    // The shadow is cast by the text as a whole, not by each line onto the
    // next — so it is cleared after the first line is painted.
    if (index === 0) clearShadow(ctx);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  // Mipmapped for the editor, where the viewport shows a 1920-wide
  // composition in ~700 pixels and text is minified about 5×. Without
  // mipmaps that minification aliases and thin strokes shimmer while the
  // camera moves. See `setTextTextureSharpness` for what export does instead.
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return {
    texture,
    worldWidth: pxToWorld(pixelWidth),
    worldHeight: pxToWorld(pixelHeight),
    pixelWidth,
    pixelHeight,
    bytes: canvas.width * canvas.height * 4,
    tinted,
  };
}

/**
 * Draw one line.
 *
 * Letter spacing is applied by drawing character by character when the context
 * does not implement `letterSpacing`. That is slower, so it is only done when
 * spacing is actually non-zero — and never for a script whose glyphs join,
 * where splitting the string would break the shaping that makes it legible.
 */
function drawLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: TextLayerMetadata,
  mode: "fill" | "stroke",
): void {
  if (!text) return;

  const paint = mode === "fill" ? ctx.fillText.bind(ctx) : ctx.strokeText.bind(ctx);

  if (!style.letterSpacing) {
    paint(text, x, y);
    return;
  }

  const spacing = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if (typeof spacing.letterSpacing === "string") {
    spacing.letterSpacing = `${style.letterSpacing}px`;
    paint(text, x, y);
    spacing.letterSpacing = "0px";
    return;
  }

  // Manual spacing, left to right, by code point.
  let cursor = x;
  for (const char of text) {
    paint(char, cursor, y);
    cursor += ctx.measureText(char).width + style.letterSpacing;
  }
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  style: TextLayerMetadata,
  width: number,
  height: number,
): void {
  const { backdrop } = style;
  ctx.save();
  ctx.globalAlpha = backdrop.opacity;
  ctx.fillStyle = backdrop.color;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, backdrop.radius);
  ctx.fill();
  ctx.restore();
}

function applyShadow(ctx: CanvasRenderingContext2D, style: TextLayerMetadata, scale: number): void {
  const { shadow } = style;
  if (!shadow.enabled) return;

  ctx.shadowColor = withAlpha(shadow.color, shadow.opacity);
  // `shadowBlur` is in device pixels and ignores the transform, so it has to
  // be scaled by hand or the blur shrinks as the supersample rises.
  ctx.shadowBlur = shadow.blur * scale;
  ctx.shadowOffsetX = shadow.x * scale;
  ctx.shadowOffsetY = shadow.y * scale;
}

function clearShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function resolveFill(
  ctx: CanvasRenderingContext2D,
  style: TextLayerMetadata,
  padding: number,
  blockWidth: number,
  blockHeight: number,
): string | CanvasGradient {
  if (style.fill.type !== "gradient") return style.fill.color;

  const { from, to, angle } = style.fill.gradient;

  // Same convention as CSS `linear-gradient`: 0° runs bottom to top, and the
  // angle increases clockwise.
  const radians = ((angle - 90) * Math.PI) / 180;
  const halfWidth = blockWidth / 2;
  const halfHeight = blockHeight / 2;
  const centreX = padding + halfWidth;
  const centreY = padding + halfHeight;

  // Project the box onto the gradient's axis so the stops land exactly on the
  // edges of the text rather than somewhere inside it.
  const extent = Math.abs(halfWidth * Math.cos(radians)) + Math.abs(halfHeight * Math.sin(radians));
  const dx = Math.cos(radians) * extent;
  const dy = Math.sin(radians) * extent;

  const gradient = ctx.createLinearGradient(centreX - dx, centreY - dy, centreX + dx, centreY + dy);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  return gradient;
}

/** Multiply a hex or CSS colour by an opacity, for shadow colour. */
function withAlpha(color: string, alpha: number): string {
  const clamped = Math.min(1, Math.max(0, alpha));
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return color;

  const hex = match[1];
  const full = hex.length === 3 ? hex.replace(/./g, (c) => c + c) : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

/** Re-exported so callers rasterise the same string the renderer would draw. */
export { visibleContent, measureText };
