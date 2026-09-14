import type { SafePatternCss } from "@/types/pattern";

/**
 * Validation for user-authored background CSS.
 *
 * Users paste snippets they found elsewhere, so this has to accept real-world
 * CSS — nested gradients, `color-mix`, percentages, `calc` — while never
 * letting a value reach the DOM that could fetch, execute or embed anything.
 *
 * The approach is an allowlist, not a blocklist. A blocklist of "dangerous
 * strings" loses to the next encoding trick; an allowlist of *functions we
 * understand* plus a character whitelist has nothing left to smuggle through.
 * Nothing here is ever `eval`ed, injected as HTML, or turned into a style tag:
 * values are assigned to individual properties of a `CSSStyleDeclaration`,
 * which cannot escape into markup.
 */

/** CSS functions a background value may legitimately call. */
const ALLOWED_FUNCTIONS = new Set([
  "linear-gradient",
  "repeating-linear-gradient",
  "radial-gradient",
  "repeating-radial-gradient",
  "conic-gradient",
  "repeating-conic-gradient",
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "hwb",
  "lab",
  "lch",
  "oklab",
  "oklch",
  "color",
  "color-mix",
  "calc",
  "min",
  "max",
  "clamp",
  "var",
]);

/**
 * Characters a value may contain.
 *
 * Notably absent: `;` `{` `}` `<` `>` `"` `'` `\` and backtick — the characters
 * a value would need to break out of a property and become markup or a second
 * declaration.
 */
