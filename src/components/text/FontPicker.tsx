"use client";

import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Search } from "lucide-react";
import * as React from "react";

import {
  FONT_GROUPS,
  FONT_GROUP_LABELS,
  getFont,
  loadFontFace,
  nearestWeight,
  searchFonts,
  type FontDefinition,
  type FontGroup,
} from "@/engine/text/text-fonts";
import { cn } from "@/lib/utils";

/**
 * The font picker.
 *
 * A dropdown of family names is useless for choosing a typeface — the whole
 * decision is what the letters look like — so every row renders the user's own
 * text in the actual face. That is also the honest test of the loader: if a
 * family fails to arrive, its row visibly falls back, and the user sees that
 * before they commit to it rather than after they export.
 *
 * ## Why each row loads itself
 *
 * Twenty-one families loaded to draw a list would be exactly the eager loading
 * the font system is built to avoid, and on a slow connection it would be
 * megabytes to render a menu. So a row asks for its own face when it scrolls
 * into view, through an `IntersectionObserver`. Rows that are never looked at
 * are never downloaded.
 *
 * Preview text falls back to the family name when the layer is empty, because
 * a list of blank rows is not a picker.
 */

interface FontPickerProps {
  value: string;
  onChange: (fontId: string) => void;
  /** The layer's own words, so the preview is of the actual composition. */
  previewText: string;
  /** Rendered at the layer's weight, so a Light choice previews as Light. */
  weight: number;
  italic: boolean;
}

export function FontPicker({ value, onChange, previewText, weight, italic }: FontPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [group, setGroup] = React.useState<FontGroup | "all">("all");

  const selected = getFont(value);
  const results = React.useMemo(() => searchFonts(query, group), [query, group]);

  // The sample is trimmed to something that fits a 232px row. A headline of
  // sixty words would render one word per row and tell nobody anything.
  const sample = React.useMemo(() => {
    const trimmed = previewText.replace(/\s+/g, " ").trim();
    return trimmed.length > 0 ? trimmed.slice(0, 22) : null;
  }, [previewText]);

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Font family"
          className="flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-xs border border-line bg-surface-raised px-1.5 text-left text-[11px] text-ink transition-colors hover:border-line-strong focus:border-accent/60 focus:outline-none"
        >
          <span className="min-w-0 flex-1 truncate">{selected.name}</span>
          {selected.variable ? (
            <span className="shrink-0 rounded-[2px] bg-accent-soft px-1 text-[9px] text-accent">
              VF
            </span>
          ) : null}
          <ChevronDown className="h-3 w-3 shrink-0 text-ink-subtle" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="animate-fade-up z-[80] w-[272px] rounded-lg border border-line-strong bg-surface p-2 shadow-2xl shadow-black/50"
        >
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-ink-subtle" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search typefaces…"
              aria-label="Search typefaces"
              className="h-7 w-full rounded-sm border border-line bg-surface-raised pr-2 pl-7 text-[11px] text-ink placeholder:text-ink-subtle focus:border-accent/60 focus:outline-none"
            />
          </div>

          <div className="-mx-0.5 mb-2 flex gap-1 overflow-x-auto px-0.5 pb-1">
            {(["all", ...FONT_GROUPS] as const).map((entry) => (
              <button
                key={entry}
                type="button"
                aria-pressed={group === entry}
                onClick={() => setGroup(entry)}
                className={cn(
                  "shrink-0 rounded-full border px-2 py-0.5 text-[10px] transition-colors duration-150",
                  group === entry
                    ? "border-accent/60 bg-accent-soft text-ink"
                    : "border-line bg-surface-raised text-ink-subtle hover:border-line-strong hover:text-ink-muted",
                )}
              >
                {entry === "all" ? "All" : FONT_GROUP_LABELS[entry]}
              </button>
            ))}
          </div>

          <div className="max-h-[320px] space-y-px overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-2 py-6 text-center text-[11px] text-ink-subtle">
                No typeface matches “{query}”.
              </p>
            ) : (
              results.map((font) => (
                <FontRow
                  key={font.id}
                  font={font}
                  sample={sample}
                  weight={weight}
                  italic={italic}
                  selected={font.id === value}
                  onSelect={() => {
                    onChange(font.id);
                    setOpen(false);
                    setQuery("");
                  }}
                />
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function FontRow({
  font,
  sample,
  weight,
  italic,
  selected,
  onSelect,
}: {
  font: FontDefinition;
  sample: string | null;
  weight: number;
  italic: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const ref = React.useRef<HTMLButtonElement>(null);
  const [ready, setReady] = React.useState(false);

  // The weight the row previews at is the one this family actually has, so a
  // 900 selection previews Bebas Neue at 400 rather than at a weight it does
  // not ship — which is the same rule the renderer follows.
  const faceWeight = nearestWeight(font, weight);
  const faceItalic = italic && font.italic;

  React.useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      // No observer (a test environment, an old browser): load rather than
      // leave the list permanently in the fallback face.
      void loadFontFace(font, faceWeight, faceItalic).then(setReady);
      return;
    }

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        void loadFontFace(font, faceWeight, faceItalic).then((ok) => {
          if (!cancelled) setReady(ok);
        });
      },
      { rootMargin: "120px" },
    );

    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [font, faceWeight, faceItalic]);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left transition-colors",
        selected ? "bg-surface-active" : "hover:bg-surface-hover",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-[11px] font-medium text-ink">{font.name}</span>
          <span className="shrink-0 text-[9px] text-ink-subtle">
            {FONT_GROUP_LABELS[font.group]}
          </span>
          {font.variable ? (
            <span className="shrink-0 text-[9px] text-accent/80">VF</span>
          ) : null}
        </div>

        <span
          className={cn(
            "mt-0.5 block truncate text-[15px] leading-tight transition-opacity duration-200",
            ready ? "text-ink-muted opacity-100" : "text-ink-subtle opacity-45",
          )}
          style={{
            fontFamily: `"${font.family}", system-ui, sans-serif`,
            fontWeight: faceWeight,
            fontStyle: faceItalic ? "italic" : "normal",
          }}
        >
          {sample ?? font.name}
        </span>
      </div>

      {selected ? <Check className="h-3 w-3 shrink-0 text-accent" /> : null}
    </button>
  );
}
