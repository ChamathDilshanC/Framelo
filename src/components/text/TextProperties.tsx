"use client";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Pencil,
} from "lucide-react";
import * as React from "react";

import { KeyframeToggle } from "@/components/properties/KeyframeToggle";
import { usePropertyControl } from "@/components/properties/use-property-control";
import { Button } from "@/components/ui/button";
import { ColorField } from "@/components/ui/color-field";
import { NumericField } from "@/components/ui/numeric-field";
import { PanelRow, PanelSection } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ScreenAlignmentSection } from "./ScreenAlignmentSection";
import { FontPicker } from "@/components/text/FontPicker";
import { getFont, nearestWeight } from "@/engine/text/text-fonts";
import { detectTextScripts } from "@/engine/text/text-script";
import { TEXT_LIMITS } from "@/engine/text/text-safety";
import {
  resolveTextMetadata,
  type TextAlign,
  type TextDirection,
  type TextLayerMetadata,
  type TextRevealMode,
  type TextTransformMode,
} from "@/engine/text/text-types";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import type { Layer } from "@/types/layer";

interface TextPropertiesProps {
  layer: Layer;
}

/**
 * Typography for the selected text layer.
 *
 * Sections follow the order a designer works in — the words, then the
 * typeface, then the colour, then the paragraph — rather than the order the
 * data model happens to list them (§59).
 */
export function TextProperties({ layer }: TextPropertiesProps) {
  const style = React.useMemo(() => resolveTextMetadata(layer.metadata), [layer.metadata]);

  return (
    <>
      <ContentSection layer={layer} style={style} />
      <ScreenAlignmentSection layer={layer} />
      <TypographySection layer={layer} style={style} />
      <ColorSection layer={layer} style={style} />
      <ParagraphSection layer={layer} style={style} />
      <EffectsSection layer={layer} style={style} />
    </>
  );
}

/** Shared updater, so every control commits the same way. */
function useTextUpdate(layerId: string) {
  const updateTextMetadata = useProjectStore((state) => state.updateTextMetadata);
  return React.useCallback(
    (patch: Partial<TextLayerMetadata>) => updateTextMetadata(layerId, patch),
    [updateTextMetadata, layerId],
  );
}

// ---------------------------------------------------------------------------

function ContentSection({ layer, style }: { layer: Layer; style: TextLayerMetadata }) {
  const setTextContent = useProjectStore((state) => state.setTextContent);
  const beginTextEditing = useEditorStore((state) => state.beginTextEditing);

  // The scripts actually present, so a user typing Sinhala can see that
  // Framelo noticed — and understand why the typeface on screen is not the one
  // named in the picker (§13).
  const scripts = React.useMemo(
    () => detectTextScripts(style.content).filter((script) => script !== "latin"),
    [style.content],
  );

  return (
    <PanelSection
      title="Text"
      actions={
        <Button size="xs" variant="ghost" onClick={() => beginTextEditing(layer.id)}>
          <Pencil className="h-3 w-3" />
          Edit on canvas
        </Button>
      }
    >
      <textarea
        aria-label="Text content"
        value={style.content}
        rows={3}
        spellCheck={false}
        dir={style.direction === "auto" ? "auto" : style.direction}
        placeholder="Type something..."
        onChange={(event) => setTextContent(layer.id, event.target.value)}
        className="w-full resize-y rounded-sm border border-line bg-surface-raised px-2 py-1.5 text-[11px] leading-relaxed text-ink placeholder:text-ink-subtle focus:border-accent/60 focus:outline-none"
      />

      {scripts.length > 0 ? (
        <p className="text-[10px] leading-relaxed text-ink-subtle">
          Script coverage: {scripts.join(", ")}. Framelo loads a matching font automatically.
        </p>
      ) : null}
    </PanelSection>
  );
}

// ---------------------------------------------------------------------------

const WEIGHT_LABELS: Record<number, string> = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
};

