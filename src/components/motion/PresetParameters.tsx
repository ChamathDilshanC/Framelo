"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { NumericField } from "@/components/ui/numeric-field";
import { PanelRow } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type {
  MotionDirection,
  MotionPresetDefinition,
  MotionPresetParameters,
} from "@/engine/motion/preset-types";
import { EASING_LABELS, EASING_TYPES, type EasingType } from "@/types/animation";
import { cn } from "@/lib/utils";

interface PresetParametersProps {
  preset: MotionPresetDefinition;
  value: MotionPresetParameters;
  onChange: (next: MotionPresetParameters) => void;
}

const DIRECTIONS: Array<{ value: MotionDirection; label: string }> = [
  { value: "left", label: "Left" },
  { value: "center", label: "Centre" },
  { value: "right", label: "Right" },
];

/**
 * The controls for one preset.
 *
 * Only shows what the preset actually honours. A turntable has no direction and
 * no easing worth changing — offering those anyway would be a row of controls
 * that do nothing, which teaches people the panel is decorative.
 */
export function PresetParameters({ preset, value, onChange }: PresetParametersProps) {
  const [advanced, setAdvanced] = React.useState(false);
  const supports = preset.supports ?? {};

  const patch = (next: Partial<MotionPresetParameters>) => onChange({ ...value, ...next });

  const hasAny =
    supports.intensity || supports.direction || supports.easing || supports.delay || supports.spring;

  if (!hasAny) {
    return (
      <p className="text-[10px] leading-relaxed text-ink-subtle">
        Tuned as designed — this one has no parameters. Apply it and edit the keyframes on the
        timeline if you want to change it.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {supports.intensity ? (
        <PanelRow label="Intensity">
          <Slider
            aria-label="Motion intensity"
            value={value.intensity}
            onChange={(intensity) => patch({ intensity })}
            min={0.2}
            max={2}
            step={0.05}
            className="flex-1"
          />
          <span className="numeric w-8 text-right text-[10px] text-ink-muted">
            {value.intensity.toFixed(2)}
          </span>
        </PanelRow>
      ) : null}

      {supports.direction ? (
        <PanelRow label="Direction">
          <Segmented
            aria-label="Motion direction"
            value={value.direction === "top" || value.direction === "bottom" ? "center" : value.direction}
            onChange={(direction) => patch({ direction })}
            options={DIRECTIONS}
          />
        </PanelRow>
      ) : null}

      {supports.easing ? (
        <PanelRow label="Easing">
          <Select
            aria-label="Easing"
            value={value.easing ?? "designed"}
            onChange={(next) =>
              patch({ easing: next === "designed" ? null : (next as EasingType) })
            }
            options={[
              { value: "designed", label: "As designed" },
              ...EASING_TYPES.map((type) => ({ value: type, label: EASING_LABELS[type] })),
            ]}
          />
        </PanelRow>
      ) : null}

      {supports.delay ? (
        <PanelRow label="Delay">
          <Slider
            aria-label="Delay"
            value={value.delay}
            onChange={(delay) => patch({ delay })}
            min={0}
            max={Math.max(0.1, preset.duration - 0.2)}
            step={0.05}
            className="flex-1"
          />
          <span className="numeric w-8 text-right text-[10px] text-ink-muted">
            {value.delay.toFixed(2)}s
          </span>
        </PanelRow>
      ) : null}

      {supports.spring ? (
        <>
          <PanelRow label="Spring">
            <Slider
              aria-label="Spring intensity"
              value={value.springIntensity}
              onChange={(springIntensity) => patch({ springIntensity })}
              min={0}
              max={1}
              step={0.05}
              className="flex-1"
            />
            <span className="numeric w-8 text-right text-[10px] text-ink-muted">
              {value.springIntensity === 0 ? "off" : value.springIntensity.toFixed(2)}
            </span>
          </PanelRow>

          {value.springIntensity > 0 ? (
            <div className="rounded-sm border border-line/70 bg-canvas/40">
              <button
                type="button"
                onClick={() => setAdvanced((open) => !open)}
                aria-expanded={advanced}
                className="flex w-full items-center gap-1 px-2 py-1.5 text-left"
              >
                <ChevronDown
                  className={cn(
                    "h-3 w-3 text-ink-subtle transition-transform duration-200",
                    !advanced && "-rotate-90",
                  )}
                />
                <span className="panel-label">Advanced</span>
              </button>

              {advanced ? (
                <div className="space-y-1.5 px-2 pb-2">
                  {/*
                    The physical triple. Hidden by default because it is easy to
                    make unusable and meaningless to most people — the intensity
                    dial above maps onto a band that is always stable.
                  */}
                  <SpringField
                    label="Mass"
                    value={value.spring.mass}
                    min={0.2}
                    max={5}
                    step={0.1}
                    onChange={(mass) => patch({ spring: { ...value.spring, mass } })}
                  />
                  <SpringField
                    label="Stiffness"
                    value={value.spring.stiffness}
                    min={20}
                    max={400}
                    step={5}
                    onChange={(stiffness) => patch({ spring: { ...value.spring, stiffness } })}
                  />
                  <SpringField
                    label="Damping"
                    value={value.spring.damping}
                    min={2}
                    max={60}
                    step={1}
                    onChange={(damping) => patch({ spring: { ...value.spring, damping } })}
                  />
                  <p className="pt-0.5 text-[10px] leading-relaxed text-ink-subtle">
                    Simulated and written out as keyframes, so the result stays editable on the
                    timeline.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function SpringField({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <PanelRow label={label}>
      <Slider
        aria-label={label}
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        className="flex-1"
      />
      <NumericField
        label=""
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        decimals={step < 1 ? 1 : 0}
        className="w-[52px]"
      />
    </PanelRow>
  );
}
