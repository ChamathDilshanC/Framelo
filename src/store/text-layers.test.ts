import { beforeEach, describe, expect, it } from "vitest";

import { evaluateTextProperties, evaluateTransform, findTrack } from "@/engine/animation/evaluate";
import { getMotionPreset } from "@/engine/motion/motion-presets";
import { resolveTextMetadata, TEXT_PLACEHOLDER } from "@/engine/text/text-types";
import { createProject, createTextLayer } from "@/lib/project-factory";
import { parseProject } from "@/lib/validation/project-schema";
import { useProjectStore } from "@/store/project-store";
import type { Layer } from "@/types/layer";

function store() {
  return useProjectStore.getState();
}

function layers(): Layer[] {
  return store().project?.layers ?? [];
}

function textLayer(): Layer {
  const found = layers().find((layer) => layer.type === "text");
  if (!found) throw new Error("No text layer in project");
  return found;
}

function style() {
  return resolveTextMetadata(textLayer().metadata);
}

beforeEach(() => {
  useProjectStore.getState().loadProject(createProject("Text test"));
});

// ---------------------------------------------------------------------------

describe("creating text", () => {
  it("adds a text layer alongside the device", () => {
    store().addTextLayer();
    expect(layers()).toHaveLength(2);
    expect(layers()[1].type).toBe("text");
  });

  it("starts empty rather than storing the placeholder", () => {
    // The placeholder is drawn, never saved: someone who adds a layer and
    // clicks away should not find "Type something..." in their project.
    store().addTextLayer();
    expect(style().content).toBe("");
    expect(JSON.stringify(store().project)).not.toContain(TEXT_PLACEHOLDER);
  });

  it("sits in front of the device so new text is visible", () => {
    store().addTextLayer();
    expect(textLayer().transform.z).toBeGreaterThan(0);
  });

  it("carries overrides from the text tool, such as a dragged box width", () => {
    store().addTextLayer({ boxMode: "fixed", boxWidth: 420 });
    expect(style().boxMode).toBe("fixed");
    expect(style().boxWidth).toBe(420);
  });
});

describe("editing text", () => {
  beforeEach(() => {
    store().addTextLayer();
  });

  it("writes the content", () => {
    store().setTextContent(textLayer().id, "Hello Framelo");
    expect(style().content).toBe("Hello Framelo");
  });

  it("names the layer after its words", () => {
    store().setTextContent(textLayer().id, "Build something amazing");
    expect(textLayer().name).toBe("Build something amazing");
  });

  it("keeps a name the user typed, even when the words change", () => {
    store().renameLayer(textLayer().id, "Hero Headline");
    store().setTextContent(textLayer().id, "Completely different words");
    expect(textLayer().name).toBe("Hero Headline");
  });

  it("keeps unicode and emoji exactly as typed", () => {
    const content = "ඔබේ App එක · 🚀 · تطبيقك";
    store().setTextContent(textLayer().id, content);
    expect(style().content).toBe(content);
  });

  it("does not create one undo step per character", () => {
    // Typing is coalesced; one word must not cost thirteen undos (§45).
    const before = useProjectStore.getState().past.length;
    for (const text of ["H", "He", "Hel", "Hell", "Hello"]) {
      store().setTextContent(textLayer().id, text);
    }
    const added = useProjectStore.getState().past.length - before;
    expect(added).toBeLessThanOrEqual(1);
    expect(style().content).toBe("Hello");
  });

  it("updates typography", () => {
    store().updateTextMetadata(textLayer().id, { fontId: "poppins", fontWeight: 700 });
    expect(style().fontId).toBe("poppins");
    expect(style().fontWeight).toBe(700);
  });
});