function TypographySection({ layer, style }: { layer: Layer; style: TextLayerMetadata }) {
  const update = useTextUpdate(layer.id);
  const font = getFont(style.fontId);
  const size = usePropertyControl(layer, "fontSize");

  // Only the weights this family ships. Changing family snaps the weight to
  // the nearest one it has, so nothing renders a face that does not exist (§16).
  const weightOptions = font.weights.map((weight) => ({
    value: String(weight),
    label: `${weight} · ${WEIGHT_LABELS[weight] ?? ""}`.trim(),
  }));

  return (
    <PanelSection title="Typography">
      <PanelRow label="Font">
        <FontPicker
          value={style.fontId}
          previewText={style.content}
          weight={style.fontWeight}
          italic={style.fontStyle === "italic"}
          onChange={(fontId) =>
            update({ fontId, fontWeight: nearestWeight(getFont(fontId), style.fontWeight) })
          }
        />
      </PanelRow>

      <PanelRow label="Weight">
        <Select
          aria-label="Font weight"
          value={String(style.fontWeight)}
          options={weightOptions}
          onChange={(weight) => update({ fontWeight: Number(weight) })}
        />
      </PanelRow>

      <PanelRow label="Style">
        <Segmented
          aria-label="Font style"
          value={style.fontStyle}
          options={[
            { value: "normal", label: "Normal" },
            { value: "italic", label: "Italic" },
          ]}
          onChange={(fontStyle) => update({ fontStyle: fontStyle as "normal" | "italic" })}
          className="flex-1"
        />
      </PanelRow>
      <p className="text-[10px] leading-relaxed text-ink-subtle">
        {font.note}
        {font.variable ? " One variable file covers every weight." : ""}
      </p>

      {!font.italic && style.fontStyle === "italic" ? (
        <p className="text-[10px] text-ink-subtle">
          {font.name} has no italic — the browser will slant the upright face.
        </p>
      ) : null}

      <PanelRow label="Size" leading={
        <KeyframeToggle
          state={size.toggleState}
          propertyLabel="Font Size"
          onToggle={size.toggleKeyframe}
        />
      }>
        <Slider
          aria-label="Font size"
          value={size.value}
          onChange={size.setValue}
          min={TEXT_LIMITS.fontSize.min}
          max={240}
          step={1}
          className="flex-1"
        />
        <NumericField
          label="px"
          value={size.value}
          onChange={size.setValue}
          min={TEXT_LIMITS.fontSize.min}
          max={TEXT_LIMITS.fontSize.max}
          step={1}
          decimals={0}
          className="w-[74px]"
        />
      </PanelRow>
    </PanelSection>
  );
}

// ---------------------------------------------------------------------------

function ColorSection({ layer, style }: { layer: Layer; style: TextLayerMetadata }) {
  const update = useTextUpdate(layer.id);

  return (
    <PanelSection title="Color">
      <PanelRow label="Fill">
        <Segmented
          aria-label="Fill type"
          value={style.fill.type}
          options={[
            { value: "solid", label: "Solid" },
            { value: "gradient", label: "Gradient" },
          ]}
          onChange={(type) =>
            update({ fill: { ...style.fill, type: type as "solid" | "gradient" } })
          }
          className="flex-1"
        />
      </PanelRow>

      {style.fill.type === "solid" ? (
        <PanelRow label="Colour">
          <ColorField
            label="Text colour"
            value={style.fill.color}
            onChange={(color) => update({ fill: { ...style.fill, color } })}
          />
        </PanelRow>
      ) : (
        <>
          <PanelRow label="From">
            <ColorField
              label="Gradient start"
              value={style.fill.gradient.from}
              onChange={(from) =>
                update({ fill: { ...style.fill, gradient: { ...style.fill.gradient, from } } })
              }
            />
          </PanelRow>
          <PanelRow label="To">
            <ColorField
              label="Gradient end"
              value={style.fill.gradient.to}
              onChange={(to) =>
                update({ fill: { ...style.fill, gradient: { ...style.fill.gradient, to } } })
              }
            />
          </PanelRow>
          <PanelRow label="Angle">
            <Slider
              aria-label="Gradient angle"
              value={style.fill.gradient.angle}
              onChange={(angle) =>
                update({ fill: { ...style.fill, gradient: { ...style.fill.gradient, angle } } })
              }
              min={0}
              max={360}
              step={1}
              className="flex-1"
            />
            <NumericField
              label="°"
              value={style.fill.gradient.angle}
              onChange={(angle) =>
                update({ fill: { ...style.fill, gradient: { ...style.fill.gradient, angle } } })
              }
              min={0}
              max={360}
              step={1}
              decimals={0}
              className="w-[68px]"
            />
          </PanelRow>
        </>
      )}

      <ToggleRow
        label="Stroke"
        checked={style.stroke.enabled}
        onChange={(enabled) => update({ stroke: { ...style.stroke, enabled } })}
      />
      {style.stroke.enabled ? (
        <>
          <PanelRow label="Colour">
            <ColorField
              label="Stroke colour"
              value={style.stroke.color}
              onChange={(color) => update({ stroke: { ...style.stroke, color } })}
            />
          </PanelRow>
          <PanelRow label="Width">
            <Slider
              aria-label="Stroke width"
              value={style.stroke.width}
              onChange={(width) => update({ stroke: { ...style.stroke, width } })}
              min={TEXT_LIMITS.strokeWidth.min}
              max={24}
              step={0.5}
              className="flex-1"
            />
            <NumericField
              label="px"
              value={style.stroke.width}
              onChange={(width) => update({ stroke: { ...style.stroke, width } })}
              min={TEXT_LIMITS.strokeWidth.min}
              max={TEXT_LIMITS.strokeWidth.max}
              step={0.5}
              decimals={1}
              className="w-[68px]"
            />
          </PanelRow>
          <PanelRow label="Opacity">
            <Slider
              aria-label="Stroke opacity"
              value={style.stroke.opacity}
              onChange={(opacity) => update({ stroke: { ...style.stroke, opacity } })}
              min={0}
              max={1}
              step={0.01}
              className="flex-1"
            />
          </PanelRow>
        </>
      ) : null}
    </PanelSection>
  );
}

