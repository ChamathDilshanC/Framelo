import { describe, expect, it } from "vitest";

import { CDN_COVERAGE_FONTS, FONT_SOURCES } from "@/engine/text/font-loaders";
import {
  FONT_GROUPS,
  FONT_REGISTRY,
  fontStackFor,
  fontsRequiredFor,
  getFont,
  nearestWeight,
  searchFonts,
} from "@/engine/text/text-fonts";
import { PROJECT_TEMPLATES } from "@/engine/templates/project-templates";
import { DEFAULT_TEXT_STYLE, resolveTextMetadata } from "@/engine/text/text-types";
import { createProject, createTextLayer } from "@/lib/project-factory";
import { parseProject } from "@/lib/validation/project-schema";

/**
 * The font registry's contract.
 *
 * Rule one of the text system is "never offer a font that will not render",
 * and moving from a CDN to self-hosted packages is exactly the change that can
 * break it quietly: a family missing from the loader table still appears in the
 * picker, still has a name, and simply draws in the system fallback. Nobody
 * notices until an export.
 *
 * So the load-bearing test here is the first one — every registered font has a
 * real source — and it is the reason the loader table is a table rather than a
 * computed path.
 */

describe("every registered font can actually be loaded", () => {
  it("has a source for every family in the picker", () => {
    for (const font of FONT_REGISTRY) {
      const source = FONT_SOURCES[font.id];
      expect(source, `${font.id} is offered but has no stylesheet to load`).toBeDefined();
      expect(source.normal.length, `${font.id} has no upright faces`).toBeGreaterThan(0);
    }
  });

  it("declares the same CSS family name the package does", () => {
    // The variable packages call themselves "Inter Variable", not "Inter". A
    // registry that said "Inter" would resolve to nothing and fall through to
    // the system stack — the exact silent failure this suite exists for.
    for (const font of FONT_REGISTRY) {
      expect(font.family, font.id).toBe(FONT_SOURCES[font.id].family);
    }
  });

  it("only claims a real italic when the package ships one", () => {
    for (const font of FONT_REGISTRY) {
      const hasItalicFiles = FONT_SOURCES[font.id].italic.length > 0;
      expect(font.italic, `${font.id} claims italic: ${font.italic}`).toBe(hasItalicFiles);
    }
  });

  it("gives every font a group the picker knows about", () => {
    for (const font of FONT_REGISTRY) {
      expect(FONT_GROUPS as readonly string[]).toContain(font.group);
    }
  });

  it("gives every font at least one weight and a note", () => {
    for (const font of FONT_REGISTRY) {
      expect(font.weights.length, font.id).toBeGreaterThan(0);
      expect(font.weights.every((weight) => weight >= 100 && weight <= 900), font.id).toBe(true);
      expect(font.note.length, font.id).toBeGreaterThan(10);
    }
  });

  it("has no duplicate ids or names", () => {
    const ids = FONT_REGISTRY.map((font) => font.id);
    const names = FONT_REGISTRY.map((font) => font.name.toLowerCase());
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it("covers every category the brief asks for", () => {
    const groups = new Set(FONT_REGISTRY.map((font) => font.group));
    expect(groups.has("sans")).toBe(true);
    expect(groups.has("display")).toBe(true);
    expect(groups.has("serif")).toBe(true);
    expect(groups.has("mono")).toBe(true);
  });

  it("is mostly variable fonts", () => {
    const variable = FONT_REGISTRY.filter((font) => font.variable);
    expect(variable.length).toBeGreaterThan(FONT_REGISTRY.length / 2);
  });
});

describe("the remote font boundary", () => {
  it("keeps only the three CJK coverage families on a CDN", () => {
    // The one deliberate exception, named so it cannot grow by accident: a
    // fourth entry here means a font quietly went back to being a network
    // dependency of every shared link.
    expect(Object.keys(CDN_COVERAGE_FONTS).sort()).toEqual(["noto-jp", "noto-kr", "noto-sc"]);
  });

  it("never puts a picker font on the CDN", () => {
    for (const font of FONT_REGISTRY) {
      expect(CDN_COVERAGE_FONTS[font.id], `${font.id} is remote`).toBeUndefined();
    }
  });

  it("self-hosts the Indic, Arabic, Hebrew and Thai coverage", () => {
    for (const id of [
      "noto-sinhala",
      "noto-tamil",
      "noto-devanagari",
      "noto-bengali",
      "noto-arabic",
      "noto-hebrew",
      "noto-thai",
    ]) {
      expect(FONT_SOURCES[id], `${id} should be self-hosted`).toBeDefined();
    }
  });
});

describe("resolving a font for some text", () => {
  it("puts the chosen family first and a system stack last", () => {
    const stack = fontStackFor("inter", "Hello");
    expect(stack.startsWith('"Inter Variable"')).toBe(true);
    expect(stack).toContain("system-ui");
  });

  it("adds a coverage family only for a script the choice does not cover", () => {
    expect(fontStackFor("inter", "Hello")).not.toContain("Sinhala");
    expect(fontStackFor("inter", "ආයුබෝවන්")).toContain("Noto Sans Sinhala");
    // Poppins covers Devanagari itself, so it needs no help.
    expect(fontStackFor("poppins", "नमस्ते")).not.toContain("Noto Sans Devanagari");
  });

  it("lists every face that has to load before the text is drawn", () => {
    const required = fontsRequiredFor("inter", "Hello ආයුබෝවන්");
    expect(required.map((font) => font.id)).toEqual(["inter", "noto-sinhala"]);
  });

  it("snaps a weight onto one the family has", () => {
    // Bebas Neue is one weight. Asking for Black must not render a faked bold.
    expect(nearestWeight(getFont("bebas-neue"), 900)).toBe(400);
    expect(nearestWeight(getFont("inter"), 640)).toBe(600);
  });

  it("falls back to a real font rather than throwing on an unknown id", () => {
    // A project from a build that had a font this one does not must still open.
    expect(getFont("some-font-that-never-existed").id).toBe(FONT_REGISTRY[0].id);
  });
});

describe("searching the picker", () => {
  it("finds a family by name", () => {
    expect(searchFonts("jakarta").map((font) => font.id)).toContain("plus-jakarta-sans");
  });

  it("finds families by what they are for", () => {
    expect(searchFonts("code").map((font) => font.id)).toContain("jetbrains-mono");
    expect(searchFonts("luxury").map((font) => font.id)).toContain("playfair-display");
  });

  it("respects the category filter", () => {
    const mono = searchFonts("", "mono");
    expect(mono.length).toBeGreaterThan(1);
    expect(mono.every((font) => font.group === "mono")).toBe(true);
  });

  it("returns everything for an empty query", () => {
    expect(searchFonts("")).toHaveLength(FONT_REGISTRY.length);
  });
});

describe("a font choice persists", () => {
  it("survives a save and reload", () => {
    const project = createProject("Font test");
    const layer = createTextLayer({ content: "Typography", fontId: "syne", fontWeight: 700 });
    project.layers.push(layer);

    const round = parseProject(JSON.parse(JSON.stringify(project)));
    expect(round.ok).toBe(true);

    const restored = resolveTextMetadata(round.project!.layers[1].metadata);
    expect(restored.fontId).toBe("syne");
    expect(restored.fontWeight).toBe(700);
  });

  it("stores the id, not the CSS family name", () => {
    // The distinction that made the Fontsource migration safe: moving a family
    // from static to variable changes `family` and leaves `id` alone, so no
    // existing project is rewritten.
    const layer = createTextLayer({ content: "x", fontId: "inter" });
    expect(JSON.stringify(layer.metadata)).toContain('"inter"');
    expect(JSON.stringify(layer.metadata)).not.toContain("Inter Variable");
  });

  it("keeps every font the template catalogue references", () => {
    // Templates name typefaces. Retiring one without noticing would restyle
    // every composition built from that template.
    const ids = new Set(FONT_REGISTRY.map((font) => font.id));

    for (const template of PROJECT_TEMPLATES) {
      for (const text of template.textLayers ?? []) {
        const fontId = resolveTextMetadata(text.style).fontId;
        expect(ids.has(fontId), `${template.id} uses missing font ${fontId}`).toBe(true);
      }
    }
  });

  it("keeps the default font", () => {
    expect(FONT_REGISTRY.some((font) => font.id === DEFAULT_TEXT_STYLE.fontId)).toBe(true);
  });
});