describe("layer operations", () => {
  beforeEach(() => {
    store().addTextLayer();
    store().setTextContent(textLayer().id, "Headline");
  });

  it("duplicates with the same style and a new id", () => {
    store().updateTextMetadata(textLayer().id, { fontId: "outfit", fontSize: 90 });
    const original = textLayer();
    const cloneId = store().duplicateLayer(original.id);

    const clone = layers().find((layer) => layer.id === cloneId);
    expect(clone).toBeDefined();
    expect(clone!.id).not.toBe(original.id);
    expect(resolveTextMetadata(clone!.metadata).fontId).toBe("outfit");
    expect(resolveTextMetadata(clone!.metadata).fontSize).toBe(90);
  });

  it("offsets the duplicate so it is not hidden behind the original", () => {
    const original = textLayer();
    const cloneId = store().duplicateLayer(original.id);
    const clone = layers().find((layer) => layer.id === cloneId)!;
    expect(clone.transform.x).not.toBe(original.transform.x);
  });

  it("copies the animation with fresh keyframe ids", () => {
    const id = textLayer().id;
    store().addKeyframe(id, "y", 0, 0);
    store().addKeyframe(id, "y", 1, 2);

    const cloneId = store().duplicateLayer(id);
    const clone = layers().find((layer) => layer.id === cloneId)!;

    // Re-read: the store is immutable, so the layer captured before the
    // keyframes were added is a different object from the one that has them.
    const source = findTrack(layers().find((layer) => layer.id === id)!.animations, "y")!;
    const copy = findTrack(clone.animations, "y")!;
    expect(copy.keyframes).toHaveLength(source.keyframes.length);
    expect(copy.keyframes[0].id).not.toBe(source.keyframes[0].id);
    expect(copy.keyframes[0].value).toBe(source.keyframes[0].value);
  });

  it("hides and locks", () => {
    store().setLayerVisible(textLayer().id, false);
    expect(textLayer().visible).toBe(false);
    store().setLayerLocked(textLayer().id, true);
    expect(textLayer().locked).toBe(true);
  });

  it("deletes", () => {
    store().removeLayer(textLayer().id);
    expect(layers().some((layer) => layer.type === "text")).toBe(false);
  });
});

describe("layer order", () => {
  beforeEach(() => {
    store().addTextLayer();
    store().setTextContent(layers()[1].id, "One");
    store().addTextLayer();
    store().setTextContent(layers()[2].id, "Two");
  });

  it("sends a layer to the back", () => {
    const id = layers()[2].id;
    store().reorderLayer(id, "back");
    expect(layers()[0].id).toBe(id);
  });

  it("brings a layer to the front", () => {
    const id = layers()[0].id;
    store().reorderLayer(id, "front");
    expect(layers()[layers().length - 1].id).toBe(id);
  });

  it("steps one position at a time", () => {
    const id = layers()[2].id;
    store().reorderLayer(id, "backward");
    expect(layers()[1].id).toBe(id);
    store().reorderLayer(id, "forward");
    expect(layers()[2].id).toBe(id);
  });

  it("does nothing at the ends", () => {
    const first = layers()[0].id;
    store().reorderLayer(first, "backward");
    expect(layers()[0].id).toBe(first);
  });

  it("clamps an out-of-range move rather than losing the layer", () => {
    const id = layers()[1].id;
    store().moveLayer(id, 99);
    expect(layers()).toHaveLength(3);
    expect(layers()[layers().length - 1].id).toBe(id);
  });
});

// ---------------------------------------------------------------------------

describe("text animation uses the existing keyframe engine", () => {
  beforeEach(() => {
    store().addTextLayer();
    store().setTextContent(textLayer().id, "Animated");
  });

  it("animates the transform like any other layer", () => {
    const id = textLayer().id;
    store().addKeyframe(id, "y", 0, -1);
    store().addKeyframe(id, "y", 2, 0);

    expect(evaluateTransform(textLayer(), 0).y).toBe(-1);
    expect(evaluateTransform(textLayer(), 2).y).toBe(0);
    expect(evaluateTransform(textLayer(), 1).y).toBeGreaterThan(-1);
  });

  it("animates typography without touching the transform", () => {
    const id = textLayer().id;
    store().addKeyframe(id, "letterSpacing", 0, 20);
    store().addKeyframe(id, "letterSpacing", 1, 0);

    const at0 = evaluateTextProperties(textLayer().animations, 0);
    const at1 = evaluateTextProperties(textLayer().animations, 1);
    expect(at0.letterSpacing).toBe(20);
    expect(at1.letterSpacing).toBe(0);

    // The crucial part: a typography track must never leak into the matrix.
    const transform = evaluateTransform(textLayer(), 0);
    expect(transform.x).toBe(textLayer().transform.x);
    expect(Number.isFinite(transform.scaleX)).toBe(true);
  });

  it("keyframes font size from the stored style, not from the transform", () => {
    const id = textLayer().id;
    store().updateTextMetadata(id, { fontSize: 72 });
    store().addKeyframe(id, "fontSize", 0);
    expect(findTrack(textLayer().animations, "fontSize")!.keyframes[0].value).toBe(72);
  });

  it("writes a static typography edit onto the style", () => {
    store().setTransformValue(textLayer().id, "fontSize", 120, { time: 0 });
    expect(style().fontSize).toBe(120);
  });

  it("never stores a static reveal, which only means anything as a curve", () => {
    store().setTransformValue(textLayer().id, "reveal", 0.5, { time: 0 });
    expect((textLayer().metadata as Record<string, unknown>).reveal).toBeUndefined();
  });
});

