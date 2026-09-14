import type {
  PatternCategory,
  PatternColors,
  PatternDefinition,
  SafePatternCss,
} from "@/types/pattern";

/**
 * The pattern library.
 *
 * Every entry is pure data: a name, a category and a CSS template whose colours
 * are written as `$base` / `$accent` tokens. Resolving a pattern substitutes the
 * user's colours and hands the result to the same renderer every other
 * background type uses, so adding a pattern never adds a component or a branch.
 *
 * `$accentA` … `$accentE` are alpha steps of the accent colour, for patterns
 * that need a ramp rather than one flat tint.
 */

const ALPHA_STEPS: Record<string, number> = {
  $accentA: 0.06,
  $accentB: 0.12,
  $accentC: 0.2,
  $accentD: 0.35,
  $accentE: 0.55,
};

export const PATTERNS: PatternDefinition[] = [
  // --- Minimal -------------------------------------------------------------
  {
    id: "paper",
    name: "Paper",
    category: "minimal",
    description: "Warm off-white, nothing else.",
    defaultColors: { base: "#faf8f3", accent: "#001d3d" },
    template: { backgroundColor: "$base" },
  },
  {
    id: "soft-vignette",
    name: "Soft Vignette",
    category: "minimal",
    description: "A single wash that keeps the edges quiet.",
    defaultColors: { base: "#0f1014", accent: "#7c6cff" },
    template: {
      backgroundColor: "$base",
      backgroundImage: "radial-gradient(circle at 50% 30%, $accentC, transparent 70%)",
    },
  },
  {
    id: "top-glow",
    name: "Top Glow",
    category: "minimal",
    description: "Light falling from above the frame.",
    defaultColors: { base: "#08080a", accent: "#c9d4ff" },
    template: {
      backgroundColor: "$base",
      backgroundImage: "radial-gradient(120% 80% at 50% -20%, $accentC, transparent 60%)",
    },
  },

  // --- Dots ----------------------------------------------------------------
  {
    id: "dot-grid",
    name: "Dot Grid",
    category: "dots",
    description: "The classic notebook dot grid.",
    defaultColors: { base: "#faf8f3", accent: "#001d3d" },
    template: {
      backgroundColor: "$base",
      backgroundImage: "radial-gradient(circle at 1px 1px, $accentB 1px, transparent 0)",
      backgroundSize: "16px 16px",
    },
  },
  {
    id: "wide-dots",
    name: "Wide Dots",
    category: "dots",
    description: "Sparser dots for large canvases.",
    defaultColors: { base: "#0f1014", accent: "#ffffff" },
    template: {
      backgroundColor: "$base",
      backgroundImage: "radial-gradient(circle at 1.5px 1.5px, $accentB 1.5px, transparent 0)",
      backgroundSize: "32px 32px",
    },
  },
  {
    id: "offset-dots",
    name: "Offset Dots",
    category: "dots",
    description: "Two layers, half a step apart.",
    defaultColors: { base: "#111318", accent: "#7c6cff" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "radial-gradient(circle at 1px 1px, $accentC 1px, transparent 0), radial-gradient(circle at 1px 1px, $accentA 1px, transparent 0)",
      backgroundSize: "24px 24px, 24px 24px",
      backgroundPosition: "0 0, 12px 12px",
    },
  },
  {
    id: "dot-fade",
    name: "Dot Fade",
    category: "dots",
    description: "Dots dissolving into a glow.",
    defaultColors: { base: "#07070a", accent: "#7c6cff" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "radial-gradient(circle at 50% 0%, $accentC, transparent 65%), radial-gradient(circle at 1px 1px, $accentB 1px, transparent 0)",
      backgroundSize: "100% 100%, 18px 18px",
    },
  },

  // --- Grid ----------------------------------------------------------------
  {
    id: "line-grid",
    name: "Line Grid",
    category: "grid",
    description: "Even graph-paper ruling.",
    defaultColors: { base: "#faf8f3", accent: "#001d3d" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "linear-gradient($accentB 1px, transparent 1px), linear-gradient(90deg, $accentB 1px, transparent 1px)",
      backgroundSize: "24px 24px, 24px 24px",
    },
  },
  {
    id: "blueprint",
    name: "Blueprint",
    category: "grid",
    description: "Minor ruling inside a heavier major grid.",
    defaultColors: { base: "#0b1220", accent: "#5b8cff" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "linear-gradient($accentA 1px, transparent 1px), linear-gradient(90deg, $accentA 1px, transparent 1px), linear-gradient($accentC 1px, transparent 1px), linear-gradient(90deg, $accentC 1px, transparent 1px)",
      backgroundSize: "20px 20px, 20px 20px, 100px 100px, 100px 100px",
    },
  },
  {
    id: "grid-glow",
    name: "Grid Glow",
    category: "grid",
    description: "A grid lit from one corner.",
    defaultColors: { base: "#08080c", accent: "#7c6cff" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "radial-gradient(120% 100% at 20% 0%, $accentC, transparent 60%), linear-gradient($accentA 1px, transparent 1px), linear-gradient(90deg, $accentA 1px, transparent 1px)",
      backgroundSize: "100% 100%, 28px 28px, 28px 28px",
    },
  },
  {
    id: "isometric",
    name: "Isometric",
    category: "grid",
    description: "Three axes at thirty degrees.",
    defaultColors: { base: "#101014", accent: "#ffffff" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "repeating-linear-gradient(30deg, $accentA 0 1px, transparent 1px 40px), repeating-linear-gradient(-30deg, $accentA 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, $accentA 0 1px, transparent 1px 40px)",
    },
  },

  // --- Lines ---------------------------------------------------------------
  {
    id: "diagonal-stripes",
    name: "Diagonal Stripes",
    category: "lines",
    description: "Even forty-five degree ruling.",
    defaultColors: { base: "#faf8f3", accent: "#001d3d" },
    template: {
      backgroundColor: "$base",
      backgroundImage: "repeating-linear-gradient(45deg, $accentA 0 10px, transparent 10px 20px)",
    },
  },
  {
    id: "hairlines",
    name: "Hairlines",
    category: "lines",
    description: "Fine horizontal ruling, like a ledger.",
    defaultColors: { base: "#0f1014", accent: "#ffffff" },
    template: {
      backgroundColor: "$base",
      backgroundImage: "repeating-linear-gradient(0deg, $accentA 0 1px, transparent 1px 8px)",
    },
  },
  {
    id: "scanlines",
    name: "Scanlines",
    category: "lines",
    description: "CRT ruling at two pixel pitch.",
    defaultColors: { base: "#07070a", accent: "#7c6cff" },
    template: {
      backgroundColor: "$base",
      backgroundImage: "repeating-linear-gradient(0deg, $accentB 0 1px, transparent 1px 3px)",
    },
  },
  {
    id: "crosshatch",
    name: "Crosshatch",
    category: "lines",
    description: "Two rulings crossing at right angles.",
    defaultColors: { base: "#f6f4ef", accent: "#20242c" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "repeating-linear-gradient(45deg, $accentA 0 1px, transparent 1px 12px), repeating-linear-gradient(-45deg, $accentA 0 1px, transparent 1px 12px)",
    },
  },

  // --- Geometric -----------------------------------------------------------
  {
    id: "checkerboard",
    name: "Checkerboard",
    category: "geometric",
    description: "Alternating squares.",
    defaultColors: { base: "#14151a", accent: "#ffffff" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "linear-gradient(45deg, $accentA 25%, transparent 25% 75%, $accentA 75%), linear-gradient(45deg, $accentA 25%, transparent 25% 75%, $accentA 75%)",
      backgroundSize: "32px 32px, 32px 32px",
      backgroundPosition: "0 0, 16px 16px",
    },
  },
  {
    id: "diamonds",
    name: "Diamonds",
    category: "geometric",
    description: "A lattice of rotated squares.",
    defaultColors: { base: "#0d1117", accent: "#5b8cff" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "repeating-conic-gradient(from 45deg, $accentA 0% 25%, transparent 0% 50%)",
      backgroundSize: "36px 36px",
    },
  },
  {
    id: "zigzag",
    name: "Zigzag",
    category: "geometric",
    description: "Chevrons built from two gradients.",
    defaultColors: { base: "#faf8f3", accent: "#001d3d" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "linear-gradient(135deg, $accentB 25%, transparent 25%), linear-gradient(225deg, $accentB 25%, transparent 25%)",
      backgroundSize: "24px 24px, 24px 24px",
      backgroundPosition: "0 0, 12px 0",
    },
  },
  {
    id: "circuit",
    name: "Circuit",
    category: "geometric",
    description: "Traces and pads on a board.",
    defaultColors: { base: "#05110d", accent: "#3ddc97" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "linear-gradient($accentA 1px, transparent 1px), linear-gradient(90deg, $accentA 1px, transparent 1px), radial-gradient(circle at 20px 20px, $accentC 2px, transparent 0)",
      backgroundSize: "40px 40px, 40px 40px, 40px 40px",
    },
  },

  // --- Gradients -----------------------------------------------------------
  {
    id: "dawn",
    name: "Dawn",
    category: "gradients",
    description: "Cool to warm, low on the frame.",
    defaultColors: { base: "#1b1033", accent: "#ff9a76" },
    template: {
      backgroundColor: "$base",
      backgroundImage: "linear-gradient(160deg, $base 30%, $accent 140%)",
    },
  },
  {
    id: "aurora",
    name: "Aurora",
    category: "gradients",
    description: "Three lights bleeding into each other.",
    defaultColors: { base: "#07070c", accent: "#7c6cff" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "radial-gradient(60% 60% at 20% 10%, $accentD, transparent 60%), radial-gradient(50% 50% at 80% 20%, $accentC, transparent 60%), radial-gradient(70% 60% at 50% 100%, $accentB, transparent 60%)",
    },
  },
  {
    id: "spotlight",
    name: "Spotlight",
    category: "gradients",
    description: "One soft pool of light, centred.",
    defaultColors: { base: "#0a0a0c", accent: "#ffffff" },
    template: {
      backgroundColor: "$base",
      backgroundImage: "radial-gradient(70% 60% at 50% 40%, $accentC, transparent 70%)",
    },
  },
  {
    id: "sunset-conic",
    name: "Sunset Conic",
    category: "gradients",
    description: "A conic sweep through the accent.",
    defaultColors: { base: "#140d22", accent: "#ff7ac6" },
    template: {
      backgroundColor: "$base",
      backgroundImage: "conic-gradient(from 210deg at 50% 50%, $base, $accent, $base)",
    },
  },
  {
    id: "mesh",
    name: "Mesh",
    category: "gradients",
    description: "Four corners, softly blended.",
    defaultColors: { base: "#faf8f3", accent: "#7c6cff" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "radial-gradient(40% 40% at 0% 0%, $accentD, transparent 70%), radial-gradient(40% 40% at 100% 0%, $accentC, transparent 70%), radial-gradient(40% 40% at 100% 100%, $accentD, transparent 70%), radial-gradient(40% 40% at 0% 100%, $accentB, transparent 70%)",
    },
  },

  // --- Decorative ----------------------------------------------------------
  {
    id: "confetti",
    name: "Confetti",
    category: "decorative",
    description: "Scattered marks at three sizes.",
    defaultColors: { base: "#0f1014", accent: "#ffd166" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "radial-gradient(circle at 15% 20%, $accentD 2px, transparent 0), radial-gradient(circle at 70% 60%, $accentC 3px, transparent 0), radial-gradient(circle at 40% 85%, $accentB 2px, transparent 0)",
      backgroundSize: "90px 90px, 130px 130px, 70px 70px",
    },
  },
  {
    id: "waves",
    name: "Waves",
    category: "decorative",
    description: "Soft horizontal banding.",
    defaultColors: { base: "#071a26", accent: "#5bc8ff" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "repeating-radial-gradient(circle at 50% 120%, $accentA 0 2px, transparent 2px 28px)",
    },
  },
  {
    id: "halftone",
    name: "Halftone",
    category: "decorative",
    description: "Print-style dot screen at an angle.",
    defaultColors: { base: "#f4f1ea", accent: "#111318" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "radial-gradient(circle at 2px 2px, $accentC 2px, transparent 0), radial-gradient(circle at 2px 2px, $accentB 2px, transparent 0)",
      backgroundSize: "14px 14px, 14px 14px",
      backgroundPosition: "0 0, 7px 7px",
    },
  },

  // --- Noise ---------------------------------------------------------------
  {
    id: "fine-noise",
    name: "Fine Noise",
    category: "noise",
    description: "Tight speckle that breaks up flat colour.",
    defaultColors: { base: "#0f1014", accent: "#ffffff" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "repeating-conic-gradient($accentA 0% 25%, transparent 0% 50%), repeating-conic-gradient($accentA 0% 25%, transparent 0% 50%)",
      backgroundSize: "3px 3px, 7px 7px",
      backgroundPosition: "0 0, 1px 2px",
    },
  },
  {
    id: "grain-wash",
    name: "Grain Wash",
    category: "noise",
    description: "Grain over a corner light.",
    defaultColors: { base: "#0b0b10", accent: "#c9d4ff" },
    template: {
      backgroundColor: "$base",
      backgroundImage:
        "radial-gradient(100% 80% at 80% 0%, $accentC, transparent 60%), repeating-conic-gradient($accentA 0% 25%, transparent 0% 50%)",
      backgroundSize: "100% 100%, 4px 4px",
    },
  },
];

