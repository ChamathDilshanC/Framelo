/**
 * Where the font files actually come from.
 *
 * The only file in the codebase that names a Fontsource package, and the only
 * one that needs to when a typeface is added or removed.
 *
 * ## Why self-hosted
 *
 * Framelo used to pull its typefaces from the Google Fonts CDN with an injected
 * `<link>`. That worked and had three problems worth fixing:
 *
 * 1. **A shared project depended on a third party.** Someone opening a share
 *    link on a locked-down network got the composition with the wrong
 *    typography and no indication why. Fonts are part of the design; a design
 *    that renders differently depending on the viewer's network is not one.
 * 2. **Every text layer leaked a request to another origin**, on a page that
 *    otherwise talks only to Framelo and Supabase.
 * 3. **Variable fonts were being served as static instances.** Fontsource ships
 *    the real variable files, so one download now covers every weight of a
 *    family instead of one download per weight.
 *
 * ## Why a table of thunks and not a computed path
 *
 * `import(`@fontsource-variable/${id}/index.css`)` is the obvious shape and the
 * wrong one: bundlers cannot resolve a template literal to a module, and
 * whatever they do resolve would be a directory of every font at once, which is
 * exactly the eager loading this is meant to avoid. Explicit thunks are
 * statically analysable, so each family becomes its own chunk that arrives when
 * it is first used — and a typeface with no entry here simply cannot be
 * registered, which enforces "never offer a font that will not render" at the
 * type level rather than by review.
 *
 * ## The one exception
 *
 * Chinese, Japanese and Korean coverage still comes from the CDN. Those three
 * Noto families are tens of megabytes installed — two orders of magnitude more
 * than every other font here combined — and vendoring them to make CJK text a
 * little more robust would make `npm install` substantially worse for everyone.
 * `CDN_COVERAGE_FONTS` records that, and it is the only remote font request the
 * app can make.
 */

/** A lazily-loaded stylesheet. Resolves once the `@font-face` rules are live. */
export type FontStylesheetLoader = () => Promise<unknown>;

export interface FontSource {
  /** The CSS family name, exactly as the package declares it. */
  family: string;
  /** Upright faces. */
  normal: FontStylesheetLoader[];
  /** Real italics, where the family ships them. Empty means none exist. */
  italic: FontStylesheetLoader[];
}

/**
 * Variable families.
 *
 * Fontsource names these "X Variable" to keep them distinct from the static
 * package of the same typeface. The name is a CSS detail and never reaches a
 * project file — layers store our own stable `fontId` — so switching a family
 * from static to variable does not rewrite anyone's work.
 */