const ALLOWED_CHARS = /^[A-Za-z0-9\s#%.,()/+\-*_:[\]=?&!]*$/;

/** Patterns that are never legitimate in a background value. */
const FORBIDDEN = [
  /url\s*\(/i,
  /image-set\s*\(/i,
  /element\s*\(/i,
  /expression\s*\(/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /data\s*:/i,
  /@import/i,
  /<\s*\/?\s*[a-z]/i,
  /\\[0-9a-f]/i, // CSS escape sequences, the usual way past a naive filter
  /&#/,
  /on[a-z]+\s*=/i,
  /!\s*important/i,
];

const MAX_VALUE_LENGTH = 4000;
/** Deeply nested parentheses are a parser-stress signature, not a real pattern. */
const MAX_NESTING_DEPTH = 12;

export interface CssValidationResult {
  ok: boolean;
  /** The trimmed, accepted value. Empty when the input was blank. */
  value: string;
  error?: string;
}

/**
 * Validate one CSS value.
 *
 * Returns a result rather than throwing: the editor shows the reason inline
 * while the user is still typing, and a rejected value simply is not applied.
 */
export function validateCssValue(input: string | undefined | null): CssValidationResult {
  const value = (input ?? "").trim();
  if (!value) return { ok: true, value: "" };

  if (value.length > MAX_VALUE_LENGTH) {
    return { ok: false, value: "", error: `Value is longer than ${MAX_VALUE_LENGTH} characters.` };
  }

  for (const rule of FORBIDDEN) {
    if (rule.test(value)) {
      return { ok: false, value: "", error: "That value contains something Framelo will not render." };
    }
  }

  if (!ALLOWED_CHARS.test(value)) {
    return { ok: false, value: "", error: "That value contains characters Framelo will not render." };
  }

  const balance = checkParentheses(value);
  if (!balance.ok) return { ok: false, value: "", error: balance.error };

  const unknown = findUnknownFunction(value);
  if (unknown) {
    return { ok: false, value: "", error: `Framelo does not support the "${unknown}()" function.` };
  }

  return { ok: true, value };
}

function checkParentheses(value: string): { ok: true } | { ok: false; error: string } {
  let depth = 0;
  for (const char of value) {
    if (char === "(") {
      depth += 1;
      if (depth > MAX_NESTING_DEPTH) return { ok: false, error: "That value nests too deeply." };
    } else if (char === ")") {
      depth -= 1;
      if (depth < 0) return { ok: false, error: "Unbalanced brackets." };
    }
  }
  return depth === 0 ? { ok: true } : { ok: false, error: "Unbalanced brackets." };
}

/** Any identifier immediately followed by `(` must be on the allowlist. */
function findUnknownFunction(value: string): string | null {
  const matches = value.matchAll(/([a-zA-Z][\w-]*)\s*\(/g);
  for (const match of matches) {
    const name = match[1].toLowerCase();
    if (!ALLOWED_FUNCTIONS.has(name)) return match[1];
  }
  return null;
}

/**
 * Colours accepted anywhere a colour is stored.
 *
 * Hex is the canonical form the pickers produce; the functional notations are
 * accepted because pasted CSS uses them.
 */
const COLOR_PATTERN =
  /^(#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch)\([^();]*\)|transparent|currentcolor)$/i;

export function validateColor(input: string | undefined | null): CssValidationResult {
  const value = (input ?? "").trim();
  if (!value) return { ok: true, value: "" };

  const checked = validateCssValue(value);
  if (!checked.ok) return checked;

  if (!COLOR_PATTERN.test(value)) {
    return { ok: false, value: "", error: "Use a hex colour such as #faf8f3." };
  }
  return { ok: true, value };
}

/** `16px 16px`, `cover`, `40% auto` — lengths and keywords only. */
const SIZE_PATTERN =
  /^(auto|cover|contain|(-?\d*\.?\d+(px|%|em|rem|vw|vh|ch|pt)|0)(\s+(auto|-?\d*\.?\d+(px|%|em|rem|vw|vh|ch|pt)|0))*)(\s*,\s*(auto|cover|contain|(-?\d*\.?\d+(px|%|em|rem|vw|vh|ch|pt)|0)(\s+(auto|-?\d*\.?\d+(px|%|em|rem|vw|vh|ch|pt)|0))*))*$/i;

export function validateBackgroundSize(input: string | undefined | null): CssValidationResult {
  const value = (input ?? "").trim();
  if (!value) return { ok: true, value: "" };
  if (value.length > 200) return { ok: false, value: "", error: "Size is too long." };
  if (!SIZE_PATTERN.test(value)) {
    return { ok: false, value: "", error: "Use lengths such as “16px 16px”, or “cover”." };
  }
  return { ok: true, value };
}

const POSITION_PATTERN =
  /^((left|right|top|bottom|center|-?\d*\.?\d+(px|%|em|rem|vw|vh)|0)(\s+(left|right|top|bottom|center|-?\d*\.?\d+(px|%|em|rem|vw|vh)|0))*)(\s*,\s*((left|right|top|bottom|center|-?\d*\.?\d+(px|%|em|rem|vw|vh)|0)(\s+(left|right|top|bottom|center|-?\d*\.?\d+(px|%|em|rem|vw|vh)|0))*))*$/i;

export function validateBackgroundPosition(input: string | undefined | null): CssValidationResult {
  const value = (input ?? "").trim();
  if (!value) return { ok: true, value: "" };
  if (value.length > 200) return { ok: false, value: "", error: "Position is too long." };
  if (!POSITION_PATTERN.test(value)) {
    return { ok: false, value: "", error: "Use values such as “0 0” or “center”." };
  }
  return { ok: true, value };
}

const REPEAT_VALUES = new Set([
  "repeat",
  "no-repeat",
  "repeat-x",
  "repeat-y",
  "space",
  "round",
  "repeat repeat",
]);

export function validateBackgroundRepeat(input: string | undefined | null): CssValidationResult {
  const value = (input ?? "").trim().toLowerCase();
  if (!value) return { ok: true, value: "" };
  if (!REPEAT_VALUES.has(value)) {
    return { ok: false, value: "", error: "Use repeat, no-repeat, repeat-x or repeat-y." };
  }
  return { ok: true, value };
}

export interface PatternCssValidation {
  ok: boolean;
  css: SafePatternCss;
  /** Per-field messages, keyed by the property that failed. */
  errors: Partial<Record<keyof SafePatternCss, string>>;
}

/**
 * Validate a whole pattern.
 *
 * Fields that fail are dropped rather than poisoning the result, so a single
 * bad value degrades to "that one property is ignored" instead of a blank
 * background — while `ok` still reports that something was rejected.
 */
export function validatePatternCss(input: SafePatternCss): PatternCssValidation {
  const css: SafePatternCss = {};
  const errors: PatternCssValidation["errors"] = {};

  const checks: Array<[keyof SafePatternCss, CssValidationResult]> = [
    ["backgroundColor", validateColor(input.backgroundColor)],
    ["backgroundImage", validateCssValue(input.backgroundImage)],
    ["backgroundSize", validateBackgroundSize(input.backgroundSize)],
    ["backgroundPosition", validateBackgroundPosition(input.backgroundPosition)],
    ["backgroundRepeat", validateBackgroundRepeat(input.backgroundRepeat)],
  ];

  for (const [key, result] of checks) {
    if (!result.ok) {
      errors[key] = result.error;
      continue;
    }
    if (result.value) css[key] = result.value;
  }

  return { ok: Object.keys(errors).length === 0, css, errors };
}

/**
 * Strip a pasted snippet down to the values Framelo stores.
 *
 * Users paste whole JSX blocks, `style={{ … }}` objects or plain CSS rules.
 * Rather than refusing them, pull out the four properties that matter and
 * validate those — the rest of the snippet is discarded, never interpreted.
 */
/** Does a shorthand value carry an image, or is it only a colour? */
const IMAGE_VALUE =
  /(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(|\bimage-set\s*\(|\burl\s*\(/i;

export function extractPatternCss(snippet: string): SafePatternCss {
  const source = snippet.slice(0, 20000);
  const found: SafePatternCss = {};

  const read = (names: string[]): string | undefined => {
    for (const name of names) {
      // Matches `background-image: <value>;`, `backgroundImage: "<value>",`
      // and the backtick form, capturing up to the declaration's end.
      //
      // The unquoted branch deliberately allows commas: they separate a
      // gradient's colour stops and a background's layers, so stopping at the
      // first one truncated `linear-gradient(red, blue)` to
      // `linear-gradient(red`. A declaration ends at `;`, `}` or a line break.
      const pattern = new RegExp(
        `${name}\\s*:\\s*(?:\`([^\`]*)\`|"([^"]*)"|'([^']*)'|([^;}\\n]+))`,
        "i",
      );
      const match = source.match(pattern);
      if (!match) continue;
      // A JSX object entry ends in a comma that is punctuation, not value.
      const value = (match[1] ?? match[2] ?? match[3] ?? match[4] ?? "")
        .trim()
        .replace(/[,;]+$/, "")
        .trim();
      if (value) return value;
    }
    return undefined;
  };

  found.backgroundImage = read(["backgroundImage", "background-image"]);
  found.backgroundSize = read(["backgroundSize", "background-size"]);
  found.backgroundPosition = read(["backgroundPosition", "background-position"]);
  found.backgroundColor = read(["backgroundColor", "background-color"]);

  // The `background` shorthand, which is what most snippets in the wild use —
  // `background: "radial-gradient(…)"` in a JSX style object, or
  // `background: #101014` in plain CSS. Without this, the single most common
  // paste of all was reported as containing no background properties.
  //
  // It cannot be confused with the longhands read above: those continue with
  // `-` or a capital letter where this requires a colon.
  const shorthand = read(["background"]);
  if (shorthand) {
    if (IMAGE_VALUE.test(shorthand)) found.backgroundImage ??= shorthand;
    else found.backgroundColor ??= shorthand;
  }

  // Tailwind arbitrary-value backgrounds: `bg-[#faf8f3]`.
  if (!found.backgroundColor) {
    const arbitrary = source.match(/bg-\[(#[0-9a-f]{3,8})\]/i);
    if (arbitrary) found.backgroundColor = arbitrary[1];
  }

  return found;
}
