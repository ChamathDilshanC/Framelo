"use client";

import { ClipboardPaste, Save, ShieldCheck } from "lucide-react";
import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ColorField } from "@/components/ui/color-field";
import { PanelRow } from "@/components/ui/panel";
import { Slider } from "@/components/ui/slider";
import { extractPatternCss, validatePatternCss } from "@/engine/background/css-safety";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { usePatternStore } from "@/store/pattern-store";
import type { PatternBackground } from "@/types/background";
import type { SafePatternCss } from "@/types/pattern";

interface CustomPatternEditorProps {
  current: PatternBackground | null;
  onApply: (pattern: PatternBackground) => void;
}

/**
 * Hand-authored patterns.
 *
 * Users arrive with a snippet they copied from somewhere — often a whole JSX
 * block. Pasting it here extracts the four background properties Framelo
 * understands and discards everything else: the snippet is parsed as text, never
 * evaluated, never inserted as markup, and never turned into a component.
 *
 * Each field is validated against an allowlist of CSS functions and characters
 * before it can be applied, and again before it is saved.
 */
export function CustomPatternEditor({ current, onApply }: CustomPatternEditorProps) {
  const savePattern = usePatternStore((state) => state.savePattern);

  const [draft, setDraft] = React.useState<SafePatternCss>(
    () => (current?.patternId === null ? current.css : { backgroundColor: "#faf8f3" }),
  );
  const [opacity, setOpacity] = React.useState(current?.opacity ?? 1);
  const [name, setName] = React.useState(current?.patternId === null ? current.name : "");

  const validation = React.useMemo(() => validatePatternCss(draft), [draft]);
  const errorList = Object.entries(validation.errors).filter(([, message]) => Boolean(message));

  function set<K extends keyof SafePatternCss>(key: K, value: string) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  function apply() {
    onApply({
      type: "pattern",
      patternId: null,
      name: name.trim() || "Custom pattern",
      css: validation.css,
      opacity,
    });
  }

  async function handleSave() {
    const saved = await savePattern({
      name: name.trim() || "Custom pattern",
      css: validation.css,
      opacity,
    });
    notify.success("Pattern saved", `“${saved.name}” is in My patterns.`);
  }

  /**
   * Take a pasted snippet apart into the fields.
   *
   * Returns whether it was a snippet. That answer is what lets a paste *into a
   * field* do the right thing either way: a whole JSX block is distributed
   * across the fields, while a bare gradient someone copied on its own still
   * lands in the field they aimed at.
   */
  function absorbSnippet(text: string): boolean {
    const extracted = extractPatternCss(text);
    const kept = Object.entries(extracted).filter(([, value]) => Boolean(value));
    if (kept.length === 0) return false;

    setDraft((previous) => ({ ...previous, ...extracted }));
    notify.success(
      "Snippet read",
      kept.length === 1
        ? "Kept 1 background property; the rest was discarded."
        : `Kept ${kept.length} background properties; the rest was discarded.`,
    );
    return true;
  }

  async function pasteSnippet() {
    try {
      const text = await navigator.clipboard.readText();
      if (!absorbSnippet(text)) {
        notify.warning("Nothing to read", "No background properties were found in that snippet.");
      }
    } catch {
      notify.error("Clipboard unavailable", "Paste the values into the fields instead.");
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Pattern name"
          aria-label="Pattern name"
          className="h-7 min-w-0 flex-1 rounded-sm border border-line bg-surface-raised px-2 text-[11px] text-ink placeholder:text-ink-subtle focus:border-accent/60 focus:outline-none"
        />
        <Button size="xs" variant="secondary" onClick={() => void pasteSnippet()}>
          <ClipboardPaste className="h-3 w-3" />
          Paste
        </Button>
      </div>

      <PanelRow label="Colour">
        <ColorField
          label="Background colour"
          value={normalizeHex(draft.backgroundColor)}
          onChange={(value) => set("backgroundColor", value)}
        />
      </PanelRow>

      <CssField
        label="Background image"
        placeholder="radial-gradient(circle at 1px 1px, #0003 1px, transparent 0)"
        value={draft.backgroundImage ?? ""}
        error={validation.errors.backgroundImage}
        multiline
        onChange={(value) => set("backgroundImage", value)}
        onPasteSnippet={absorbSnippet}
      />

      <div className="grid grid-cols-2 gap-1.5">
        <CssField
          label="Size"
          placeholder="16px 16px"
          value={draft.backgroundSize ?? ""}
          error={validation.errors.backgroundSize}
          onChange={(value) => set("backgroundSize", value)}
          onPasteSnippet={absorbSnippet}
        />
        <CssField
          label="Position"
          placeholder="0 0"
          value={draft.backgroundPosition ?? ""}
          error={validation.errors.backgroundPosition}
          onChange={(value) => set("backgroundPosition", value)}
          onPasteSnippet={absorbSnippet}
        />
      </div>

      <PanelRow label="Opacity">
        <Slider
          aria-label="Pattern opacity"
          value={opacity}
          onChange={setOpacity}
          min={0}
          max={1}
          step={0.01}
          className="flex-1"
        />
        <span className="numeric w-9 text-right text-[11px] text-ink-muted">
          {Math.round(opacity * 100)}%
        </span>
      </PanelRow>

      <div className="space-y-1.5">
        <span className="panel-label">Preview</span>
        <div
          className="h-20 w-full rounded-sm border border-line"
          style={{ ...validation.css, opacity }}
        />
      </div>

      {errorList.length > 0 ? (
        <Alert tone="warning" title="Some values were not applied">
          <ul className="list-disc space-y-0.5 pl-3.5">
            {errorList.map(([key, message]) => (
              <li key={key}>{message}</li>
            ))}
          </ul>
          <p className="mt-1 text-ink-subtle">
            Pasting a whole snippet into any field is fine — Framelo pulls the background
            properties out of it.
          </p>
        </Alert>
      ) : (
        <p className="flex items-start gap-1.5 px-0.5 text-[10px] leading-relaxed text-ink-subtle">
          <ShieldCheck className="mt-px h-3 w-3 shrink-0 text-positive" />
          Values are stored as data and checked against an allowlist. Framelo never runs pasted
          code, and rejects <code className="text-ink-muted">url()</code>, scripts and embedded
          markup.
        </p>
      )}

      <div className="flex gap-1.5">
        <Button size="sm" variant="primary" className="flex-1" onClick={apply}>
          Apply
        </Button>
        <Button size="sm" variant="secondary" onClick={() => void handleSave()}>
          <Save className="h-3 w-3" />
          Save pattern
        </Button>
      </div>
    </div>
  );
}

function CssField({
  label,
  placeholder,
  value,
  error,
  multiline,
  onChange,
  onPasteSnippet,
}: {
  label: string;
  placeholder: string;
  value: string;
  error?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  /** Given the pasted text; returns true if it was a snippet and consumed. */
  onPasteSnippet?: (text: string) => boolean;
}) {
  const id = React.useId();

  function handlePaste(event: React.ClipboardEvent) {
    if (!onPasteSnippet) return;
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;
    // Only intercept when the text really is a snippet. A bare value — the
    // gradient on its own — reports false and pastes normally.
    if (onPasteSnippet(text)) event.preventDefault();
  }
  const className = cn(
    "w-full rounded-sm border bg-surface-raised px-2 py-1.5 font-mono text-[10px] leading-relaxed text-ink placeholder:text-ink-subtle/70 focus:outline-none",
    error ? "border-caution/60 focus:border-caution" : "border-line focus:border-accent/60",
  );

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="panel-label block">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          spellCheck={false}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onPaste={handlePaste}
          className={cn(className, "resize-y")}
        />
      ) : (
        <input
          id={id}
          value={value}
          spellCheck={false}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onPaste={handlePaste}
          className={cn(className, "h-7 py-0")}
        />
      )}
    </div>
  );
}

/** The colour input needs a hex value; anything else falls back to the default. */
function normalizeHex(value: string | undefined): string {
  if (value && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return value;
  return "#faf8f3";
}
