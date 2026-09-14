import type { TextLayerMetadata } from "./text-types";

/**
 * Text style presets.
 *
 * Deliberately separate from motion presets (§49, §50). A style preset says
 * what the text *looks* like; a motion preset says how it *moves*. Keeping them
 * apart is what lets someone put Bold Hero together with Cinematic Text — and
 * it is why every field below is typographic. None of them touches the
 * transform, the animation or the content.
 */

export interface TextStylePreset {
  id: string;
  name: string;
  description: string;
  /** Only the typographic fields; never content, transform or animation. */
  style: Partial<TextLayerMetadata>;
}

export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  {
    id: "modern-headline",
    name: "Modern Headline",
    description: "Tight, heavy sans. The default product headline.",
    style: {
      fontId: "inter",
      fontWeight: 800,
      fontSize: 76,
      letterSpacing: -2,
      lineHeight: 1.05,
      textTransform: "none",
      fill: { type: "solid", color: "#FFFFFF", gradient: { from: "#FFFFFF", to: "#7C5CFF", angle: 90 } },
      stroke: { enabled: false, color: "#000000", width: 2, opacity: 1 },
      shadow: { enabled: false, color: "#000000", x: 0, y: 8, blur: 24, opacity: 0.45 },
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Light weight, generous line height, nothing decorative.",
    style: {
      fontId: "dm-sans",
      fontWeight: 400,
      fontSize: 44,
      letterSpacing: 0,
      lineHeight: 1.45,
      textTransform: "none",
      fill: { type: "solid", color: "#F4F4F5", gradient: { from: "#FFFFFF", to: "#7C5CFF", angle: 90 } },
      stroke: { enabled: false, color: "#000000", width: 2, opacity: 1 },
      shadow: { enabled: false, color: "#000000", x: 0, y: 8, blur: 24, opacity: 0.45 },
    },
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "High-contrast serif with room to breathe.",
    style: {
      fontId: "playfair-display",
      fontWeight: 600,
      fontSize: 68,
      letterSpacing: -0.5,
      lineHeight: 1.18,
      textTransform: "none",
      fill: { type: "solid", color: "#FBF7F0", gradient: { from: "#FFFFFF", to: "#7C5CFF", angle: 90 } },
      stroke: { enabled: false, color: "#000000", width: 2, opacity: 1 },
      shadow: { enabled: false, color: "#000000", x: 0, y: 8, blur: 24, opacity: 0.45 },
    },
  },
  {
    id: "bold-hero",
    name: "Bold Hero",
    description: "Condensed display caps for a launch frame.",
    style: {
      fontId: "bebas-neue",
      // Bebas ships one weight; asking for 700 would render a faked bold.
      fontWeight: 400,
      fontSize: 110,
      letterSpacing: 2,
      lineHeight: 0.98,
      textTransform: "uppercase",
      fill: { type: "solid", color: "#FFFFFF", gradient: { from: "#FFFFFF", to: "#7C5CFF", angle: 90 } },
      stroke: { enabled: false, color: "#000000", width: 2, opacity: 1 },
      shadow: { enabled: true, color: "#000000", x: 0, y: 10, blur: 34, opacity: 0.4 },
    },
  },
  {
    id: "glass",
    name: "Glass",
    description: "Soft white on a translucent plate. Reads over any background.",
    style: {
      fontId: "manrope",
      fontWeight: 600,
      fontSize: 48,
      letterSpacing: 0,
      lineHeight: 1.3,
      textTransform: "none",
      fill: { type: "solid", color: "#FFFFFF", gradient: { from: "#FFFFFF", to: "#7C5CFF", angle: 90 } },
      stroke: { enabled: false, color: "#000000", width: 2, opacity: 1 },
      shadow: { enabled: false, color: "#000000", x: 0, y: 8, blur: 24, opacity: 0.45 },
      backdrop: { enabled: true, color: "#0B0B10", opacity: 0.42, padding: 28, radius: 18 },
    },
  },
  {
    id: "caption",
    name: "Caption",
    description: "Small, muted supporting copy.",
    style: {
      fontId: "inter",
      fontWeight: 500,
      fontSize: 26,
      letterSpacing: 0.2,
      lineHeight: 1.5,
      textTransform: "none",
      fill: { type: "solid", color: "#A1A1AA", gradient: { from: "#FFFFFF", to: "#7C5CFF", angle: 90 } },
      stroke: { enabled: false, color: "#000000", width: 2, opacity: 1 },
      shadow: { enabled: false, color: "#000000", x: 0, y: 8, blur: 24, opacity: 0.45 },
    },
  },
  {
    id: "mono",
    name: "Mono",
    description: "Monospace with wide tracking. Developer-tool flavour.",
    style: {
      fontId: "jetbrains-mono",
      fontWeight: 500,
      fontSize: 34,
      letterSpacing: 1.5,
      lineHeight: 1.5,
      textTransform: "none",
      fill: { type: "solid", color: "#9BE8C4", gradient: { from: "#FFFFFF", to: "#7C5CFF", angle: 90 } },
      stroke: { enabled: false, color: "#000000", width: 2, opacity: 1 },
      shadow: { enabled: false, color: "#000000", x: 0, y: 8, blur: 24, opacity: 0.45 },
    },
  },
  {
    id: "elegant",
    name: "Elegant",
    description: "Letter-spaced small caps. Luxury and fashion.",
    style: {
      fontId: "montserrat",
      fontWeight: 400,
      fontSize: 40,
      letterSpacing: 10,
      lineHeight: 1.6,
      textTransform: "uppercase",
      fill: { type: "solid", color: "#F5EFE6", gradient: { from: "#FFFFFF", to: "#7C5CFF", angle: 90 } },
      stroke: { enabled: false, color: "#000000", width: 2, opacity: 1 },
      shadow: { enabled: false, color: "#000000", x: 0, y: 8, blur: 24, opacity: 0.45 },
    },
  },
  {
    id: "tech",
    name: "Tech",
    description: "Geometric display with a tight, technical feel.",
    style: {
      fontId: "space-grotesk",
      fontWeight: 700,
      fontSize: 62,
      letterSpacing: -1,
      lineHeight: 1.1,
      textTransform: "none",
      fill: { type: "solid", color: "#E9E9FF", gradient: { from: "#FFFFFF", to: "#7C5CFF", angle: 90 } },
      stroke: { enabled: false, color: "#000000", width: 2, opacity: 1 },
      shadow: { enabled: false, color: "#000000", x: 0, y: 8, blur: 24, opacity: 0.45 },
    },
  },
  {
    id: "gradient-hero",
    name: "Gradient Hero",
    description: "Heavy sans with a brand gradient fill.",
    style: {
      fontId: "plus-jakarta-sans",
      fontWeight: 800,
      fontSize: 84,
      letterSpacing: -2,
      lineHeight: 1.05,
      textTransform: "none",
      fill: {
        type: "gradient",
        color: "#FFFFFF",
        gradient: { from: "#FFFFFF", to: "#7C5CFF", angle: 120 },
      },
      stroke: { enabled: false, color: "#000000", width: 2, opacity: 1 },
      shadow: { enabled: false, color: "#000000", x: 0, y: 8, blur: 24, opacity: 0.45 },
    },
  },
];

export function getTextStylePreset(id: string): TextStylePreset | undefined {
  return TEXT_STYLE_PRESETS.find((preset) => preset.id === id);
}
