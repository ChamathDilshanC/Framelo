import type { BackgroundConfig, GradientBackground } from "@/types/background";
import { validatePatternCss } from "@/engine/background/css-safety";

/**
 * Turning a background into style.
 *
 * One function produces the CSS for every background type, so the editor
 * preview, the public viewer, the dashboard thumbnail placeholder and the
 * "copy CSS" button are all looking at the same result — there is no second
 * implementation to drift.
 */

export interface BackgroundStyle {
  /** Assigned to `style` on the background layer. */
  style: React.CSSProperties;
  /** True when the layer should be skipped entirely. */
  transparent: boolean;
}

export function gradientCss(background: GradientBackground): string {
  const { mode, from, to, angle, position } = background;
  const stop = clamp(position, 0, 100);

  switch (mode) {
    case "radial":
      return `radial-gradient(circle at 50% ${stop}%, ${from}, ${to})`;
    case "conic":
      return `conic-gradient(from ${angle}deg at 50% ${stop}%, ${from}, ${to}, ${from})`;
    case "linear":
    default:
      return `linear-gradient(${angle}deg, ${from} ${Math.max(0, stop - 50)}%, ${to})`;
  }
}

export function resolveBackgroundStyle(
  background: BackgroundConfig,
  assetUrl?: string | null,
): BackgroundStyle {
  switch (background.type) {
    case "transparent":
      return { style: {}, transparent: true };

    case "solid":
      return { style: { backgroundColor: background.value }, transparent: false };

    case "gradient":
      return {
        style: { backgroundImage: gradientCss(background), opacity: clamp(background.opacity, 0, 1) },
        transparent: false,
      };

    case "pattern": {
      // Re-validated on the way out, not just on the way in: a project file can
      // be edited by hand, and a row written by an older client must still be
      // safe to render by this one.
      const { css } = validatePatternCss(background.css);
      return {
        style: { ...css, opacity: clamp(background.opacity, 0, 1) },
        transparent: false,
      };
    }

    case "image":
      if (!assetUrl) return { style: { backgroundColor: "#0f1014" }, transparent: false };
      return {
        style: {
          backgroundImage: `url(${JSON.stringify(assetUrl)})`,
          backgroundSize: background.fit === "fill" ? "100% 100%" : background.fit,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: clamp(background.opacity, 0, 1),
        },
        transparent: false,
      };
  }
}

/**
 * The background as a copyable CSS block.
 *
 * Offered because the pattern browser is genuinely useful outside Framelo —
 * people take a pattern they liked into their own project.
 */
export function backgroundToCss(background: BackgroundConfig): string {
  const { style } = resolveBackgroundStyle(background, null);
  const lines = Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `  ${kebab(key)}: ${value};`);

  return lines.length ? `.background {\n${lines.join("\n")}\n}` : ".background {}";
}

/** The same background as a Tailwind arbitrary-value class list. */
export function backgroundToTailwind(background: BackgroundConfig): string {
  const { style } = resolveBackgroundStyle(background, null);
  const classes: string[] = [];

  if (style.backgroundColor) classes.push(`bg-[${compact(String(style.backgroundColor))}]`);
  if (style.backgroundImage) classes.push(`bg-[image:${compact(String(style.backgroundImage))}]`);
  if (style.backgroundSize) classes.push(`bg-[length:${compact(String(style.backgroundSize))}]`);
  if (style.backgroundPosition) classes.push(`bg-[position:${compact(String(style.backgroundPosition))}]`);

  return classes.join(" ") || "bg-transparent";
}

/** Tailwind arbitrary values cannot contain spaces. */
function compact(value: string): string {
  return value.replace(/\s+/g, "_");
}

function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return max;
  return Math.min(max, Math.max(min, value));
}
