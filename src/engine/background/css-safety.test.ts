import { describe, expect, it } from "vitest";

import {
  extractPatternCss,
  validateBackgroundPosition,
  validateBackgroundSize,
  validateColor,
  validateCssValue,
  validatePatternCss,
} from "@/engine/background/css-safety";

/**
 * The pattern validator is the boundary where user text becomes something the
 * browser renders, so these tests are about what must be *refused* as much as
 * what must be accepted.
 */

describe("validateCssValue — accepts real patterns", () => {
  const valid = [
    "radial-gradient(circle at 1px 1px, rgba(0,29,61,0.12) 1px, transparent 0)",
    "repeating-linear-gradient(45deg, #0002 0 10px, transparent 10px 20px)",
    "conic-gradient(from 210deg at 50% 50%, #140d22, #ff7ac6, #140d22)",
    "linear-gradient(color-mix(in srgb, #7c6cff 20%, transparent), transparent)",
    "radial-gradient(60% 60% at 20% 10%, oklch(0.7 0.1 250), transparent 60%)",
    "linear-gradient(calc(45deg + 10deg), #fff, #000)",
  ];

  it.each(valid)("accepts %s", (value) => {
    expect(validateCssValue(value).ok).toBe(true);
  });

  it("treats an empty value as valid and empty", () => {
    expect(validateCssValue("")).toEqual({ ok: true, value: "" });
    expect(validateCssValue(undefined)).toEqual({ ok: true, value: "" });
  });
});

describe("validateCssValue — refuses anything that could fetch or execute", () => {
  const attacks = [
    // Fetching anything at all, however it is spelled.
    'url("https://example.com/x.png")',
    "url(javascript:alert(1))",
    "URL ( '/x.png' )",
    "image-set('a.png' 1x)",
    // Script URLs and legacy execution vectors.
    "javascript:alert(1)",
    "expression(alert(1))",
    "linear-gradient(red, blue); background-image: url(x)",
    // Escaping the property into markup.
    "red</style><script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    'red" onload="alert(1)',
    // CSS escape sequences, the usual way past a naive substring filter.
    "\\75 rl(evil.png)",
    "&#117;rl(x)",
    // Overriding the cascade.
    "red !important",
    "@import url(evil.css)",
    // Unknown functions, which is how a future vector would arrive.
    "attr(data-x)",
    "env(safe-area-inset-top)",
  ];

  it.each(attacks)("refuses %s", (value) => {
    expect(validateCssValue(value).ok).toBe(false);
  });

  it("refuses unbalanced brackets", () => {
    expect(validateCssValue("linear-gradient(red, blue").ok).toBe(false);
    expect(validateCssValue("linear-gradient(red, blue))").ok).toBe(false);
  });

  it("refuses absurdly long values", () => {
    expect(validateCssValue("a".repeat(5000)).ok).toBe(false);
  });

  it("refuses deeply nested values", () => {
    const nested = `${"calc(".repeat(20)}1px${")".repeat(20)}`;
    expect(validateCssValue(nested).ok).toBe(false);
  });
});

describe("validateColor", () => {
  it.each(["#fff", "#faf8f3", "#faf8f380", "rgba(0,0,0,0.5)", "oklch(0.7 0.1 250)", "transparent"])(
    "accepts %s",
    (value) => {
      expect(validateColor(value).ok).toBe(true);
    },
  );

  it.each(["red; background: url(x)", "url(x)", "javascript:alert(1)", "not-a-colour"])(
    "refuses %s",
    (value) => {
      expect(validateColor(value).ok).toBe(false);
    },
  );
});

describe("size and position", () => {
  it.each(["16px 16px", "cover", "contain", "auto", "40% auto", "32px 32px, 32px 32px"])(
    "accepts size %s",
    (value) => {
      expect(validateBackgroundSize(value).ok).toBe(true);
    },
  );

  it.each(["16px; color: red", "url(x)", "16 16"])("refuses size %s", (value) => {
    expect(validateBackgroundSize(value).ok).toBe(false);
  });

  it.each(["0 0", "center", "left top", "0 0, 12px 12px"])("accepts position %s", (value) => {
    expect(validateBackgroundPosition(value).ok).toBe(true);
  });
});