export const FONT_SOURCES: Record<string, FontSource> = {
  inter: {
    family: "Inter Variable",
    normal: [() => import("@fontsource-variable/inter/index.css")],
    italic: [() => import("@fontsource-variable/inter/wght-italic.css")],
  },
  roboto: {
    family: "Roboto Variable",
    normal: [() => import("@fontsource-variable/roboto/index.css")],
    italic: [() => import("@fontsource-variable/roboto/wght-italic.css")],
  },
  "open-sans": {
    family: "Open Sans Variable",
    normal: [() => import("@fontsource-variable/open-sans/index.css")],
    italic: [() => import("@fontsource-variable/open-sans/wght-italic.css")],
  },
  montserrat: {
    family: "Montserrat Variable",
    normal: [() => import("@fontsource-variable/montserrat/index.css")],
    italic: [() => import("@fontsource-variable/montserrat/wght-italic.css")],
  },
  "dm-sans": {
    family: "DM Sans Variable",
    normal: [() => import("@fontsource-variable/dm-sans/index.css")],
    italic: [() => import("@fontsource-variable/dm-sans/wght-italic.css")],
  },
  manrope: {
    family: "Manrope Variable",
    normal: [() => import("@fontsource-variable/manrope/index.css")],
    italic: [],
  },
  "plus-jakarta-sans": {
    family: "Plus Jakarta Sans Variable",
    normal: [() => import("@fontsource-variable/plus-jakarta-sans/index.css")],
    italic: [() => import("@fontsource-variable/plus-jakarta-sans/wght-italic.css")],
  },
  "space-grotesk": {
    family: "Space Grotesk Variable",
    normal: [() => import("@fontsource-variable/space-grotesk/index.css")],
    italic: [],
  },
  outfit: {
    family: "Outfit Variable",
    normal: [() => import("@fontsource-variable/outfit/index.css")],
    italic: [],
  },
  syne: {
    family: "Syne Variable",
    normal: [() => import("@fontsource-variable/syne/index.css")],
    italic: [],
  },
  archivo: {
    family: "Archivo Variable",
    normal: [() => import("@fontsource-variable/archivo/index.css")],
    italic: [() => import("@fontsource-variable/archivo/wght-italic.css")],
  },
  urbanist: {
    family: "Urbanist Variable",
    normal: [() => import("@fontsource-variable/urbanist/index.css")],
    italic: [() => import("@fontsource-variable/urbanist/wght-italic.css")],
  },
  sora: {
    family: "Sora Variable",
    normal: [() => import("@fontsource-variable/sora/index.css")],
    italic: [],
  },
  "source-serif-4": {
    family: "Source Serif 4 Variable",
    normal: [() => import("@fontsource-variable/source-serif-4/index.css")],
    italic: [() => import("@fontsource-variable/source-serif-4/wght-italic.css")],
  },
  "playfair-display": {
    family: "Playfair Display Variable",
    normal: [() => import("@fontsource-variable/playfair-display/index.css")],
    italic: [() => import("@fontsource-variable/playfair-display/wght-italic.css")],
  },
  merriweather: {
    family: "Merriweather Variable",
    normal: [() => import("@fontsource-variable/merriweather/index.css")],
    italic: [() => import("@fontsource-variable/merriweather/wght-italic.css")],
  },
  "jetbrains-mono": {
    family: "JetBrains Mono Variable",
    normal: [() => import("@fontsource-variable/jetbrains-mono/index.css")],
    italic: [() => import("@fontsource-variable/jetbrains-mono/wght-italic.css")],
  },

  // -------------------------------------------------------------------------
  // Static families.
  //
  // No variable version exists, so each weight is its own stylesheet. They are
  // listed individually rather than pulled in through the package's `index.css`
  // because that entry point ships weight 400 only — importing it and offering
  // seven weights in the picker would render six of them as a faked bold.
  // -------------------------------------------------------------------------
  poppins: {
    family: "Poppins",
    normal: [
      () => import("@fontsource/poppins/300.css"),
      () => import("@fontsource/poppins/400.css"),
      () => import("@fontsource/poppins/500.css"),
      () => import("@fontsource/poppins/600.css"),
      () => import("@fontsource/poppins/700.css"),
      () => import("@fontsource/poppins/800.css"),
      () => import("@fontsource/poppins/900.css"),
    ],
    italic: [
      () => import("@fontsource/poppins/400-italic.css"),
      () => import("@fontsource/poppins/600-italic.css"),
    ],
  },
  "ibm-plex-mono": {
    family: "IBM Plex Mono",
    normal: [
      () => import("@fontsource/ibm-plex-mono/300.css"),
      () => import("@fontsource/ibm-plex-mono/400.css"),
      () => import("@fontsource/ibm-plex-mono/500.css"),
      () => import("@fontsource/ibm-plex-mono/600.css"),
      () => import("@fontsource/ibm-plex-mono/700.css"),
    ],
    italic: [
      () => import("@fontsource/ibm-plex-mono/400-italic.css"),
      () => import("@fontsource/ibm-plex-mono/700-italic.css"),
    ],
  },
  "dm-serif-display": {
    family: "DM Serif Display",
    normal: [() => import("@fontsource/dm-serif-display/400.css")],
    italic: [() => import("@fontsource/dm-serif-display/400-italic.css")],
  },
  "bebas-neue": {
    family: "Bebas Neue",
    normal: [() => import("@fontsource/bebas-neue/400.css")],
    italic: [],
  },

  // -------------------------------------------------------------------------
  // Script coverage. Not in the picker — these are what makes the chosen
  // typeface legible when the text contains a script it does not cover.
  // -------------------------------------------------------------------------
  "noto-sinhala": {
    family: "Noto Sans Sinhala",
    normal: [
      () => import("@fontsource/noto-sans-sinhala/400.css"),
      () => import("@fontsource/noto-sans-sinhala/500.css"),
      () => import("@fontsource/noto-sans-sinhala/700.css"),
    ],
    italic: [],
  },
  "noto-tamil": {
    family: "Noto Sans Tamil",
    normal: [
      () => import("@fontsource/noto-sans-tamil/400.css"),
      () => import("@fontsource/noto-sans-tamil/500.css"),
      () => import("@fontsource/noto-sans-tamil/700.css"),
    ],
    italic: [],
  },
  "noto-devanagari": {
    family: "Noto Sans Devanagari",
    normal: [
      () => import("@fontsource/noto-sans-devanagari/400.css"),
      () => import("@fontsource/noto-sans-devanagari/500.css"),
      () => import("@fontsource/noto-sans-devanagari/700.css"),
    ],
    italic: [],
  },
  "noto-bengali": {
    family: "Noto Sans Bengali",
    normal: [
      () => import("@fontsource/noto-sans-bengali/400.css"),
      () => import("@fontsource/noto-sans-bengali/500.css"),
      () => import("@fontsource/noto-sans-bengali/700.css"),
    ],
    italic: [],
  },
  "noto-arabic": {
    family: "Noto Sans Arabic",
    normal: [
      () => import("@fontsource/noto-sans-arabic/400.css"),
      () => import("@fontsource/noto-sans-arabic/500.css"),
      () => import("@fontsource/noto-sans-arabic/700.css"),
    ],
    italic: [],
  },
  "noto-hebrew": {
    family: "Noto Sans Hebrew",
    normal: [
      () => import("@fontsource/noto-sans-hebrew/400.css"),
      () => import("@fontsource/noto-sans-hebrew/500.css"),
      () => import("@fontsource/noto-sans-hebrew/700.css"),
    ],
    italic: [],
  },
  "noto-thai": {
    family: "Noto Sans Thai",
    normal: [
      () => import("@fontsource/noto-sans-thai/400.css"),
      () => import("@fontsource/noto-sans-thai/500.css"),
      () => import("@fontsource/noto-sans-thai/700.css"),
    ],
    italic: [],
  },
};

/**
 * The CJK coverage fonts, which are still fetched from Google's CDN.
 *
 * Kept in one named place so the tradeoff is visible rather than buried: these
 * three are the only remote font requests Framelo makes, and anyone who needs
 * the app to be fully self-contained knows exactly which packages to vendor to
 * get there.
 */
export const CDN_COVERAGE_FONTS: Record<string, { family: string; spec: string }> = {
  "noto-kr": { family: "Noto Sans KR", spec: "Noto+Sans+KR:wght@400;500;700" },
  "noto-jp": { family: "Noto Sans JP", spec: "Noto+Sans+JP:wght@400;500;700" },
  "noto-sc": { family: "Noto Sans SC", spec: "Noto+Sans+SC:wght@400;500;700" },
};

export function fontSource(fontId: string): FontSource | undefined {
  return FONT_SOURCES[fontId];
}
