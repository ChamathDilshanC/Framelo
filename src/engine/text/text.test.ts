import { describe, expect, it } from "vitest";

import {
  fontStackFor,
  fontsRequiredFor,
  getFont,
  nearestWeight,
  FONT_REGISTRY,
} from "@/engine/text/text-fonts";
import { revealContent, resolveAlign, visibleContent } from "@/engine/text/text-layout";
import { sanitizeColor, sanitizeTextMetadata, MAX_TEXT_LENGTH } from "@/engine/text/text-safety";
import { isTintable } from "@/engine/text/text-renderer";
import { pointsAttribute, quadHandles } from "@/components/text/TextSelectionChrome";
import {
  clearScriptCache,
  detectTextScript,
  detectTextScripts,
  isRtlText,
} from "@/engine/text/text-script";
import {
  applyTextTransform,
  DEFAULT_TEXT_STYLE,
  nameFromContent,
  pxToWorld,
  resolveTextMetadata,
  worldToPx,
} from "@/engine/text/text-types";

/**
 * These cover the logic that decides *what* to draw and *with which font*.
 *
 * Whether the glyphs then come out correctly is a question about the browser's
 * text engine, not about this code, and is verified in a real browser — the
 * node test environment has no canvas and would answer it falsely either way.
 */

// ---------------------------------------------------------------------------

describe("script detection", () => {
  const CASES: Array<[string, string, string]> = [
    ["English", "Build something amazing", "latin"],
    ["Sinhala", "ඔබේ App එක", "sinhala"],
    ["Tamil", "உங்கள் App", "tamil"],
    ["Hindi", "आपका ऐप", "devanagari"],
    ["Arabic", "تطبيقك", "arabic"],
    ["Hebrew", "האפליקציה שלך", "hebrew"],
    ["Bengali", "আপনার অ্যাপ", "bengali"],
    ["Thai", "แอปของคุณ", "thai"],
    ["Korean", "당신의 앱", "hangul"],
    ["Japanese", "あなたのアプリ", "kana"],
    ["Chinese", "你的应用", "han"],
    ["Cyrillic", "Ваше приложение", "cyrillic"],
  ];

  for (const [name, text, expected] of CASES) {
    it(`identifies ${name}`, () => {
      expect(detectTextScript(text)).toBe(expected);
    });
  }

  it("reports every script in mixed text, not just the first", () => {
    // The case that matters: a Latin product name inside a Sinhala sentence
    // still needs the Sinhala font, and the Sinhala still needs Latin for the
    // brand and the punctuation.
    const scripts = detectTextScripts("ඔබේ App එක");
    expect(scripts).toContain("sinhala");
    expect(scripts).toContain("latin");
  });

  it("ranks the dominant script first", () => {
    expect(detectTextScript("ඔබේ ඔබේ ඔබේ App")).toBe("sinhala");
  });

  it("always includes latin, because digits and punctuation are latin", () => {
    expect(detectTextScripts("你好 2024")).toContain("latin");
  });

  it("detects emoji without being confused by them", () => {
    expect(detectTextScripts("🚀 Build faster")).toContain("emoji");
  });

  it("returns nothing for empty text", () => {
    expect(detectTextScripts("")).toEqual([]);
  });

  it("caches without changing its answer", () => {
    clearScriptCache();
    const first = detectTextScripts("تطبيقك");
    const second = detectTextScripts("تطبيقك");
    expect(second).toEqual(first);
  });
});

describe("right-to-left", () => {
  it("flags Arabic", () => {
    expect(isRtlText("تطبيقك")).toBe(true);
  });

  it("flags Hebrew", () => {
    expect(isRtlText("האפליקציה שלך")).toBe(true);
  });

  it("leaves Latin alone", () => {
    expect(isRtlText("Build something amazing")).toBe(false);
  });

  it("does not flip a paragraph for one quoted Latin word", () => {
    // A brand name inside Arabic copy is common, and flipping the paragraph
    // because it appears first would be wrong.
    expect(isRtlText("تطبيقك Framelo تطبيقك")).toBe(true);
  });

  it("mirrors start and end alignment for RTL", () => {
    expect(resolveAlign("left", true)).toBe("right");
    expect(resolveAlign("right", true)).toBe("left");
    expect(resolveAlign("center", true)).toBe("center");
  });

  it("leaves alignment alone for LTR", () => {
    expect(resolveAlign("left", false)).toBe("left");
    expect(resolveAlign("right", false)).toBe("right");
  });
});

