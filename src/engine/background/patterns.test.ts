import { describe, expect, it } from "vitest";

import { validatePatternCss } from "@/engine/background/css-safety";
import {
  activeCategories,
  filterPatterns,
  getPattern,
  PATTERNS,
  resolvePattern,
} from "@/engine/background/patterns";
import {
  backgroundToCss,
  backgroundToTailwind,
  gradientCss,
  resolveBackgroundStyle,
} from "@/engine/background/resolve";
import { createShareToken, slugify, uniqueSlug } from "@/lib/slug";
import { DEFAULT_GRADIENT, type BackgroundConfig } from "@/types/background";

describe("pattern library", () => {
  it("has unique ids", () => {
    const ids = PATTERNS.map((pattern) => pattern.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("resolves every shipped pattern to CSS the validator accepts", () => {
    // The library is the one source of patterns users can apply in one click,
    // so a pattern that cannot pass validation would be a dead card.
    for (const pattern of PATTERNS) {
      const css = resolvePattern(pattern);
      const result = validatePatternCss(css);
      expect({ id: pattern.id, ok: result.ok, errors: result.errors }).toMatchObject({
        id: pattern.id,
        ok: true,
      });
    }
  });

  it("substitutes both colour tokens", () => {
    const pattern = getPattern("dot-grid");
    expect(pattern).toBeDefined();

    const css = resolvePattern(pattern!, { base: "#123456", accent: "#abcdef" });
    expect(css.backgroundColor).toBe("#123456");
    expect(css.backgroundImage).toContain("#abcdef");
    expect(css.backgroundImage).not.toContain("$accent");
  });

  it("does not let $accent swallow the $accentA..E alpha steps", () => {
    // Longest-token-first matters: a naive replace would turn "$accentB" into
    // the accent colour followed by a stray "B".
    const pattern = getPattern("dot-grid");
    const css = resolvePattern(pattern!, { base: "#000000", accent: "#ff0000" });

    expect(css.backgroundImage).toContain("color-mix");
    expect(css.backgroundImage).not.toMatch(/#ff0000[A-E]/);
  });

  it("leaves no unsubstituted token in any pattern", () => {
    for (const pattern of PATTERNS) {
      const css = resolvePattern(pattern);
      const joined = Object.values(css).filter(Boolean).join(" ");
      expect({ id: pattern.id, hasToken: joined.includes("$") }).toEqual({
        id: pattern.id,
        hasToken: false,
      });
    }
  });

  it("filters by category and by search text", () => {
    expect(filterPatterns("dots", "").every((pattern) => pattern.category === "dots")).toBe(true);
    expect(filterPatterns("all", "grid").length).toBeGreaterThan(0);
    expect(filterPatterns("all", "definitely-not-a-pattern")).toHaveLength(0);
  });

  it("only lists categories that have patterns in them", () => {
    const categories = activeCategories();
    expect(categories[0]).toBe("all");

    for (const category of categories.slice(1)) {
      expect(PATTERNS.some((pattern) => pattern.category === category)).toBe(true);
    }
  });
});

describe("background resolution", () => {
  it("marks transparent backgrounds as skippable", () => {
    expect(resolveBackgroundStyle({ type: "transparent" }, null).transparent).toBe(true);
  });

  it("builds each gradient mode", () => {
    expect(gradientCss(DEFAULT_GRADIENT)).toContain("linear-gradient");
    expect(gradientCss({ ...DEFAULT_GRADIENT, mode: "radial" })).toContain("radial-gradient");
    expect(gradientCss({ ...DEFAULT_GRADIENT, mode: "conic" })).toContain("conic-gradient");
  });

  it("re-validates stored pattern CSS on the way out", () => {
    // A project file can be hand-edited, so the renderer must not trust what it
    // was handed just because it was stored.
    const hostile: BackgroundConfig = {
      type: "pattern",
      patternId: null,
      name: "Hostile",
      css: { backgroundColor: "#000000", backgroundImage: "url(javascript:alert(1))" },
      opacity: 1,
    };

    const { style } = resolveBackgroundStyle(hostile, null);
    expect(style.backgroundColor).toBe("#000000");
    expect(style.backgroundImage).toBeUndefined();
  });

  it("quotes an image background's URL so it cannot break out of the value", () => {
    const { style } = resolveBackgroundStyle(
      { type: "image", assetId: "a", fit: "cover", opacity: 1 },
      'blob:x") ; background: url("evil',
    );
    expect(String(style.backgroundImage)).toMatch(/^url\(".*"\)$/);
  });

  it("exports copyable CSS and Tailwind", () => {
    const background: BackgroundConfig = { type: "solid", value: "#faf8f3" };
    expect(backgroundToCss(background)).toContain("background-color: #faf8f3;");
    expect(backgroundToTailwind(background)).toBe("bg-[#faf8f3]");
  });

  it("removes spaces from Tailwind arbitrary values", () => {
    // Tailwind cannot parse a class containing a space.
    const tailwind = backgroundToTailwind(DEFAULT_GRADIENT);
    expect(tailwind.split(" ").every((entry) => !entry.includes(" "))).toBe(true);
    expect(tailwind).toContain("_");
  });
});

describe("slugs and tokens", () => {
  it.each([
    ["iPhone App Showcase", "iphone-app-showcase"],
    ["  Café — Ünïcode  ", "cafe-unicode"],
    ["!!!", "project"],
    ["", "project"],
  ])("slugifies %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("never produces a trailing dash when truncating", () => {
    expect(uniqueSlug("a ".repeat(80))).not.toMatch(/--/);
  });

  it("gives each project a distinct slug", () => {
    const slugs = new Set(Array.from({ length: 50 }, () => uniqueSlug("Same name")));
    expect(slugs.size).toBeGreaterThan(45);
  });

  it("mints share tokens long enough to be unguessable", () => {
    const token = createShareToken();
    // The migration's CHECK constraint requires at least 16 characters.
    expect(token.length).toBeGreaterThanOrEqual(16);
    expect(token).toMatch(/^[a-z0-9]+$/);

    const tokens = new Set(Array.from({ length: 200 }, () => createShareToken()));
    expect(tokens.size).toBe(200);
  });
});