// ---------------------------------------------------------------------------

const ALIGN_OPTIONS: Array<{ value: TextAlign; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: "left", label: "Left", icon: AlignLeft },
  { value: "center", label: "Center", icon: AlignCenter },
  { value: "right", label: "Right", icon: AlignRight },
  { value: "justify", label: "Justify", icon: AlignJustify },
];

function ParagraphSection({ layer, style }: { layer: Layer; style: TextLayerMetadata }) {
  const update = useTextUpdate(layer.id);
  const lineHeight = usePropertyControl(layer, "lineHeight");
  const letterSpacing = usePropertyControl(layer, "letterSpacing");

  return (
    <PanelSection title="Paragraph">
      <div className="space-y-1.5">
        <span className="panel-label">Alignment</span>
        <div className="flex gap-0.5 rounded-sm border border-line bg-surface-raised p-0.5">
          {ALIGN_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = style.textAlign === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`Align ${option.label.toLowerCase()}`}
                onClick={() => update({ textAlign: option.value })}
                className={`flex h-6 flex-1 items-center justify-center rounded-xs transition-colors ${
                  active ? "bg-surface-active text-ink" : "text-ink-subtle hover:text-ink-muted"
                }`}
              >
                <Icon className="h-3 w-3" />
              </button>
            );
          })}
        </div>
      </div>

      <PanelRow
        label="Line height"
        leading={
          <KeyframeToggle
            state={lineHeight.toggleState}
            propertyLabel="Line Height"
            onToggle={lineHeight.toggleKeyframe}
          />
        }
      >
        <Slider
          aria-label="Line height"
          value={lineHeight.value}
          onChange={lineHeight.setValue}
          min={TEXT_LIMITS.lineHeight.min}
          max={2.5}
          step={0.01}
          className="flex-1"
        />
        <NumericField
          label="×"
          value={lineHeight.value}
          onChange={lineHeight.setValue}
          min={TEXT_LIMITS.lineHeight.min}
          max={TEXT_LIMITS.lineHeight.max}
          step={0.05}
          decimals={2}
          className="w-[68px]"
        />
      </PanelRow>

      <PanelRow
        label="Letter sp."
        leading={
          <KeyframeToggle
            state={letterSpacing.toggleState}
            propertyLabel="Letter Spacing"
            onToggle={letterSpacing.toggleKeyframe}
          />
        }
      >
        <Slider
          aria-label="Letter spacing"
          value={letterSpacing.value}
          onChange={letterSpacing.setValue}
          min={-20}
          max={40}
          step={0.5}
          className="flex-1"
        />
        <NumericField
          label="px"
          value={letterSpacing.value}
          onChange={letterSpacing.setValue}
          min={TEXT_LIMITS.letterSpacing.min}
          max={TEXT_LIMITS.letterSpacing.max}
          step={0.5}
          decimals={1}
          className="w-[68px]"
        />
      </PanelRow>

      <PanelRow label="Case">
        <Select
          aria-label="Text case"
          value={style.textTransform}
          options={[
            { value: "none", label: "Original" },
            { value: "uppercase", label: "UPPERCASE" },
            { value: "lowercase", label: "lowercase" },
            { value: "capitalize", label: "Capitalize" },
          ]}
          onChange={(textTransform) =>
            update({ textTransform: textTransform as TextTransformMode })
          }
        />
      </PanelRow>

      <PanelRow label="Direction">
        <Select
          aria-label="Text direction"
          value={style.direction}
          options={[
            { value: "auto", label: "Auto (detect)" },
            { value: "ltr", label: "Left to right" },
            { value: "rtl", label: "Right to left" },
          ]}
          onChange={(direction) => update({ direction: direction as TextDirection })}
        />
      </PanelRow>

      <PanelRow label="Box">
        <Segmented
          aria-label="Text box mode"
          value={style.boxMode}
          options={[
            { value: "auto", label: "Auto width" },
            { value: "fixed", label: "Fixed" },
          ]}
          onChange={(boxMode) => update({ boxMode: boxMode as "auto" | "fixed" })}
          className="flex-1"
        />
      </PanelRow>

      {style.boxMode === "fixed" ? (
        <PanelRow label="Width">
          <Slider
            aria-label="Text box width"
            value={style.boxWidth}
            onChange={(boxWidth) => update({ boxWidth })}
            min={TEXT_LIMITS.boxWidth.min}
            max={2000}
            step={10}
            className="flex-1"
          />
          <NumericField
            label="px"
            value={style.boxWidth}
            onChange={(boxWidth) => update({ boxWidth })}
            min={TEXT_LIMITS.boxWidth.min}
            max={TEXT_LIMITS.boxWidth.max}
            step={10}
            decimals={0}
            className="w-[74px]"
          />
        </PanelRow>
      ) : null}
    </PanelSection>
  );
}