describe("text motion presets", () => {
  beforeEach(() => {
    store().addTextLayer();
    store().setTextContent(textLayer().id, "Launch your app today");
  });

  it("applies as real keyframes", () => {
    const preset = getMotionPreset("text-slide-up")!;
    const result = store().applyMotionPreset(textLayer().id, preset, {});

    expect(result.applied).toBe(true);
    expect(findTrack(textLayer().animations, "y")!.keyframes.length).toBeGreaterThan(1);
    expect(findTrack(textLayer().animations, "opacity")!.keyframes.length).toBeGreaterThan(1);
  });

  it("is a single undo", () => {
    const before = useProjectStore.getState().past.length;
    store().applyMotionPreset(textLayer().id, getMotionPreset("text-cinematic")!, {});
    expect(useProjectStore.getState().past.length - before).toBe(1);

    store().undo();
    expect(textLayer().animations).toHaveLength(0);
  });

  it("sets the reveal mode a typewriter needs, in the same step", () => {
    store().applyMotionPreset(textLayer().id, getMotionPreset("text-typewriter")!, {});
    expect(style().revealMode).toBe("characters");
    expect(findTrack(textLayer().animations, "reveal")).toBeDefined();

    // Undo takes the mode back with the keyframes — not half of each.
    store().undo();
    expect(style().revealMode).toBe("none");
  });

  it("reveals by word for Word Reveal", () => {
    store().applyMotionPreset(textLayer().id, getMotionPreset("text-word-reveal")!, {});
    expect(style().revealMode).toBe("words");
  });

  it("produces a real blur curve rather than a stand-in", () => {
    store().applyMotionPreset(textLayer().id, getMotionPreset("text-blur-reveal")!, {});
    const track = findTrack(textLayer().animations, "blur");
    expect(track).toBeDefined();
    expect(track!.keyframes[0].value).toBeGreaterThan(0);
    expect(track!.keyframes[track!.keyframes.length - 1].value).toBe(0);
  });

  it("stacks with a preset that owns different properties", () => {
    // Tracking Reveal owns letterSpacing; Slide Up owns y. Applying both
    // should give both, which is what makes presets composable (§50).
    store().applyMotionPreset(textLayer().id, getMotionPreset("text-slide-up")!, {});
    store().applyMotionPreset(textLayer().id, getMotionPreset("text-tracking-reveal")!, {});

    expect(findTrack(textLayer().animations, "y")).toBeDefined();
    expect(findTrack(textLayer().animations, "letterSpacing")).toBeDefined();
  });

  it("leaves the content and the typeface alone", () => {
    const before = style();
    store().applyMotionPreset(textLayer().id, getMotionPreset("text-pop-in")!, {});
    expect(style().content).toBe(before.content);
    expect(style().fontId).toBe(before.fontId);
    expect(style().fontSize).toBe(before.fontSize);
  });
});

// ---------------------------------------------------------------------------

