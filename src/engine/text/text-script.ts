/**
 * Unicode script detection.
 *
 * Framelo needs this for one reason: no font covers every writing system, so
 * the answer to "which font should actually draw these words" depends on what
 * the words are made of. Sinhala typed into Inter renders as boxes unless
 * something notices it is Sinhala.
 *
 * Deliberately small. This is not a full implementation of UAX #24 — it does
 * not need to be. It answers "which of the scripts Framelo ships a font for is
 * this text mostly written in", and it has to be cheap enough to run on every
 * keystroke (§14).
 */

export const TEXT_SCRIPTS = [
  "latin",
  "cyrillic",
  "greek",
  "sinhala",
  "tamil",
  "devanagari",
  "bengali",
  "arabic",
  "hebrew",
  "thai",
  "hangul",
  "kana",
  "han",
  "emoji",
] as const;

export type TextScript = (typeof TEXT_SCRIPTS)[number];

/**
 * Ranges checked in order, first match wins per character.
 *
 * Ordering matters where blocks overlap in practice: kana is tested before han
 * because Japanese text mixes the two and should be shaped by a Japanese font,
 * and emoji is tested early because many emoji sit above the CJK planes.
 */
const SCRIPT_RANGES: Array<[TextScript, RegExp]> = [
  ["emoji", /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u],
  ["sinhala", /[඀-෿]/u],
  ["tamil", /[஀-௿]/u],
  ["devanagari", /[ऀ-ॿ]/u],
  ["bengali", /[ঀ-৿]/u],
  ["arabic", /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/u],
  ["hebrew", /[֐-׿יִ-ﭏ]/u],
  ["thai", /[฀-๿]/u],
  ["hangul", /[가-힯ᄀ-ᇿ㄰-㆏]/u],
  ["kana", /[぀-ゟ゠-ヿ]/u],
  ["han", /[一-鿿㐀-䶿豈-﫿]/u],
  ["cyrillic", /[Ѐ-ӿԀ-ԯ]/u],
  ["greek", /[Ͱ-Ͽἀ-῿]/u],
];

/** Scripts written right to left (§51). */
const RTL_SCRIPTS: ReadonlySet<TextScript> = new Set<TextScript>(["arabic", "hebrew"]);

/**
 * Detection is cached by string.
 *
 * Text is re-rendered on every frame of a reveal animation and on every
 * keystroke while editing, and the same handful of strings come back over and
 * over. The cache is bounded because a long editing session would otherwise
 * grow one entry per keystroke, forever.
 */
const CACHE_LIMIT = 500;
const cache = new Map<string, TextScript[]>();

/**
 * Every script present in the text, most significant first.
 *
 * Returns all of them rather than one, because real text is mixed — an
 * English product name inside a Sinhala sentence, a Latin brand in Arabic
 * copy — and the font stack has to cover the whole string, not its first
 * character.
 */
export function detectTextScripts(text: string): TextScript[] {
  if (!text) return [];

  const cached = cache.get(text);
  if (cached) return cached;

  // Sample rather than scan: a 10,000 character paragraph is not written in a
  // different script than its first 2,000 characters.
  const sample = text.length > 2000 ? text.slice(0, 2000) : text;

  const counts = new Map<TextScript, number>();
  for (const char of sample) {
    for (const [script, pattern] of SCRIPT_RANGES) {
      if (!pattern.test(char)) continue;
      counts.set(script, (counts.get(script) ?? 0) + 1);
      break;
    }
  }

  const found = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([script]) => script);

  // Latin is implicit: it covers the digits, punctuation and spacing that sit
  // inside text of every script, so it belongs in the stack even when no Latin
  // letter appears.
  if (!found.includes("latin")) found.push("latin");

  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(text, found);
  return found;
}

/** The single dominant script, for choosing a default font. */
export function detectTextScript(text: string): TextScript {
  return detectTextScripts(text)[0] ?? "latin";
}

export function isRtlScript(script: TextScript): boolean {
  return RTL_SCRIPTS.has(script);
}

/**
 * Whether text should be laid out right to left.
 *
 * Based on the dominant script rather than the first character, so a quoted
 * English word at the start of an Arabic line does not flip the paragraph.
 */
export function isRtlText(text: string): boolean {
  for (const script of detectTextScripts(text)) {
    if (RTL_SCRIPTS.has(script)) return true;
    // Only the dominant script decides; a trailing Latin fallback never does.
    if (script !== "latin") return false;
  }
  return false;
}

/** Test seam: detection is cached, and a test that changes fonts needs it clean. */
export function clearScriptCache(): void {
  cache.clear();
}
