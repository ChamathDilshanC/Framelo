"use client";

import { Copy, Wand2 } from "lucide-react";
import * as React from "react";

import { CustomPatternEditor } from "@/components/background/CustomPatternEditor";
import { PatternPicker } from "@/components/background/PatternPicker";
import { Button } from "@/components/ui/button";
import { ColorField } from "@/components/ui/color-field";
import { NumericField } from "@/components/ui/numeric-field";
import { PanelRow, PanelSection } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { backgroundToCss, backgroundToTailwind } from "@/engine/background/resolve";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/store/asset-store";
import { useEditorStore } from "@/store/editor-store";
import { usePatternStore } from "@/store/pattern-store";
import { useProjectStore } from "@/store/project-store";
import {
  DEFAULT_BACKGROUND,
  DEFAULT_GRADIENT,
  type BackgroundConfig,
  type BackgroundKind,
  type GradientBackground,
  type GradientMode,
  type PatternBackground,
} from "@/types/background";

const SWATCHES = ["#0f1014", "#ffffff", "#faf8f3", "#101a2e", "#1d1420", "#0d2b24"];

const KINDS: Array<{ value: BackgroundKind; label: string }> = [
  { value: "solid", label: "Solid" },
  { value: "gradient", label: "Gradient" },
  { value: "pattern", label: "Pattern" },
  { value: "image", label: "Image" },
  { value: "transparent", label: "None" },
];

/**
 * The background section.
 *
 * Backgrounds are a DOM layer behind the canvas, so everything here is an
 * instant, free change — no texture upload, no re-render of the 3D scene.
 */
export function BackgroundPanel() {
  const background = useProjectStore((state) => state.project?.background ?? DEFAULT_BACKGROUND);
  const setBackground = useProjectStore((state) => state.setBackground);
  const hydratePatterns = usePatternStore((state) => state.hydrate);

  React.useEffect(() => {
    void hydratePatterns();
  }, [hydratePatterns]);

  function changeKind(kind: BackgroundKind) {
    if (kind === background.type) return;
    setBackground(defaultFor(kind, background));
  }

  return (
    <PanelSection title="Background">
      <div className="grid grid-cols-5 gap-0.5 rounded-sm border border-line bg-surface-raised p-0.5">
        {KINDS.map((kind) => (
          <button
            key={kind.value}
            type="button"
            role="radio"
            aria-checked={background.type === kind.value}
            onClick={() => changeKind(kind.value)}
            className={cn(
              "h-6 rounded-xs text-[10px] font-medium transition-colors duration-150",
              background.type === kind.value
                ? "bg-surface-active text-ink"
                : "text-ink-subtle hover:bg-surface-hover hover:text-ink-muted",
            )}
          >
            {kind.label}
          </button>
        ))}
      </div>

      {background.type === "solid" ? (
        <SolidControls value={background.value} onChange={(value) => setBackground({ type: "solid", value })} />
      ) : null}

      {background.type === "gradient" ? (
        <GradientControls value={background} onChange={setBackground} />
      ) : null}

      {background.type === "pattern" ? (
        <PatternControls value={background} onChange={setBackground} />
      ) : null}

      {background.type === "image" ? <ImageControls value={background} onChange={setBackground} /> : null}

      {background.type === "transparent" ? (
        <p className="px-0.5 text-[11px] leading-relaxed text-ink-subtle">
          The composition renders without a background. PNG and WebP exports keep the alpha channel.
        </p>
      ) : (
        <CopyRow background={background} />
      )}
    </PanelSection>
  );
}

/** Switching type keeps whatever colour the previous type was built around. */
function defaultFor(kind: BackgroundKind, previous: BackgroundConfig): BackgroundConfig {
  const carried =
    previous.type === "solid"
      ? previous.value
      : previous.type === "gradient"
        ? previous.from
        : "#0f1014";

  switch (kind) {
    case "solid":
      return { type: "solid", value: carried };
    case "gradient":
      return { ...DEFAULT_GRADIENT, from: carried };
    case "pattern":
      return {
        type: "pattern",
        patternId: "dot-grid",
        name: "Dot Grid",
        css: {
          backgroundColor: carried,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in srgb, #ffffff 12%, transparent) 1px, transparent 0)",
          backgroundSize: "16px 16px",
        },
        colors: { base: carried, accent: "#ffffff" },
        opacity: 1,
      };
    case "image":
      return { type: "image", assetId: "", fit: "cover", opacity: 1 };
    case "transparent":
      return { type: "transparent" };
  }
}

function SolidControls({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <>
      <PanelRow label="Colour">
        <ColorField label="Background colour" value={value} onChange={onChange} />
      </PanelRow>
      <div className="flex gap-1.5">
        {SWATCHES.map((swatch) => (
          <button
            key={swatch}
            type="button"
            aria-label={`Set background to ${swatch}`}
            onClick={() => onChange(swatch)}
            className={cn(
              "h-5 flex-1 rounded-xs border transition-transform duration-150 hover:scale-105",
              swatch === value ? "border-accent" : "border-line hover:border-line-strong",
            )}
            style={{ backgroundColor: swatch }}
          />
        ))}
      </div>
    </>
  );
}

const GRADIENT_MODES: Array<{ value: GradientMode; label: string }> = [
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
  { value: "conic", label: "Conic" },
];