describe("serialization", () => {
  it("round-trips a styled, animated text layer", () => {
    store().addTextLayer();
    const id = textLayer().id;
    store().setTextContent(id, "ඔබේ App එක · 🚀");
    store().updateTextMetadata(id, {
      fontId: "poppins",
      fontWeight: 700,
      fontSize: 88,
      textAlign: "left",
      letterSpacing: 4,
      direction: "rtl",
      fill: {
        type: "gradient",
        color: "#ffffff",
        gradient: { from: "#ff0000", to: "#0000ff", angle: 45 },
      },
    });
    store().applyMotionPreset(id, getMotionPreset("text-typewriter")!, {});

    // Exactly what save/share/reload does: JSON out, parse back in.
    const json = JSON.parse(JSON.stringify(store().project));
    const parsed = parseProject(json);

    expect(parsed.ok).toBe(true);
    const reloaded = parsed.project!.layers.find((layer) => layer.type === "text")!;
    const reloadedStyle = resolveTextMetadata(reloaded.metadata);

    expect(reloadedStyle.content).toBe("ඔබේ App එක · 🚀");
    expect(reloadedStyle.fontId).toBe("poppins");
    expect(reloadedStyle.fontSize).toBe(88);
    expect(reloadedStyle.textAlign).toBe("left");
    expect(reloadedStyle.direction).toBe("rtl");
    expect(reloadedStyle.fill.gradient.angle).toBe(45);
    expect(reloadedStyle.revealMode).toBe("characters");
    expect(findTrack(reloaded.animations, "reveal")).toBeDefined();
    expect(reloaded.transform).toEqual(textLayer().transform);
  });

  it("opens a project that has no text layers, unchanged", () => {
    // Backward compatibility: every project made before text existed (§73).
    const project = createProject("Old project");
    const parsed = parseProject(JSON.parse(JSON.stringify(project)));

    expect(parsed.ok).toBe(true);
    expect(parsed.project!.layers).toHaveLength(1);
    expect(parsed.project!.layers[0].type).toBe("device");
    expect(parsed.project!.layers[0].metadata).toEqual(project.layers[0].metadata);
  });

  it("repairs a text layer carrying impossible values", () => {
    const project = createProject("Hostile");
    project.layers.push({
      ...createTextLayer(),
      metadata: {
        content: "ok",
        fontSize: Number.NaN,
        lineHeight: 0,
        fontWeight: 12345,
        textAlign: "diagonal",
        fill: { type: "gradient", color: "url(evil)", gradient: { from: "#fff", to: "#000", angle: 0 } },
      } as never,
    });

    const parsed = parseProject(JSON.parse(JSON.stringify(project)));
    expect(parsed.ok).toBe(true);

    const text = parsed.project!.layers.find((layer) => layer.type === "text")!;
    const repaired = resolveTextMetadata(text.metadata);
    expect(Number.isFinite(repaired.fontSize)).toBe(true);
    expect(repaired.lineHeight).toBeGreaterThan(0);
    expect(repaired.fontWeight).toBeLessThanOrEqual(900);
    expect(repaired.textAlign).toBe("center");
    expect(repaired.fill.color).not.toContain("url(");
  });

  it("does not disturb the device layer", () => {
    store().addTextLayer();
    const deviceBefore = JSON.parse(JSON.stringify(layers()[0]));

    const parsed = parseProject(JSON.parse(JSON.stringify(store().project)));
    const deviceAfter = parsed.project!.layers.find((layer) => layer.type === "device");

    expect(deviceAfter).toEqual(deviceBefore);
  });
});

describe("undo and redo", () => {
  it("undoes creating a text layer in one step", () => {
    store().addTextLayer();
    expect(layers()).toHaveLength(2);
    store().undo();
    expect(layers()).toHaveLength(1);
    store().redo();
    expect(layers()).toHaveLength(2);
  });

  it("undoes a font change in one step", () => {
    store().addTextLayer();
    store().updateTextMetadata(textLayer().id, { fontId: "merriweather" });
    store().undo();
    expect(style().fontId).toBe("inter");
  });

  it("undoes a reorder", () => {
    store().addTextLayer();
    const id = textLayer().id;
    store().reorderLayer(id, "back");
    expect(layers()[0].id).toBe(id);
    store().undo();
    expect(layers()[0].id).not.toBe(id);
  });

  it("undoes a delete", () => {
    store().addTextLayer();
    store().setTextContent(textLayer().id, "Bring me back");
    store().removeLayer(textLayer().id);
    expect(layers()).toHaveLength(1);
    store().undo();
    expect(style().content).toBe("Bring me back");
  });
});