// ---------------------------------------------------------------------------

function EffectsSection({ layer, style }: { layer: Layer; style: TextLayerMetadata }) {
  const update = useTextUpdate(layer.id);

  return (
    <PanelSection title="Effects" defaultOpen={false}>
      <ToggleRow
        label="Shadow"
        checked={style.shadow.enabled}
        onChange={(enabled) => update({ shadow: { ...style.shadow, enabled } })}
      />
      {style.shadow.enabled ? (
        <>
          <PanelRow label="Colour">
            <ColorField
              label="Shadow colour"
              value={style.shadow.color}
              onChange={(color) => update({ shadow: { ...style.shadow, color } })}
            />
          </PanelRow>
          <div className="grid grid-cols-2 gap-1.5">
            <NumericField
              label="X"
              value={style.shadow.x}
              onChange={(x) => update({ shadow: { ...style.shadow, x } })}
              min={TEXT_LIMITS.shadowOffset.min}
              max={TEXT_LIMITS.shadowOffset.max}
              step={1}
              decimals={0}
            />
            <NumericField
              label="Y"
              value={style.shadow.y}
              onChange={(y) => update({ shadow: { ...style.shadow, y } })}
              min={TEXT_LIMITS.shadowOffset.min}
              max={TEXT_LIMITS.shadowOffset.max}
              step={1}
              decimals={0}
            />
          </div>
          <PanelRow label="Blur">
            <Slider
              aria-label="Shadow blur"
              value={style.shadow.blur}
              onChange={(blur) => update({ shadow: { ...style.shadow, blur } })}
              min={0}
              max={80}
              step={1}
              className="flex-1"
            />
          </PanelRow>
          <PanelRow label="Opacity">
            <Slider
              aria-label="Shadow opacity"
              value={style.shadow.opacity}
              onChange={(opacity) => update({ shadow: { ...style.shadow, opacity } })}
              min={0}
              max={1}
              step={0.01}
              className="flex-1"
            />
          </PanelRow>
        </>
      ) : null}

      <ToggleRow
        label="Backdrop"
        checked={style.backdrop.enabled}
        onChange={(enabled) => update({ backdrop: { ...style.backdrop, enabled } })}
      />
      {style.backdrop.enabled ? (
        <>
          <PanelRow label="Colour">
            <ColorField
              label="Backdrop colour"
              value={style.backdrop.color}
              onChange={(color) => update({ backdrop: { ...style.backdrop, color } })}
            />
          </PanelRow>
          <PanelRow label="Opacity">
            <Slider
              aria-label="Backdrop opacity"
              value={style.backdrop.opacity}
              onChange={(opacity) => update({ backdrop: { ...style.backdrop, opacity } })}
              min={0}
              max={1}
              step={0.01}
              className="flex-1"
            />
          </PanelRow>
          <div className="grid grid-cols-2 gap-1.5">
            <NumericField
              label="Pad"
              value={style.backdrop.padding}
              onChange={(padding) => update({ backdrop: { ...style.backdrop, padding } })}
              min={TEXT_LIMITS.padding.min}
              max={TEXT_LIMITS.padding.max}
              step={2}
              decimals={0}
            />
            <NumericField
              label="Radius"
              value={style.backdrop.radius}
              onChange={(radius) => update({ backdrop: { ...style.backdrop, radius } })}
              min={TEXT_LIMITS.radius.min}
              max={TEXT_LIMITS.radius.max}
              step={2}
              decimals={0}
            />
          </div>
        </>
      ) : null}

      <PanelRow label="Reveal">
        <Select
          aria-label="Reveal mode"
          value={style.revealMode}
          options={[
            { value: "none", label: "None" },
            { value: "characters", label: "By character" },
            { value: "words", label: "By word" },
            { value: "lines", label: "By line" },
          ]}
          onChange={(revealMode) => update({ revealMode: revealMode as TextRevealMode })}
        />
      </PanelRow>
      <p className="text-[10px] leading-relaxed text-ink-subtle">
        Sets what a Reveal animation counts. Add one from the Typewriter, Word Reveal or Letter
        Reveal presets.
      </p>
    </PanelSection>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = React.useId();
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <label htmlFor={id} className="text-[11px] text-ink-muted">
        {label}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}
