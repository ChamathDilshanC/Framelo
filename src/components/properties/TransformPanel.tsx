"use client";

import { RotateCcw } from "lucide-react";
import * as React from "react";

import { KeyframeToggle } from "@/components/properties/KeyframeToggle";
import { usePropertyControl } from "@/components/properties/use-property-control";
import { IconButton } from "@/components/ui/icon-button";
import { NumericField } from "@/components/ui/numeric-field";
import { PanelSection } from "@/components/ui/panel";
import { Slider } from "@/components/ui/slider";
import { TRANSFORM_RANGES } from "@/lib/constants";
import { PROPERTY_LABELS, type AnimatableProperty } from "@/types/animation";
import type { Layer } from "@/types/layer";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";

interface TransformPanelProps {
  layer: Layer;
}

const AXES = ["X", "Y", "Z"] as const;

export function TransformPanel({ layer }: TransformPanelProps) {
  const resetTransform = useProjectStore((state) => state.resetTransform);

  return (
    <PanelSection
      title="Transform"
      actions={
        <IconButton
          icon={RotateCcw}
          label="Reset transform"
          size="sm"
          onClick={() => resetTransform(layer.id)}
        />
      }
    >
      <AxisGroup
        layer={layer}
        title="Position"
        properties={["x", "y", "z"]}
        range={TRANSFORM_RANGES.position}
        decimals={2}
      />
      <AxisGroup
        layer={layer}
        title="Rotation"
        properties={["rotationX", "rotationY", "rotationZ"]}
        range={TRANSFORM_RANGES.rotation}
        decimals={0}
      />
      <AxisGroup
        layer={layer}
        title="Scale"
        properties={["scaleX", "scaleY", "scaleZ"]}
        range={TRANSFORM_RANGES.scale}
        decimals={2}
        linkable
      />
      <OpacityRow layer={layer} />
    </PanelSection>
  );
}

interface AxisGroupProps {
  layer: Layer;
  title: string;
  properties: [AnimatableProperty, AnimatableProperty, AnimatableProperty];
  range: { min: number; max: number; step: number };
  decimals: number;
  suffix?: string;
  linkable?: boolean;
}

function AxisGroup({
  layer,
  title,
  properties,
  range,
  decimals,
  suffix,
  linkable,
}: AxisGroupProps) {
  const [linked, setLinked] = React.useState(linkable ?? false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="panel-label">{title}</span>
        {linkable ? (
          <button
            type="button"
            onClick={() => setLinked((value) => !value)}
            aria-pressed={linked}
            className="text-[10px] text-ink-subtle transition-colors hover:text-ink-muted"
          >
            {linked ? "Linked" : "Independent"}
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {properties.map((property, index) => (
          <AxisField
            key={property}
            layer={layer}
            property={property}
            axis={AXES[index]}
            range={range}
            decimals={decimals}
            suffix={suffix}
            linkedWith={linked ? properties : undefined}
          />
        ))}
      </div>
    </div>
  );
}

interface AxisFieldProps {
  layer: Layer;
  property: AnimatableProperty;
  axis: string;
  range: { min: number; max: number; step: number };
  decimals: number;
  suffix?: string;
  linkedWith?: readonly AnimatableProperty[];
}

function AxisField({
  layer,
  property,
  axis,
  range,
  decimals,
  suffix,
  linkedWith,
}: AxisFieldProps) {
  const control = usePropertyControl(layer, property);
  const setTransformValue = useProjectStore((state) => state.setTransformValue);
  const currentTime = useEditorStore((state) => state.currentTime);

  function handleChange(next: number) {
    if (linkedWith) {
      for (const linkedProperty of linkedWith) {
        setTransformValue(layer.id, linkedProperty, next, { time: currentTime });
      }
      return;
    }
    control.setValue(next);
  }

  return (
    <div className="flex items-center gap-0.5">
      <KeyframeToggle
        state={control.toggleState}
        propertyLabel={PROPERTY_LABELS[property]}
        onToggle={control.toggleKeyframe}
      />
      <NumericField
        label={axis}
        value={control.value}
        onChange={handleChange}
        min={range.min}
        max={range.max}
        step={range.step}
        decimals={decimals}
        suffix={suffix}
        className="flex-1"
      />
    </div>
  );
}

function OpacityRow({ layer }: { layer: Layer }) {
  const control = usePropertyControl(layer, "opacity");
  const range = TRANSFORM_RANGES.opacity;

  return (
    <div className="space-y-1.5 pt-1">
      <span className="panel-label">Opacity</span>
      <div className="flex items-center gap-2">
        <KeyframeToggle
          state={control.toggleState}
          propertyLabel="Opacity"
          onToggle={control.toggleKeyframe}
        />
        <Slider
          aria-label="Opacity"
          value={control.value}
          onChange={control.setValue}
          min={range.min}
          max={range.max}
          step={range.step}
          className="flex-1"
        />
        <NumericField
          label="%"
          value={Math.round(control.value * 100)}
          onChange={(next) => control.setValue(next / 100)}
          min={0}
          max={100}
          step={1}
          decimals={0}
          className="w-[74px]"
        />
      </div>
    </div>
  );
}
