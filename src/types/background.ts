import type { SafePatternCss } from "./pattern";

/**
 * The composition background.
 *
 * Backgrounds are painted as a DOM layer behind the transparent WebGL canvas,
 * not as a plane inside the 3D scene. That is what lets a CSS pattern be a real
 * CSS pattern rather than an approximation, costs the renderer nothing, and
 * keeps a transparent export genuinely transparent. Export composites the two
 * layers back together at full resolution.
 */

export type BackgroundKind = "solid" | "gradient" | "pattern" | "image" | "transparent";

export type GradientMode = "linear" | "radial" | "conic";

export interface SolidBackground {
  type: "solid";
  value: string;
}

export interface GradientBackground {
  type: "gradient";
  mode: GradientMode;
  from: string;
  to: string;
  /** Degrees. Drives the axis for linear and the start angle for conic. */
  angle: number;
  /** 0–100. Where the gradient centres, along its own axis. */
  position: number;
  opacity: number;
}

export interface PatternBackground {
  type: "pattern";
  /** Library pattern this came from, or `null` when hand-authored. */
  patternId: string | null;
  name: string;
  /**
   * Resolved, validated CSS.
   *
   * Stored rather than re-derived from `patternId`, so a project keeps looking
   * the way it was saved even if the library later retires or retunes that
   * pattern.
   */
  css: SafePatternCss;
  /** The colours it was tinted with, so the editor can reopen the controls. */
  colors?: { base: string; accent: string };
  opacity: number;
}

export interface ImageBackground {
  type: "image";
  assetId: string;
  fit: "cover" | "contain" | "fill";
  opacity: number;
}

export interface TransparentBackground {
  type: "transparent";
}

export type BackgroundConfig =
  | SolidBackground
  | GradientBackground
  | PatternBackground
  | ImageBackground
  | TransparentBackground;

export const DEFAULT_BACKGROUND: BackgroundConfig = {
  type: "solid",
  value: "#0f1014",
};

export const DEFAULT_GRADIENT: GradientBackground = {
  type: "gradient",
  mode: "linear",
  from: "#faf8f3",
  to: "#e7e2ff",
  angle: 135,
  position: 50,
  opacity: 1,
};

/** The colour a background reads as when one flat value is needed. */
export function backgroundBaseColor(background: BackgroundConfig): string | null {
  switch (background.type) {
    case "solid":
      return background.value;
    case "gradient":
      return background.from;
    case "pattern":
      return background.css.backgroundColor ?? null;
    case "image":
    case "transparent":
      return null;
  }
}
