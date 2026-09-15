"use client";

import { Plus, Type } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import { loadFontsFor } from "@/engine/text/text-fonts";
import { TEXT_STYLE_PRESETS, type TextStylePreset } from "@/engine/text/text-style-presets";
import { resolveTextMetadata } from "@/engine/text/text-types";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";

/**
 * The Text tab.
 *
 * Adding text and choosing how it looks. Style presets live here rather than
 * in the inspector because they are a starting point you pick once, while the
 * inspector is where you adjust what you picked.
 */
export function TextToolPanel() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const layers = useProjectStore((state) => state.project?.layers);

  const selected = layers?.find((layer) => layer.id === selectedLayerId) ?? null;
  const textSelected = selected?.type === "text";

  return (
    <div className="space-y-3 p-2">
      <Button
        size="sm"
        variant={activeTool === "text" ? "primary" : "secondary"}
        className="w-full"
        onClick={() => setActiveTool(activeTool === "text" ? "select" : "text")}
      >
        <Type className="h-3 w-3" />
        {activeTool === "text" ? "Click the canvas…" : "Add text"}
      </Button>

      <p className="px-0.5 text-[10px] leading-relaxed text-ink-subtle">
        Press <kbd className="rounded-xs border border-line px-1">T</kbd>, then click the canvas to
        place text, or drag to draw a text box that wraps.
      </p>

      <section className="space-y-1.5">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="panel-label">Styles</h3>
          {textSelected ? null : (
            <span className="text-[10px] text-ink-subtle">select text</span>
          )}
        </div>

        {textSelected && selected ? (
          <ul className="space-y-1">
            {TEXT_STYLE_PRESETS.map((preset) => (
              <StyleCard key={preset.id} preset={preset} layerId={selected.id} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Type}
            title="No text selected"
            description="Add a text layer, or select one, to apply a style."
            action={
              <Button size="xs" variant="secondary" onClick={() => setActiveTool("text")}>
                <Plus className="h-3 w-3" />
                Add text
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}

function StyleCard({ preset, layerId }: { preset: TextStylePreset; layerId: string }) {
  const updateTextMetadata = useProjectStore((state) => state.updateTextMetadata);
  const layer = useProjectStore((state) =>
    state.project?.layers.find((entry) => entry.id === layerId),
  );

  const style = layer ? resolveTextMetadata(layer.metadata) : null;
  const active = style ? matchesPreset(style.fontId, preset) : false;

  function apply() {
    // One commit, so a style preset is one undo (§45). Content, transform and
    // animation are untouched by construction — the preset only carries
    // typographic fields, which is what lets a style and a motion preset be
    // combined without either clobbering the other (§50).
    updateTextMetadata(layerId, preset.style, { coalesceKey: undefined });

    const fontId = preset.style.fontId;
    if (fontId && style) {
      void loadFontsFor(
        fontId,
        style.content,
        preset.style.fontWeight ?? style.fontWeight,
        (preset.style.fontStyle ?? style.fontStyle) === "italic",
      );
    }

    notify.success(`${preset.name} applied`, "Typography only — animation is unchanged.");
  }

  return (
    <li>
      <button
        type="button"
        onClick={apply}
        className={cn(
          "w-full rounded-sm border px-2 py-1.5 text-left transition-colors",
          active
            ? "border-accent/50 bg-surface-active"
            : "border-line bg-surface-raised hover:border-line-strong hover:bg-surface-hover",
        )}
      >
        <span className="block truncate text-[12px] text-ink">{preset.name}</span>
        <span className="mt-0.5 block truncate text-[10px] text-ink-subtle">
          {preset.description}
        </span>
      </button>
    </li>
  );
}

function matchesPreset(fontId: string, preset: TextStylePreset): boolean {
  return preset.style.fontId === fontId;
}
