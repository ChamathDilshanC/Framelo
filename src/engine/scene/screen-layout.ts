import type { ScreenFit } from "@/types/layer";

export interface ScreenLayout {
  /** Size of the textured plane, in scene units. */
  planeWidth: number;
  planeHeight: number;
  /** UV transform applied to the texture. */
  repeat: [number, number];
  offset: [number, number];
}

/**
 * Resolve how a source image sits inside a device screen.
 *
 * - `cover`   crops the image via UVs so it fills the screen edge to edge.
 * - `contain` shrinks the textured plane to the image aspect, letting the dark
 *   screen backing show through as letterboxing (no UV smearing).
 * - `fill`    stretches the image to the screen.
 */
export function computeScreenLayout(
  fit: ScreenFit,
  screenWidth: number,
  screenHeight: number,
  imageAspect: number | undefined,
  cropX = 0,
  cropY = 0,
): ScreenLayout {
  const base: ScreenLayout = {
    planeWidth: screenWidth,
    planeHeight: screenHeight,
    repeat: [1, 1],
    offset: [0, 0],
  };

  if (!imageAspect || !Number.isFinite(imageAspect) || imageAspect <= 0 || fit === "fill") {
    return base;
  }

  const screenAspect = screenWidth / screenHeight;
  const ratio = imageAspect / screenAspect;

  if (fit === "cover") {
    if (ratio > 1) {
      // Image is wider than the screen: crop the sides.
      return {
        ...base,
        repeat: [1 / ratio, 1],
        offset: [((1 - 1 / ratio) / 2) - clampCrop(cropX) * (1 - 1 / ratio) / 2, 0],
      };
    }
    // Image is taller: crop top and bottom.
    return {
      ...base,
      repeat: [1, ratio],
      offset: [0, ((1 - ratio) / 2) - clampCrop(cropY) * (1 - ratio) / 2],
    };
  }

  function clampCrop(value: number): number {
    return Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
  }

  // contain
  if (ratio > 1) {
    return { ...base, planeHeight: screenWidth / imageAspect };
  }
  return { ...base, planeWidth: screenHeight * imageAspect };
}