// ---------------------------------------------------------------------------

describe("fonts", () => {
  it("offers only weights a family actually ships", () => {
    // Bebas Neue is a single-weight display face; offering bold would render a
    // synthesised one the designer never chose.
    expect(getFont("bebas-neue").weights).toEqual([400]);
  });

  it("snaps a weight onto the nearest the family has", () => {
    expect(nearestWeight(getFont("bebas-neue"), 900)).toBe(400);
    expect(nearestWeight(getFont("inter"), 640)).toBe(600);
  });

  it("falls back to the first font for an unknown id", () => {
    expect(getFont("not-a-font").id).toBe(FONT_REGISTRY[0].id);
  });

  it("every registered font declares at least one weight and one script", () => {
    for (const font of FONT_REGISTRY) {
      expect(font.weights.length).toBeGreaterThan(0);
      expect(font.scripts.length).toBeGreaterThan(0);
    }
  });

  it("puts the chosen family first in the stack", () => {
    expect(fontStackFor("poppins", "Hello")).toMatch(/^Poppins,/);
  });

  it("adds a coverage font for a script the family does not have", () => {
    const stack = fontStackFor("inter", "ඔබේ App එක");
    expect(stack).toContain("Noto Sans Sinhala");
    // The chosen family still leads: it should draw the Latin run.
    expect(stack.indexOf("Inter")).toBeLessThan(stack.indexOf("Noto Sans Sinhala"));
  });

  it("does not add a coverage font the family already covers", () => {
    // Poppins ships Devanagari, so Hindi needs nothing extra.
    expect(fontStackFor("poppins", "आपका ऐप")).not.toContain("Noto Sans Devanagari");
  });

  it("always ends in a system stack, so nothing is ever unrenderable", () => {
    expect(fontStackFor("inter", "🚀")).toMatch(/sans-serif$/);
  });

  it("requires only the fonts the text actually needs", () => {
    // The point of lazy loading: Latin text must not pull the CJK faces.
    const ids = fontsRequiredFor("inter", "Hello").map((font) => font.id);
    expect(ids).toEqual(["inter"]);
  });

  it("requires a coverage font per script present", () => {
    const ids = fontsRequiredFor("inter", "ඔබේ 你好").map((font) => font.id);
    expect(ids).toContain("noto-sinhala");
    expect(ids).toContain("noto-sc");
  });
});

// ---------------------------------------------------------------------------

describe("reveal", () => {
  it("shows nothing at 0 and everything at 1", () => {
    expect(revealContent("HELLO", "characters", 0)).toBe("");
    expect(revealContent("HELLO", "characters", 1)).toBe("HELLO");
  });

  it("types one character at a time", () => {
    const steps = [0, 0.2, 0.4, 0.6, 0.8, 1].map((p) =>
      revealContent("HELLO", "characters", p),
    );
    expect(steps).toEqual(["", "H", "HE", "HEL", "HELL", "HELLO"]);
  });

  it("builds one word at a time", () => {
    const steps = [0, 1 / 3, 2 / 3, 1].map((p) =>
      revealContent("Launch your app", "words", p),
    );
    expect(steps).toEqual(["", "Launch", "Launch your", "Launch your app"]);
  });

  it("reveals line by line", () => {
    expect(revealContent("one\ntwo\nthree", "lines", 2 / 3)).toBe("one\ntwo");
  });

  it("does not stall on spaces", () => {
    // Counting whitespace as a unit makes a typewriter appear to freeze for a
    // frame on every gap, because the progress is spent on nothing visible.
    const half = revealContent("ab cd", "characters", 0.5);
    expect(half).toBe("ab");
  });

  it("never splits an emoji in half", () => {
    // Half a surrogate pair is not a character, it is a replacement glyph.
    for (let step = 0; step <= 10; step += 1) {
      const out = revealContent("🚀🎉 go", "characters", step / 10);
      expect(out).not.toMatch(/[\uD800-\uDBFF]$/);
    }
  });

  it("is deterministic — the same progress always gives the same text", () => {
    // This is what makes scrubbing, export and a shared link agree.
    const a = revealContent("Build something amazing", "words", 0.42);
    const b = revealContent("Build something amazing", "words", 0.42);
    expect(a).toBe(b);
  });

  it("is monotonic — scrubbing forward never removes text", () => {
    let previous = "";
    for (let step = 0; step <= 20; step += 1) {
      const out = revealContent("Launch your new app today", "words", step / 20);
      expect(out.startsWith(previous)).toBe(true);
      previous = out;
    }
  });

  it("leaves content untouched when the mode is none", () => {
    expect(revealContent("HELLO", "none", 0)).toBe("HELLO");
  });
});