describe("validatePatternCss", () => {
  it("keeps the good fields and drops the bad ones", () => {
    const result = validatePatternCss({
      backgroundColor: "#faf8f3",
      backgroundImage: "url(evil.png)",
      backgroundSize: "16px 16px",
    });

    // A single bad value degrades to "that property is ignored", not to a
    // blank background — but `ok` still reports that something was refused.
    expect(result.ok).toBe(false);
    expect(result.css.backgroundColor).toBe("#faf8f3");
    expect(result.css.backgroundSize).toBe("16px 16px");
    expect(result.css.backgroundImage).toBeUndefined();
    expect(result.errors.backgroundImage).toBeTruthy();
  });

  it("passes a clean pattern through untouched", () => {
    const css = {
      backgroundColor: "#0f1014",
      backgroundImage: "radial-gradient(circle at 1px 1px, #fff2 1px, transparent 0)",
      backgroundSize: "16px 16px",
    };
    expect(validatePatternCss(css)).toMatchObject({ ok: true, css });
  });
});

describe("extractPatternCss", () => {
  it("reads the background properties out of a pasted JSX block", () => {
    const snippet = `
      <div className="min-h-screen w-full bg-[#faf8f3] relative">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: \`radial-gradient(circle at 1px 1px, rgba(0,29,61,0.12) 1px, transparent 0)\`,
            backgroundSize: "16px 16px",
          }}
        />
      </div>`;

    const extracted = extractPatternCss(snippet);

    expect(extracted.backgroundImage).toContain("radial-gradient");
    expect(extracted.backgroundSize).toBe("16px 16px");
    // The Tailwind arbitrary value is the only colour in that snippet.
    expect(extracted.backgroundColor).toBe("#faf8f3");
  });

  it("reads plain CSS too", () => {
    const extracted = extractPatternCss(
      ".x { background-color: #101014; background-image: linear-gradient(#fff1 1px, transparent 1px); background-size: 24px 24px; }",
    );

    expect(extracted.backgroundColor).toBe("#101014");
    expect(extracted.backgroundImage).toContain("linear-gradient");
    expect(extracted.backgroundSize).toBe("24px 24px");
  });

  it("extracts, but does not trust — a script snippet still fails validation", () => {
    const extracted = extractPatternCss(
      "style={{ backgroundImage: \"url(javascript:alert(1))\" }}",
    );
    // Extraction is text parsing; safety is the validator's job, and it refuses.
    expect(validatePatternCss(extracted).css.backgroundImage).toBeUndefined();
  });
});

describe("extractPatternCss — the `background` shorthand", () => {
  // The shape almost every pattern gallery hands out. Framelo previously read
  // only the longhands, so this whole snippet came back empty and the editor
  // reported that some values were not applied.
  const ORCHID_DEPTHS = `
    <div className="min-h-screen w-full relative">
      {/* Orchid Depths */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: "radial-gradient(125% 125% at 50% 10%, #000000 40%, #350136 100%)",
        }}
      />
    </div>`;

  it("reads a gradient shorthand as the background image", () => {
    const extracted = extractPatternCss(ORCHID_DEPTHS);

    expect(extracted.backgroundImage).toBe(
      "radial-gradient(125% 125% at 50% 10%, #000000 40%, #350136 100%)",
    );
    expect(extracted.backgroundColor).toBeUndefined();
  });

  it("accepts that snippet end to end", () => {
    const result = validatePatternCss(extractPatternCss(ORCHID_DEPTHS));

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.css.backgroundImage).toContain("#350136");
  });

  it("reads a plain colour shorthand as the background colour", () => {
    const extracted = extractPatternCss("style={{ background: \"#101014\" }}");

    expect(extracted.backgroundColor).toBe("#101014");
    expect(extracted.backgroundImage).toBeUndefined();
  });

  it("does not let the shorthand override an explicit longhand", () => {
    const extracted = extractPatternCss(
      ".x { background: #000; background-color: #101014; }",
    );

    expect(extracted.backgroundColor).toBe("#101014");
  });

  it("keeps every stop of a gradient written without quotes", () => {
    // The declaration reader used to stop at the first comma, truncating this
    // to `linear-gradient(red` — which then failed validation as unbalanced.
    const extracted = extractPatternCss(
      ".x { background: linear-gradient(90deg, red 0%, blue 100%); }",
    );

    expect(extracted.backgroundImage).toBe("linear-gradient(90deg, red 0%, blue 100%)");
    expect(validatePatternCss(extracted).ok).toBe(true);
  });

  it("drops the trailing comma of a JSX object entry", () => {
    const extracted = extractPatternCss("style={{ backgroundSize: 24px 24px,\n }}");

    expect(extracted.backgroundSize).toBe("24px 24px");
  });

  it("still refuses a dangerous shorthand", () => {
    const extracted = extractPatternCss("style={{ background: \"url(javascript:alert(1))\" }}");

    expect(validatePatternCss(extracted).css.backgroundImage).toBeUndefined();
  });
});
