import * as THREE from "three";

/**
 * Textures drawn at runtime with Canvas2D.
 *
 * Keeping them procedural means the editor ships with a polished default look
 * without any binary assets, and both are created once and shared.
 */

let placeholderCanvas: HTMLCanvasElement | null | undefined;
const placeholderScreens = new Map<boolean, THREE.CanvasTexture>();
let softShadow: THREE.CanvasTexture | null = null;

export const PLACEHOLDER_SCREEN_ASPECT = 580 / 1228;

/**
 * The default device screen: a neutral app surface, not a blank panel.
 *
 * `flipY` has to match the geometry the texture lands on — procedural planes
 * use the three.js default, imported glTF screens the opposite — and textures
 * of both orientations cannot share one upload, so one is cached per variant.
 */
export function getPlaceholderScreenTexture(flipY = true): THREE.CanvasTexture | null {
  const existing = placeholderScreens.get(flipY);
  if (existing) return existing;

  const canvas = getPlaceholderCanvas();
  if (!canvas) return null;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.flipY = flipY;
  texture.needsUpdate = true;
  placeholderScreens.set(flipY, texture);
  return texture;
}

function getPlaceholderCanvas(): HTMLCanvasElement | null {
  if (placeholderCanvas !== undefined) return placeholderCanvas;
  placeholderCanvas = drawPlaceholder();
  return placeholderCanvas;
}

function drawPlaceholder(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;

  const width = 580;
  const height = 1228;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Background
  const backdrop = ctx.createLinearGradient(0, 0, width * 0.4, height);
  backdrop.addColorStop(0, "#101017");
  backdrop.addColorStop(1, "#1b1b26");
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, width, height);

  // Accent bloom behind the header
  const bloom = ctx.createRadialGradient(width * 0.2, height * 0.12, 0, width * 0.2, height * 0.12, width * 0.95);
  bloom.addColorStop(0, "rgba(124, 108, 255, 0.38)");
  bloom.addColorStop(1, "rgba(124, 108, 255, 0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, width, height);

  // Status bar
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 26px ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText("9:41", 46, 58);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  for (let i = 0; i < 4; i += 1) {
    roundRect(ctx, width - 150 + i * 22, 50 - i * 3, 12, 8 + i * 6, 3);
    ctx.fill();
  }

  // Title block
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "600 20px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("YOUR DESIGN", 46, 168);

  ctx.fillStyle = "#f5f5f8";
  ctx.font = "600 62px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Framelo", 46, 232);

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "400 26px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText("Drop a screenshot here", 46, 288);

  // Feature cards
  const cardX = 46;
  const cardW = width - 92;
  const cards = [350, 530, 710];
  cards.forEach((y, index) => {
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, cardX, y, cardW, 150, 26);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    roundRect(ctx, cardX, y, cardW, 150, 26);
    ctx.stroke();

    // Icon chip
    ctx.fillStyle = index === 0 ? "rgba(124,108,255,0.85)" : "rgba(255,255,255,0.14)";
    roundRect(ctx, cardX + 26, y + 32, 56, 56, 18);
    ctx.fill();

    // Text lines
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    roundRect(ctx, cardX + 104, y + 44, cardW * 0.46, 14, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    roundRect(ctx, cardX + 104, y + 74, cardW * 0.62, 12, 6);
    ctx.fill();
    roundRect(ctx, cardX + 104, y + 98, cardW * 0.34, 12, 6);
    ctx.fill();
  });

  // Primary action
  ctx.fillStyle = "#7c6cff";
  roundRect(ctx, cardX, 900, cardW, 84, 26);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 28px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Get started", width / 2, 943);
  ctx.textAlign = "left";

  // Tab bar
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(ctx, cardX, height - 210, cardW, 96, 30);
  ctx.fill();
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = i === 0 ? "rgba(124,108,255,0.9)" : "rgba(255,255,255,0.22)";
    const cx = cardX + cardW * (0.14 + i * 0.24);
    roundRect(ctx, cx - 18, height - 178, 36, 32, 11);
    ctx.fill();
  }

  return canvas;
}

/**
 * Radial falloff used by the device's soft shadow. A camera-facing sprite reads
 * far better than a ground plane at the near-level camera angles this editor uses.
 */
export function getSoftShadowTexture(): THREE.CanvasTexture | null {
  if (softShadow) return softShadow;
  if (typeof document === "undefined") return null;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(0.45, "rgba(0,0,0,0.62)");
  gradient.addColorStop(0.75, "rgba(0,0,0,0.18)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  softShadow = new THREE.CanvasTexture(canvas);
  softShadow.needsUpdate = true;
  return softShadow;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