function GradientControls({
  value,
  onChange,
}: {
  value: GradientBackground;
  onChange: (background: BackgroundConfig) => void;
}) {
  const patch = (next: Partial<GradientBackground>) => onChange({ ...value, ...next });

  return (
    <>
      <PanelRow label="Style">
        <Segmented
          aria-label="Gradient style"
          value={value.mode}
          onChange={(mode) => patch({ mode })}
          options={GRADIENT_MODES}
        />
      </PanelRow>

      <div className="grid grid-cols-2 gap-1.5">
        <ColorField label="From" value={value.from} onChange={(from) => patch({ from })} />
        <ColorField label="To" value={value.to} onChange={(to) => patch({ to })} />
      </div>

      {value.mode !== "radial" ? (
        <PanelRow label="Angle">
          <Slider
            aria-label="Gradient angle"
            value={value.angle}
            onChange={(angle) => patch({ angle })}
            min={0}
            max={360}
            step={1}
            className="flex-1"
          />
          <NumericField
            label="°"
            value={value.angle}
            onChange={(angle) => patch({ angle })}
            min={0}
            max={360}
            step={1}
            decimals={0}
            className="w-[64px]"
          />
        </PanelRow>
      ) : null}

      <PanelRow label="Position">
        <Slider
          aria-label="Gradient position"
          value={value.position}
          onChange={(position) => patch({ position })}
          min={0}
          max={100}
          step={1}
          className="flex-1"
        />
        <NumericField
          label="%"
          value={value.position}
          onChange={(position) => patch({ position })}
          min={0}
          max={100}
          step={1}
          decimals={0}
          className="w-[64px]"
        />
      </PanelRow>

      <PanelRow label="Opacity">
        <Slider
          aria-label="Gradient opacity"
          value={value.opacity}
          onChange={(opacity) => patch({ opacity })}
          min={0}
          max={1}
          step={0.01}
          className="flex-1"
        />
        <span className="numeric w-9 text-right text-[11px] text-ink-muted">
          {Math.round(value.opacity * 100)}%
        </span>
      </PanelRow>
    </>
  );
}

function PatternControls({
  value,
  onChange,
}: {
  value: PatternBackground;
  onChange: (background: BackgroundConfig) => void;
}) {
  const [tab, setTab] = React.useState<"browse" | "custom">(
    value.patternId === null ? "custom" : "browse",
  );

  return (
    <div className="space-y-2.5">
      <Segmented
        aria-label="Pattern source"
        value={tab}
        onChange={setTab}
        options={[
          { value: "browse", label: "Browse" },
          { value: "custom", label: "Custom" },
        ]}
      />

      {tab === "browse" ? (
        <>
          <PatternPicker
            current={value}
            onApply={onChange}
            onWriteYourOwn={() => setTab("custom")}
          />
          <PanelRow label="Opacity">
            <Slider
              aria-label="Pattern opacity"
              value={value.opacity}
              onChange={(opacity) => onChange({ ...value, opacity })}
              min={0}
              max={1}
              step={0.01}
              className="flex-1"
            />
            <span className="numeric w-9 text-right text-[11px] text-ink-muted">
              {Math.round(value.opacity * 100)}%
            </span>
          </PanelRow>
        </>
      ) : (
        <CustomPatternEditor current={value} onApply={onChange} />
      )}
    </div>
  );
}

function ImageControls({
  value,
  onChange,
}: {
  value: Extract<BackgroundConfig, { type: "image" }>;
  onChange: (background: BackgroundConfig) => void;
}) {
  const assets = useAssetStore((state) => state.assets);
  const setLeftPanelTab = useEditorStore((state) => state.setLeftPanelTab);

  if (assets.length === 0) {
    return (
      <div className="space-y-2">
        <p className="px-0.5 text-[11px] leading-relaxed text-ink-subtle">
          Upload an image to use it as the backdrop.
        </p>
        <Button size="sm" variant="secondary" className="w-full" onClick={() => setLeftPanelTab("assets")}>
          <Wand2 className="h-3 w-3" />
          Open assets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-1.5">
        {assets.slice(0, 9).map((asset) => (
          <button
            key={asset.id}
            type="button"
            onClick={() => onChange({ ...value, assetId: asset.id })}
            aria-pressed={asset.id === value.assetId}
            title={asset.originalName}
            className={cn(
              "aspect-video overflow-hidden rounded-sm border transition-colors",
              asset.id === value.assetId
                ? "border-accent/70"
                : "border-line hover:border-line-strong",
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>

      <PanelRow label="Fit">
        <Select
          aria-label="Background image fit"
          value={value.fit}
          onChange={(fit) => onChange({ ...value, fit })}
          options={[
            { value: "cover", label: "Cover" },
            { value: "contain", label: "Contain" },
            { value: "fill", label: "Fill" },
          ]}
        />
      </PanelRow>

      <PanelRow label="Opacity">
        <Slider
          aria-label="Background image opacity"
          value={value.opacity}
          onChange={(opacity) => onChange({ ...value, opacity })}
          min={0}
          max={1}
          step={0.01}
          className="flex-1"
        />
        <span className="numeric w-9 text-right text-[11px] text-ink-muted">
          {Math.round(value.opacity * 100)}%
        </span>
      </PanelRow>
    </div>
  );
}

/**
 * The pattern browser is useful outside Framelo too, so the background can be
 * lifted straight into someone else's project.
 */
function CopyRow({ background }: { background: BackgroundConfig }) {
  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify.success(`${label} copied`);
    } catch {
      notify.error("Clipboard unavailable");
    }
  }

  return (
    <div className="flex gap-1.5 pt-0.5">
      <Button
        size="xs"
        variant="ghost"
        className="flex-1"
        onClick={() => void copy(backgroundToCss(background), "CSS")}
      >
        <Copy className="h-3 w-3" />
        Copy CSS
      </Button>
      <Button
        size="xs"
        variant="ghost"
        className="flex-1"
        onClick={() => void copy(backgroundToTailwind(background), "Tailwind")}
      >
        <Copy className="h-3 w-3" />
        Copy Tailwind
      </Button>
    </div>
  );
}