export const PATTERN_BY_ID = new Map(PATTERNS.map((pattern) => [pattern.id, pattern]));

export function getPattern(id: string): PatternDefinition | undefined {
  return PATTERN_BY_ID.get(id);
}

/**
 * Substitute a pattern's colour tokens.
 *
 * The alpha steps are produced with `color-mix`, which keeps the user's colour
 * in whatever notation they gave it instead of forcing a hex round-trip that
 * would flatten `oklch` or a CSS variable.
 */
export function resolvePattern(
  pattern: PatternDefinition,
  colors: PatternColors = pattern.defaultColors,
): SafePatternCss {
  const replacements: Record<string, string> = {
    $base: colors.base,
    $accent: colors.accent,
  };

  for (const [token, alpha] of Object.entries(ALPHA_STEPS)) {
    replacements[token] = `color-mix(in srgb, ${colors.accent} ${Math.round(alpha * 100)}%, transparent)`;
  }

  const substitute = (value: string | undefined): string | undefined => {
    if (!value) return undefined;
    // Longest token first, so `$accentA` is never eaten by `$accent`.
    return value.replace(/\$accent[A-E]|\$accent|\$base/g, (token) => replacements[token] ?? token);
  };

  return {
    backgroundColor: substitute(pattern.template.backgroundColor),
    backgroundImage: substitute(pattern.template.backgroundImage),
    backgroundSize: pattern.template.backgroundSize,
    backgroundPosition: pattern.template.backgroundPosition,
    backgroundRepeat: pattern.template.backgroundRepeat,
  };
}

export function filterPatterns(category: PatternCategory, query: string): PatternDefinition[] {
  const needle = query.trim().toLowerCase();

  return PATTERNS.filter((pattern) => {
    if (category !== "all" && pattern.category !== category) return false;
    if (!needle) return true;
    return (
      pattern.name.toLowerCase().includes(needle) ||
      pattern.category.includes(needle) ||
      (pattern.description?.toLowerCase().includes(needle) ?? false)
    );
  });
}

/** Categories that actually contain something, in library order. */
export function activeCategories(): PatternCategory[] {
  const present = new Set(PATTERNS.map((pattern) => pattern.category));
  return (["all", "gradients", "geometric", "dots", "grid", "lines", "decorative", "noise", "minimal"] as const).filter(
    (category) => category === "all" || present.has(category),
  );
}
