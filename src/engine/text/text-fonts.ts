/**
 * The font registry and loader.
 *
 * Two rules, unchanged since the text system shipped:
 *
 * 1. **Never offer a font that will not render.** The picker lists what this
 *    registry declares, the registry declares only what `font-loaders.ts` can
 *    load, and the weight list per family is the weights that family actually
 *    ships — so a user cannot pick 900 on a face that stops at 700 and get a
 *    faked bold (§12, §16).
 *
 * 2. **Never load a script's font until that script appears.** The CJK and
 *    Indic faces are large. Loading all of them so that Sinhala *might* work
 *    would cost every user who never types Sinhala (§55).
 *
 * What changed: the faces are now self-hosted through Fontsource instead of
 * fetched from the Google Fonts CDN, and most of them are real variable fonts.
 * The reasoning is in `font-loaders.ts`; the consequence here is that
 * `FontDefinition.family` is a name Fontsource declares ("Inter Variable")
 * rather than the marketing name ("Inter"). `id` is unchanged, and `id` is what
 * projects store — so no existing composition is affected.
 */

import { CDN_COVERAGE_FONTS, fontSource } from "./font-loaders";
import { detectTextScripts, type TextScript } from "./text-script";

export const FONT_GROUPS = ["sans", "display", "serif", "mono", "script"] as const;
export type FontGroup = (typeof FONT_GROUPS)[number];

export const FONT_GROUP_LABELS: Record<FontGroup, string> = {
  sans: "Sans",
  display: "Display",
  serif: "Serif",
  mono: "Mono",
  script: "Script",
};

export interface FontDefinition {
  /** Stable across the life of the app: this is what a project file stores. */
  id: string;
  /** Shown in the picker. The typeface's real name, not the CSS family. */
  name: string;
  /** The CSS family name, as the loaded stylesheet defines it. */
  family: string;
  /** Weights the family actually provides. */
  weights: number[];
  /** True when the family ships a real italic rather than a synthesised one. */
  italic: boolean;
  /** Scripts this family covers. */
  scripts: TextScript[];
  /** Grouping in the picker. */
  group: FontGroup;
  /** One download covers every weight. Worth saying on the card. */
  variable: boolean;
  /** A word on what it is for, so the picker is choosable rather than a list. */
  note: string;
}

const SANS_FALLBACK = "system-ui, -apple-system, Segoe UI, Roboto, sans-serif";

/**
 * The curated Latin library (§12).
 *
 * Every one of these is a typeface a product page would actually use; there is
 * no value in a long list of near-identical grotesques. The six that predate
 * the Fontsource migration are kept whatever their fashion — they appear in
 * saved projects and in the template catalogue, and dropping one would silently
 * restyle somebody's work.
 */
