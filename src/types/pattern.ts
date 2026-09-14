/**
 * Background patterns.
 *
 * A pattern is **data**, never code. The library ships definitions whose CSS
 * carries `$base` / `$accent` tokens; resolving one substitutes the user's
 * colours and produces a `SafePatternCss` object, which is the only thing the
 * renderer and the project file ever see.
 *
 * That indirection is what makes user-authored patterns safe: there is no
 * component per pattern to grow a code path, and nothing accepts a string that
 * is later executed.
 */

export const PATTERN_CATEGORIES = [
  "all",
  "gradients",
  "geometric",
  "dots",
  "grid",
  "lines",
  "decorative",
  "noise",
  "minimal",
  "custom",
] as const;

export type PatternCategory = (typeof PATTERN_CATEGORIES)[number];

/**
 * The complete set of CSS properties Framelo will render for a background.
 *
 * Deliberately tiny. Every value is validated before it is stored and again
 * before it is applied, so a row written by an older client cannot introduce a
 * property this version never vetted.
 */
export interface SafePatternCss {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
}

/** Colours a pattern is tinted with. Every definition supports retinting. */
export interface PatternColors {
  base: string;
  accent: string;
}

export interface PatternDefinition {
  id: string;
  name: string;
  category: Exclude<PatternCategory, "all">;
  /** The colours the pattern was designed with. */
  defaultColors: PatternColors;
  /**
   * CSS template. `$base` and `$accent` are replaced with the resolved colours;
   * `$accentA` .. `$accentE` give fading alpha steps of the accent for patterns
   * that need a ramp.
   */
  template: SafePatternCss;
  /** Shown under the name in the picker. */
  description?: string;
}

/** A pattern saved by a user — the library shape minus the template tokens. */
export interface SavedPattern {
  id: string;
  name: string;
  category: PatternCategory;
  css: SafePatternCss;
  opacity: number;
  createdAt: string;
  /** True while the pattern only exists in this browser. */
  local?: boolean;
}