describe("display casing", () => {
  it("uppercases and lowercases", () => {
    expect(applyTextTransform("Hello", "uppercase")).toBe("HELLO");
    expect(applyTextTransform("Hello", "lowercase")).toBe("hello");
  });

  it("capitalises each word", () => {
    expect(applyTextTransform("build something amazing", "capitalize")).toBe(
      "Build Something Amazing",
    );
  });

  it("capitalises accented letters, not only ASCII", () => {
    expect(applyTextTransform("école normale", "capitalize")).toBe("École Normale");
  });

  it("leaves scripts without case alone", () => {
    expect(applyTextTransform("ඔබේ App", "uppercase")).toBe("ඔබේ APP");
  });

  it("applies casing after the reveal, not before", () => {
    const style = { ...DEFAULT_TEXT_STYLE, revealMode: "characters" as const, textTransform: "uppercase" as const };
    expect(visibleContent(style, "hello", 0.6)).toBe("HEL");
  });
});

// ---------------------------------------------------------------------------

describe("layer naming", () => {
  it("names a layer after its words", () => {
    expect(nameFromContent("Build something amazing")).toBe("Build something amazing");
  });

  it("truncates a long line", () => {
    const name = nameFromContent("a".repeat(80));
    expect(name.length).toBeLessThanOrEqual(29);
    expect(name.endsWith("…")).toBe(true);
  });

  it("falls back to a name for empty content", () => {
    expect(nameFromContent("   ")).toBe("Text");
  });

  it("collapses newlines into one line", () => {
    expect(nameFromContent("one\ntwo")).toBe("one two");
  });
});

describe("units", () => {
  it("round-trips pixels through world units", () => {
    expect(worldToPx(pxToWorld(64))).toBeCloseTo(64, 6);
  });

  it("makes a 1080-tall composition about 4.36 world units", () => {
    // The camera sees 2 * 7.6 * tan(16°) of height, which is what this constant
    // is derived from — if it drifts, font sizes stop meaning pixels.
    expect(pxToWorld(1080)).toBeCloseTo(4.355, 2);
  });
});

// ---------------------------------------------------------------------------

describe("stored text is normalised before it is drawn", () => {
  it("fills in everything a partial layer is missing", () => {
    const style = resolveTextMetadata({ content: "hi" });
    expect(style.fontId).toBe(DEFAULT_TEXT_STYLE.fontId);
    expect(style.fill.gradient.from).toBe(DEFAULT_TEXT_STYLE.fill.gradient.from);
  });

  it("survives null and nonsense", () => {
    expect(() => sanitizeTextMetadata(null)).not.toThrow();
    expect(() => sanitizeTextMetadata("not an object")).not.toThrow();
    expect(sanitizeTextMetadata(undefined).fontSize).toBe(DEFAULT_TEXT_STYLE.fontSize);
  });

  it("clamps a font size that would break layout", () => {
    expect(sanitizeTextMetadata({ fontSize: 0 }).fontSize).toBeGreaterThan(0);
    expect(sanitizeTextMetadata({ fontSize: 1e9 }).fontSize).toBeLessThanOrEqual(800);
    expect(sanitizeTextMetadata({ fontSize: Number.NaN }).fontSize).toBe(
      DEFAULT_TEXT_STYLE.fontSize,
    );
  });

  it("rejects a line height of zero, which would stack every line", () => {
    expect(sanitizeTextMetadata({ lineHeight: 0 }).lineHeight).toBeGreaterThan(0);
  });

  it("caps content length", () => {
    const long = sanitizeTextMetadata({ content: "x".repeat(MAX_TEXT_LENGTH + 5000) });
    expect(long.content.length).toBe(MAX_TEXT_LENGTH);
  });

  it("keeps valid colour notations", () => {
    expect(sanitizeColor("#fff", "#000")).toBe("#fff");
    expect(sanitizeColor("#7C5CFF", "#000")).toBe("#7C5CFF");
    expect(sanitizeColor("rgba(255, 0, 0, 0.5)", "#000")).toBe("rgba(255, 0, 0, 0.5)");
    expect(sanitizeColor("rebeccapurple", "#000")).toBe("rebeccapurple");
  });

  it("replaces a colour the canvas could not use", () => {
    // A rejected fillStyle is a silent no-op that paints the previous colour,
    // so an unusable value must become a real one rather than be passed on.
    expect(sanitizeColor("url(x)", "#000")).toBe("#000");
    expect(sanitizeColor("", "#000")).toBe("#000");
    expect(sanitizeColor(42, "#000")).toBe("#000");
  });

  it("keeps unicode content intact", () => {
    const content = "ඔබේ App එක · 🚀 · تطبيقك · Café";
    expect(sanitizeTextMetadata({ content }).content).toBe(content);
  });

  it("rounds a weight onto a real step", () => {
    expect(sanitizeTextMetadata({ fontWeight: 437 }).fontWeight).toBe(400);
  });

  it("falls back for an unrecognised enum", () => {
    expect(sanitizeTextMetadata({ textAlign: "sideways" }).textAlign).toBe(
      DEFAULT_TEXT_STYLE.textAlign,
    );
    expect(sanitizeTextMetadata({ revealMode: "magic" }).revealMode).toBe("none");
  });
});