export const FONT_REGISTRY: FontDefinition[] = [
  // --- Sans ----------------------------------------------------------------
  {
    id: "inter",
    name: "Inter",
    family: "Inter Variable",
    weights: [300, 400, 500, 600, 700, 800, 900],
    italic: true,
    scripts: ["latin", "cyrillic", "greek"],
    group: "sans",
    variable: true,
    note: "The interface default. Neutral at any size.",
  },
  {
    id: "dm-sans",
    name: "DM Sans",
    family: "DM Sans Variable",
    weights: [300, 400, 500, 600, 700, 800, 900],
    italic: true,
    scripts: ["latin"],
    group: "sans",
    variable: true,
    note: "Low-contrast geometric. Friendly without being soft.",
  },
  {
    id: "manrope",
    name: "Manrope",
    family: "Manrope Variable",
    weights: [300, 400, 500, 600, 700, 800],
    italic: false,
    scripts: ["latin"],
    group: "sans",
    variable: true,
    note: "Semi-geometric. Reads well very large.",
  },
  {
    id: "plus-jakarta-sans",
    name: "Plus Jakarta Sans",
    family: "Plus Jakarta Sans Variable",
    weights: [300, 400, 500, 600, 700, 800],
    italic: true,
    scripts: ["latin"],
    group: "sans",
    variable: true,
    note: "Crisp and slightly narrow. Good in dense UI shots.",
  },
  {
    id: "urbanist",
    name: "Urbanist",
    family: "Urbanist Variable",
    weights: [300, 400, 500, 600, 700, 800, 900],
    italic: true,
    scripts: ["latin"],
    group: "sans",
    variable: true,
    note: "Low-contrast geometric with a wide range.",
  },
  {
    id: "poppins",
    name: "Poppins",
    family: "Poppins",
    weights: [300, 400, 500, 600, 700, 800, 900],
    italic: true,
    scripts: ["latin", "devanagari"],
    group: "sans",
    variable: false,
    note: "Monolinear geometric. Covers Devanagari too.",
  },
  {
    id: "montserrat",
    name: "Montserrat",
    family: "Montserrat Variable",
    weights: [300, 400, 500, 600, 700, 800, 900],
    italic: true,
    scripts: ["latin", "cyrillic"],
    group: "sans",
    variable: true,
    note: "Wide and urban. A workhorse for headlines.",
  },
  {
    id: "open-sans",
    name: "Open Sans",
    family: "Open Sans Variable",
    weights: [300, 400, 500, 600, 700, 800],
    italic: true,
    scripts: ["latin", "cyrillic", "greek", "hebrew"],
    group: "sans",
    variable: true,
    note: "Humanist and unfussy. The safest body text here.",
  },
  {
    id: "roboto",
    name: "Roboto",
    family: "Roboto Variable",
    weights: [300, 400, 500, 600, 700, 800, 900],
    italic: true,
    scripts: ["latin", "cyrillic", "greek"],
    group: "sans",
    variable: true,
    note: "Android's typeface. The right choice for Android mockups.",
  },

  // --- Display -------------------------------------------------------------
  {
    id: "space-grotesk",
    name: "Space Grotesk",
    family: "Space Grotesk Variable",
    weights: [300, 400, 500, 600, 700],
    italic: false,
    scripts: ["latin"],
    group: "display",
    variable: true,
    note: "Technical grotesque with odd, memorable details.",
  },
  {
    id: "outfit",
    name: "Outfit",
    family: "Outfit Variable",
    weights: [300, 400, 500, 600, 700, 800, 900],
    italic: false,
    scripts: ["latin"],
    group: "display",
    variable: true,
    note: "Clean geometric display. Very even colour.",
  },
  {
    id: "syne",
    name: "Syne",
    family: "Syne Variable",
    weights: [400, 500, 600, 700, 800],
    italic: false,
    scripts: ["latin"],
    group: "display",
    variable: true,
    note: "Extended and eccentric. For art-direction, not body text.",
  },
  {
    id: "archivo",
    name: "Archivo",
    family: "Archivo Variable",
    weights: [300, 400, 500, 600, 700, 800, 900],
    italic: true,
    scripts: ["latin"],
    group: "display",
    variable: true,
    note: "Grotesque built for headlines and small print alike.",
  },
  {
    id: "sora",
    name: "Sora",
    family: "Sora Variable",
    weights: [300, 400, 500, 600, 700, 800],
    italic: false,
    scripts: ["latin"],
    group: "display",
    variable: true,
    note: "Squarish and modern. Reads as software.",
  },
  {
    id: "bebas-neue",
    name: "Bebas Neue",
    family: "Bebas Neue",
    // A single-weight display face. Offering 700 here would be a lie.
    weights: [400],
    italic: false,
    scripts: ["latin"],
    group: "display",
    variable: false,
    note: "All caps, one weight. Loud on purpose.",
  },

  // --- Serif ---------------------------------------------------------------
  {
    id: "source-serif-4",
    name: "Source Serif 4",
    family: "Source Serif 4 Variable",
    weights: [300, 400, 500, 600, 700, 800, 900],
    italic: true,
    scripts: ["latin"],
    group: "serif",
    variable: true,
    note: "A serif that holds up at small sizes. Editorial body.",
  },
  {
    id: "playfair-display",
    name: "Playfair Display",
    family: "Playfair Display Variable",
    weights: [400, 500, 600, 700, 800, 900],
    italic: true,
    scripts: ["latin", "cyrillic"],
    group: "serif",
    variable: true,
    note: "High contrast. Luxury headlines, never body copy.",
  },
  {
    id: "dm-serif-display",
    name: "DM Serif Display",
    family: "DM Serif Display",
    weights: [400],
    italic: true,
    scripts: ["latin"],
    group: "serif",
    variable: false,
    note: "One weight, built for large sizes only.",
  },
  {
    id: "merriweather",
    name: "Merriweather",
    family: "Merriweather Variable",
    weights: [300, 400, 500, 600, 700, 800, 900],
    italic: true,
    scripts: ["latin", "cyrillic"],
    group: "serif",
    variable: true,
    note: "Sturdy and readable. Screen-first serif.",
  },

  // --- Mono ----------------------------------------------------------------
  {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    family: "JetBrains Mono Variable",
    weights: [300, 400, 500, 600, 700, 800],
    italic: true,
    scripts: ["latin", "cyrillic", "greek"],
    group: "mono",
    variable: true,
    note: "Tall x-height monospace. For code in screenshots.",
  },
  {
    id: "ibm-plex-mono",
    name: "IBM Plex Mono",
    family: "IBM Plex Mono",
    weights: [300, 400, 500, 600, 700],
    italic: true,
    scripts: ["latin", "cyrillic"],
    group: "mono",
    variable: false,
    note: "Warmer monospace with real italics.",
  },
];

