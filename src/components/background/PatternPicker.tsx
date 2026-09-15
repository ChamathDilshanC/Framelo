"use client";

import { Check, Code2, Heart, Search, Trash2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  activeCategories,
  filterPatterns,
  resolvePattern,
} from "@/engine/background/patterns";
import { cn } from "@/lib/utils";
import { usePatternStore } from "@/store/pattern-store";
import type { PatternBackground } from "@/types/background";
import type {
  PatternCategory,
  PatternColors,
  PatternDefinition,
  SafePatternCss,
  SavedPattern,
} from "@/types/pattern";

interface PatternPickerProps {
  /** The pattern currently applied, so the grid can mark it. */
  current: PatternBackground | null;
  onApply: (pattern: PatternBackground) => void;
  /** Jump to the custom editor. Shown as the last card in the grid. */
  onWriteYourOwn?: () => void;
}

/**
 * Browse, retint and apply background patterns.
 *
 * Every card is rendered from the same `SafePatternCss` the canvas will use, so
 * what the grid shows is exactly what gets applied — there is no separate
 * preview implementation to fall out of step.
 */
export function PatternPicker({ current, onApply, onWriteYourOwn }: PatternPickerProps) {
  const [category, setCategory] = React.useState<PatternCategory>("all");
  const [query, setQuery] = React.useState("");
  const [colors, setColors] = React.useState<PatternColors | null>(null);

  const favorites = usePatternStore((state) => state.favorites);
  const saved = usePatternStore((state) => state.saved);
  const toggleFavorite = usePatternStore((state) => state.toggleFavorite);
  const removeSaved = usePatternStore((state) => state.removeSaved);

  const results = React.useMemo(() => filterPatterns(category, query), [category, query]);

  const savedResults = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    return saved.filter(
      (entry) =>
        (category === "all" || category === "custom" || entry.category === category) &&
        (!needle || entry.name.toLowerCase().includes(needle)),
    );
  }, [saved, category, query]);

  // Favourites float to the top of whatever is showing.
  const ordered = React.useMemo(() => {
    const isFavorite = (pattern: PatternDefinition) => favorites.includes(pattern.id);
    return [...results].sort((a, b) => Number(isFavorite(b)) - Number(isFavorite(a)));
  }, [results, favorites]);

  function applyDefinition(pattern: PatternDefinition) {
    const resolved = colors ?? pattern.defaultColors;
    onApply({
      type: "pattern",
      patternId: pattern.id,
      name: pattern.name,
      css: resolvePattern(pattern, resolved),
      colors: resolved,
      opacity: current?.opacity ?? 1,
    });
  }

  function applySaved(pattern: SavedPattern) {
    onApply({
      type: "pattern",
      patternId: null,
      name: pattern.name,
      css: pattern.css,
      opacity: pattern.opacity,
    });
  }

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-ink-subtle" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search patterns…"
          aria-label="Search patterns"
          className="h-7 w-full rounded-sm border border-line bg-surface-raised pr-2 pl-7 text-[11px] text-ink placeholder:text-ink-subtle focus:border-accent/60 focus:outline-none"
        />
      </div>

      <div className="-mx-0.5 flex gap-1 overflow-x-auto px-0.5 pb-1">
        {[...activeCategories(), ...(saved.length ? (["custom"] as const) : [])].map((entry) => (
          <button
            key={entry}
            type="button"
            aria-pressed={category === entry}
            onClick={() => setCategory(entry)}
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] capitalize transition-colors duration-150",
              category === entry
                ? "border-accent/60 bg-accent-soft text-ink"
                : "border-line bg-surface-raised text-ink-subtle hover:border-line-strong hover:text-ink-muted",
            )}
          >
            {entry}
          </button>
        ))}
      </div>

      <ColorControls
        colors={colors}
        onChange={setColors}
        onReset={() => setColors(null)}
      />

      <div className="grid grid-cols-2 gap-1.5">
        {savedResults.map((pattern) => (
          <SavedCard
            key={pattern.id}
            pattern={pattern}
            active={current?.patternId === null && current.name === pattern.name}
            onApply={() => applySaved(pattern)}
            onRemove={() => removeSaved(pattern.id)}
          />
        ))}

        {ordered.map((pattern) => (
          <PatternCard
            key={pattern.id}
            pattern={pattern}
            css={resolvePattern(pattern, colors ?? pattern.defaultColors)}
            active={current?.patternId === pattern.id}
            favorite={favorites.includes(pattern.id)}
            onApply={() => applyDefinition(pattern)}
            onToggleFavorite={() => toggleFavorite(pattern.id)}
          />
        ))}

        {/*
          Sits in the grid rather than only behind the "Custom" tab: someone
          scrolling patterns looking for the one they already have in mind will
          never think to check a tab above the thing they are scrolling.
        */}
        {onWriteYourOwn ? <WriteYourOwnCard onSelect={onWriteYourOwn} /> : null}
      </div>

      {ordered.length === 0 && savedResults.length === 0 ? (
        <p className="px-0.5 py-4 text-center text-[11px] text-ink-subtle">
          No patterns match “{query}”.
        </p>
      ) : null}
    </div>
  );
}