// ---------------------------------------------------------------------------

describe("tintable styles", () => {
  const base = DEFAULT_TEXT_STYLE;

  it("tints plain solid-filled text", () => {
    // The common case, and the one worth optimising: a colour change becomes a
    // material write instead of redrawing the glyphs.
    expect(isTintable(base)).toBe(true);
  });

  it("does not tint a gradient fill", () => {
    expect(isTintable({ ...base, fill: { ...base.fill, type: "gradient" } })).toBe(false);
  });

  it("does not tint when another colour is baked into the texture", () => {
    // A material tint multiplies the whole drawing, so anything that paints its
    // own colour has to keep being painted.
    expect(isTintable({ ...base, stroke: { ...base.stroke, enabled: true } })).toBe(false);
    expect(isTintable({ ...base, shadow: { ...base.shadow, enabled: true } })).toBe(false);
    expect(isTintable({ ...base, backdrop: { ...base.backdrop, enabled: true } })).toBe(false);
  });
});

describe("selection quad", () => {
  const rect = [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 300, y: 200 },
    { x: 100, y: 200 },
  ];

  it("puts the edge handles on the edge midpoints", () => {
    const handles = quadHandles(rect);
    expect(handles.left).toEqual({ x: 100, y: 150 });
    expect(handles.right).toEqual({ x: 300, y: 150 });
    expect(handles.centre).toEqual({ x: 200, y: 150 });
  });

  it("puts the rotate handle beyond the top edge", () => {
    const handles = quadHandles(rect);
    expect(handles.rotate.x).toBeCloseTo(200, 5);
    // Screen y grows downward, so "above" is a smaller y than the top edge.
    expect(handles.rotate.y).toBeLessThan(100);
  });

  it("keeps the rotate handle outside the quad when it is turned upside down", () => {
    // The handle follows the layer's own top edge rather than the screen's, so
    // a flipped layer does not get a handle buried inside its own outline.
    const flipped = [
      { x: 100, y: 200 },
      { x: 300, y: 200 },
      { x: 300, y: 100 },
      { x: 100, y: 100 },
    ];
    expect(quadHandles(flipped).rotate.y).toBeGreaterThan(200);
  });

  it("follows a perspective quad rather than its bounding box", () => {
    // A layer rotated in 3D projects to a trapezoid: the near edge longer than
    // the far one. The handles must sit on that shape, not on a flat box.
    const trapezoid = [
      { x: 100, y: 80 },
      { x: 300, y: 130 },
      { x: 300, y: 170 },
      { x: 100, y: 220 },
    ];
    const handles = quadHandles(trapezoid);
    expect(handles.left).toEqual({ x: 100, y: 150 });
    expect(handles.right).toEqual({ x: 300, y: 150 });
  });

  it("serialises corners into an SVG points attribute", () => {
    expect(pointsAttribute(rect)).toBe("100.0,100.0 300.0,100.0 300.0,200.0 100.0,200.0");
  });
});