/**
 * Script coverage fonts (§13).
 *
 * Not in the picker: these are not a typographic choice, they are what makes
 * the chosen typeface's text legible when it contains a script that typeface
 * does not cover. Each is loaded only when its script is actually typed.
 */
const SCRIPT_FONTS: Partial<Record<TextScript, FontDefinition>> = {
  sinhala: coverage("noto-sinhala", "Noto Sans Sinhala", "sinhala"),
  tamil: coverage("noto-tamil", "Noto Sans Tamil", "tamil"),
  devanagari: coverage("noto-devanagari", "Noto Sans Devanagari", "devanagari"),
  bengali: coverage("noto-bengali", "Noto Sans Bengali", "bengali"),
  arabic: coverage("noto-arabic", "Noto Sans Arabic", "arabic"),
  hebrew: coverage("noto-hebrew", "Noto Sans Hebrew", "hebrew"),
  thai: coverage("noto-thai", "Noto Sans Thai", "thai"),
  hangul: coverage("noto-kr", "Noto Sans KR", "hangul"),
  kana: coverage("noto-jp", "Noto Sans JP", "kana"),
  han: coverage("noto-sc", "Noto Sans SC", "han"),
};

function coverage(id: string, family: string, script: TextScript): FontDefinition {
  return {
    id,
    name: family,
    family,
    weights: [400, 500, 700],
    italic: false,
    scripts: [script],
    group: "sans",
    variable: false,
    note: `Coverage for ${script}.`,
  };
}

const BY_ID = new Map(FONT_REGISTRY.map((font) => [font.id, font]));
const COVERAGE_BY_ID = new Map(
  Object.values(SCRIPT_FONTS).map((font) => [font!.id, font!] as const),
);

export function getFont(fontId: string): FontDefinition {
  return BY_ID.get(fontId) ?? COVERAGE_BY_ID.get(fontId) ?? FONT_REGISTRY[0];
}

/** Every pickable font in a group, in registry order. */
export function fontsInGroup(group: FontGroup): FontDefinition[] {
  return FONT_REGISTRY.filter((font) => font.group === group);
}

/**
 * Search the picker.
 *
 * Matches the name, the group and the note, so "mono", "luxury" and "code" all
 * land somewhere — the word someone reaches for is often about the job rather
 * than the typeface.
 */
export function searchFonts(query: string, group: FontGroup | "all" = "all"): FontDefinition[] {
  const needle = query.trim().toLowerCase();

  return FONT_REGISTRY.filter((font) => {
    if (group !== "all" && font.group !== group) return false;
    if (!needle) return true;
    return (
      font.name.toLowerCase().includes(needle) ||
      font.group.includes(needle) ||
      font.note.toLowerCase().includes(needle)
    );
  });
}

/**
 * Snap a weight onto one the family actually has.
 *
 * Called when the family changes, so moving Inter Black to Bebas Neue lands on
 * the weight Bebas has instead of silently rendering a different one (§16).
 */
export function nearestWeight(font: FontDefinition, weight: number): number {
  let best = font.weights[0];
  let distance = Math.abs(best - weight);
  for (const candidate of font.weights) {
    const gap = Math.abs(candidate - weight);
    if (gap < distance) {
      best = candidate;
      distance = gap;
    }
  }
  return best;
}

/**
 * The CSS font stack for some text.
 *
 * Chosen family first — it should draw everything it can — then a coverage
 * font for each script actually present, then the system stack so an emoji or
 * a stray symbol still lands on something (§13, §52).
 */
export function fontStackFor(fontId: string, text: string): string {
  const font = getFont(fontId);
  const families = [quote(font.family)];

  for (const script of detectTextScripts(text)) {
    if (font.scripts.includes(script)) continue;
    const coverageFont = SCRIPT_FONTS[script];
    if (coverageFont) families.push(quote(coverageFont.family));
  }

  families.push(SANS_FALLBACK);
  return families.join(", ");
}

/** Every font that has to be loaded before this text can be drawn correctly. */
export function fontsRequiredFor(fontId: string, text: string): FontDefinition[] {
  const font = getFont(fontId);
  const required = [font];

  for (const script of detectTextScripts(text)) {
    if (font.scripts.includes(script)) continue;
    const coverageFont = SCRIPT_FONTS[script];
    if (coverageFont) required.push(coverageFont);
  }

  return required;
}

function quote(family: string): string {
  return /\s/.test(family) ? `"${family}"` : family;
}

// ---------------------------------------------------------------------------
// Loading
// ---------------------------------------------------------------------------

const GOOGLE_FONTS_ORIGIN = "https://fonts.googleapis.com";

