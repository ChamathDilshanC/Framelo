import { resolveBackgroundStyle } from "@/engine/background/resolve";
import type { BackgroundConfig } from "@/types/background";

/**
 * Painting a background into a 2D canvas, for export.
 *
 * The editor renders backgrounds as a DOM layer behind a transparent WebGL
 * canvas — that is what makes a CSS pattern a real CSS pattern. Export then has
 * to put the two layers back together, which means reproducing that DOM layer
 * as pixels.
 *
 * Gradients, solids and images have exact Canvas2D equivalents, so those are
 * painted directly. Patterns are arbitrary CSS with no Canvas2D equivalent, so
 * they go through an SVG `foreignObject`: the browser's own CSS engine draws
 * them, and the result is a self-contained data URL with no external
 * references, so the canvas stays untainted and `toBlob` still works.
 */

export interface BackgroundPaintOptions {
  width: number;
  height: number;
  /** Object URL for an image background, already resolved by the caller. */
  assetUrl?: string | null;
}

/**
 * Paint `background` across the whole context.
 *
 * Returns false when nothing was painted (a transparent background, or a
 * pattern the browser refused to rasterise), so the caller knows the frame has
 * an alpha channel rather than a colour behind it.
 */
export async function paintBackground(
  ctx: CanvasRenderingContext2D,
  background: BackgroundConfig,
  options: BackgroundPaintOptions,
): Promise<boolean> {
  const { width, height } = options;

  switch (background.type) {
    case "transparent":
      return false;

    case "solid":
      ctx.fillStyle = background.value;
      ctx.fillRect(0, 0, width, height);
      return true;

    case "gradient": {
      ctx.save();
      ctx.globalAlpha = clamp(background.opacity, 0, 1);
      ctx.fillStyle = buildCanvasGradient(ctx, background, width, height);
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
      return true;
    }

    case "image": {
      if (!options.assetUrl) return false;
      const image = await loadImage(options.assetUrl).catch(() => null);
      if (!image) return false;

      ctx.save();
      ctx.globalAlpha = clamp(background.opacity, 0, 1);
      drawFitted(ctx, image, width, height, background.fit);
      ctx.restore();
      return true;
    }

    case "pattern": {
      // A base colour first, so a pattern that fails to rasterise still exports
      // as its own background colour rather than as a hole.
      const base = background.css.backgroundColor;
      if (base) {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, width, height);
      }

      const image = await rasterizeCss(
        resolveBackgroundStyle(background, null).style,
        width,
        height,
      ).catch(() => null);

      if (!image) return Boolean(base);

      ctx.save();
      ctx.globalAlpha = clamp(background.opacity, 0, 1);
      ctx.drawImage(image, 0, 0, width, height);
      ctx.restore();
      return true;
    }
  }
}

function buildCanvasGradient(
  ctx: CanvasRenderingContext2D,
  background: Extract<BackgroundConfig, { type: "gradient" }>,
  width: number,
  height: number,
): CanvasGradient {
  const centreY = (clamp(background.position, 0, 100) / 100) * height;

  if (background.mode === "radial") {
    const radius = Math.max(width, height) * 0.75;
    const gradient = ctx.createRadialGradient(width / 2, centreY, 0, width / 2, centreY, radius);
    gradient.addColorStop(0, background.from);
    gradient.addColorStop(1, background.to);
    return gradient;
  }

  if (background.mode === "conic") {
    const gradient = ctx.createConicGradient(
      (background.angle * Math.PI) / 180,
      width / 2,
      centreY,
    );
    gradient.addColorStop(0, background.from);
    gradient.addColorStop(0.5, background.to);
    gradient.addColorStop(1, background.from);
    return gradient;
  }

  // CSS measures the gradient angle clockwise from "up"; canvas works in
  // vectors from the centre, so the axis is derived rather than copied.
  const radians = ((background.angle - 90) * Math.PI) / 180;
  const half = Math.max(width, height) / 2;
  const dx = Math.cos(radians) * half;
  const dy = Math.sin(radians) * half;

  const gradient = ctx.createLinearGradient(
    width / 2 - dx,
    height / 2 - dy,
    width / 2 + dx,
    height / 2 + dy,
  );
  gradient.addColorStop(0, background.from);
  gradient.addColorStop(1, background.to);
  return gradient;
}

function drawFitted(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
  fit: "cover" | "contain" | "fill",
): void {
  if (fit === "fill") {
    ctx.drawImage(image, 0, 0, width, height);
    return;
  }

  const scale =
    fit === "cover"
      ? Math.max(width / image.width, height / image.height)
      : Math.min(width / image.width, height / image.height);

  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  ctx.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

/**
 * Render a CSS declaration block to an image via SVG `foreignObject`.
 *
 * The SVG is inlined as a data URL and references nothing external, which is
 * what keeps the destination canvas exportable. `url()` values are rejected by
 * the pattern validator long before they reach here, so there is nothing to
 * fetch either.
 */
async function rasterizeCss(
  style: React.CSSProperties,
  width: number,
  height: number,
): Promise<HTMLImageElement> {
  const declarations = Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${kebab(key)}:${String(value)}`)
    .join(";");

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    `<foreignObject width="100%" height="100%">`,
    `<div xmlns="http://www.w3.org/1999/xhtml" style="${escapeXml(
      `width:${width}px;height:${height}px;${declarations}`,
    )}"></div>`,
    `</foreignObject>`,
    `</svg>`,
  ].join("");

  return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The background image could not be rendered"));
    image.src = src;
  });
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return max;
  return Math.min(max, Math.max(min, value));
}