function ColorControls({
  colors,
  onChange,
  onReset,
}: {
  colors: PatternColors | null;
  onChange: (colors: PatternColors) => void;
  onReset: () => void;
}) {
  const active = colors ?? { base: "#0f1014", accent: "#7c6cff" };

  return (
    <div className="flex items-center gap-1.5 rounded-sm border border-line bg-surface-raised/60 p-1.5">
      <span className="text-[10px] text-ink-subtle">Tint</span>
      <ColorDot
        label="Base colour"
        value={active.base}
        onChange={(base) => onChange({ ...active, base })}
      />
      <ColorDot
        label="Accent colour"
        value={active.accent}
        onChange={(accent) => onChange({ ...active, accent })}
      />
      {colors ? (
        <Button size="xs" variant="ghost" className="ml-auto" onClick={onReset}>
          Reset
        </Button>
      ) : (
        <span className="ml-auto text-[10px] text-ink-subtle/70">Using each pattern&apos;s own</span>
      )}
    </div>
  );
}

function ColorDot({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className="relative h-5 w-5 shrink-0 cursor-pointer rounded-full border border-line-strong"
      style={{ backgroundColor: value }}
      title={label}
    >
      <input
        type="color"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}

/** The way into the custom editor, shaped like the cards around it. */
function WriteYourOwnCard({ onSelect }: { onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title="Paste or write your own CSS background"
      className="group flex flex-col overflow-hidden rounded-sm border border-dashed border-line transition-colors duration-150 hover:border-accent/60"
    >
      <span className="flex h-14 w-full items-center justify-center bg-surface-raised/60">
        <Code2 className="h-4 w-4 text-ink-subtle transition-colors group-hover:text-accent" />
      </span>
      <span className="px-1.5 py-1 text-left text-[10px] text-ink-muted">Write your own</span>
    </button>
  );
}

function PatternCard({
  pattern,
  css,
  active,
  favorite,
  onApply,
  onToggleFavorite,
}: {
  pattern: PatternDefinition;
  css: SafePatternCss;
  active: boolean;
  favorite: boolean;
  onApply: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-sm border transition-colors duration-150",
        active ? "border-accent/70" : "border-line hover:border-line-strong",
      )}
    >
      <button
        type="button"
        onClick={onApply}
        title={pattern.description ?? pattern.name}
        aria-pressed={active}
        className="block w-full text-left"
      >
        {/* The preview is the applied CSS, verbatim. */}
        <span className="block h-14 w-full" style={css} />
        <span className="flex items-center gap-1 px-1.5 py-1 text-[10px] text-ink-muted">
          <span className="min-w-0 flex-1 truncate">{pattern.name}</span>
          {active ? <Check className="h-2.5 w-2.5 shrink-0 text-accent" /> : null}
        </span>
      </button>

      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={favorite ? `Unfavourite ${pattern.name}` : `Favourite ${pattern.name}`}
        aria-pressed={favorite}
        className={cn(
          "absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-opacity",
          favorite ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        )}
      >
        <Heart className={cn("h-2.5 w-2.5", favorite ? "fill-accent text-accent" : "text-white")} />
      </button>
    </div>
  );
}

function SavedCard({
  pattern,
  active,
  onApply,
  onRemove,
}: {
  pattern: SavedPattern;
  active: boolean;
  onApply: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-sm border transition-colors duration-150",
        active ? "border-accent/70" : "border-line hover:border-line-strong",
      )}
    >
      <button type="button" onClick={onApply} className="block w-full text-left">
        <span className="block h-14 w-full" style={{ ...pattern.css, opacity: pattern.opacity }} />
        <span className="flex items-center gap-1 px-1.5 py-1 text-[10px] text-ink-muted">
          <span className="min-w-0 flex-1 truncate">{pattern.name}</span>
          <span className="shrink-0 text-accent">Mine</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Delete ${pattern.name}`}
        className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/40 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Trash2 className="h-2.5 w-2.5 text-white" />
      </button>
    </div>
  );
}