/** Stylesheets already requested, so a family is fetched once per session. */
const stylesheets = new Map<string, Promise<void>>();
/** In-flight and settled face loads, keyed by family + weight + style. */
const loads = new Map<string, Promise<boolean>>();
/**
 * Faces this module has actually seen load.
 *
 * Tracked rather than asked for, because `document.fonts.check()` cannot
 * answer the question: it returns `true` for a family the browser has never
 * heard of, on the grounds that *something* will be used to draw it. Trusting
 * it meant `fontsReadyFor` said yes for every font, no stylesheet was ever
 * requested, and every text layer silently rendered in the system fallback
 * while the picker claimed otherwise.
 */
const loaded = new Set<string>();

/**
 * Bring a family's `@font-face` rules into the document.
 *
 * Self-hosted families are a dynamic `import()` of the Fontsource stylesheet,
 * which the bundler has already split into its own chunk — so the CSS arrives
 * when the typeface is first used and never before. The three CJK coverage
 * families still use an injected `<link>`; see `font-loaders.ts` for why.
 */
function loadStylesheet(font: FontDefinition, italic: boolean): Promise<void> {
  const key = `${font.id}:${italic ? "i" : "n"}`;
  const existing = stylesheets.get(key);
  if (existing) return existing;

  const promise = (async () => {
    if (typeof document === "undefined") return;

    const source = fontSource(font.id);
    if (source) {
      // Upright always: a family loaded for its italic still needs its roman
      // for any run of text that is not italic, and both live in one family.
      const loaders = italic ? [...source.normal, ...source.italic] : source.normal;
      await Promise.all(loaders.map((load) => load()));
      return;
    }

    const cdn = CDN_COVERAGE_FONTS[font.id];
    if (!cdn) return;
    injectCdnStylesheet(font.id, cdn.spec);
  })();

  stylesheets.set(key, promise);
  return promise;
}

function injectCdnStylesheet(id: string, spec: string): void {
  if (document.querySelector(`link[data-framelo-font="${id}"]`)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `${GOOGLE_FONTS_ORIGIN}/css2?family=${spec}&display=swap`;
  link.dataset.frameloFont = id;
  document.head.appendChild(link);
}

/**
 * Load one face and resolve when it is genuinely ready to draw.
 *
 * Resolves `false` rather than rejecting when a font cannot be fetched: an
 * unavailable typeface must degrade to the fallback stack, never take the
 * editor down with it (§15).
 */
export function loadFontFace(
  font: FontDefinition,
  weight: number,
  italic: boolean,
): Promise<boolean> {
  const key = `${font.id}:${weight}:${italic ? "i" : "n"}`;
  const existing = loads.get(key);
  if (existing) return existing;

  const promise = (async () => {
    if (typeof document === "undefined" || !document.fonts) return false;

    try {
      await loadStylesheet(font, italic);

      const spec = `${italic ? "italic " : ""}${weight} 16px ${quote(font.family)}`;
      // `document.fonts.load` resolves once the face is usable — which is what
      // matters, because a canvas rasterised a moment too early silently bakes
      // the fallback typeface into the texture.
      //
      // A non-empty result means a real `@font-face` matched. An empty one
      // means nothing did, so the stylesheet is given a chance to arrive and
      // the request is retried once before giving up to the fallback stack.
      let faces = await document.fonts.load(spec, "Aa");
      if (faces.length === 0) {
        await document.fonts.ready;
        faces = await document.fonts.load(spec, "Aa");
      }
      if (faces.length === 0) return false;

      loaded.add(key);
      return true;
    } catch {
      return false;
    }
  })();

  loads.set(key, promise);
  return promise;
}

/**
 * Load everything needed to draw this text, including script coverage.
 *
 * Resolves `true` only when every required face is ready, so a caller can
 * re-rasterise once rather than guess at a delay.
 */
export async function loadFontsFor(
  fontId: string,
  text: string,
  weight: number,
  italic: boolean,
): Promise<boolean> {
  const required = fontsRequiredFor(fontId, text);
  const results = await Promise.all(
    required.map((font) => loadFontFace(font, nearestWeight(font, weight), italic && font.italic)),
  );
  return results.every(Boolean);
}

/** Whether every face for this text has already loaded — no await, no request. */
export function fontsReadyFor(
  fontId: string,
  text: string,
  weight: number,
  italic: boolean,
): boolean {
  if (typeof document === "undefined" || !document.fonts) return true;

  return fontsRequiredFor(fontId, text).every((font) => {
    const faceWeight = nearestWeight(font, weight);
    return loaded.has(`${font.id}:${faceWeight}:${italic && font.italic ? "i" : "n"}`);
  });
}

/** Test seam. */
export function resetFontLoaderState(): void {
  stylesheets.clear();
  loads.clear();
  loaded.clear();
}
