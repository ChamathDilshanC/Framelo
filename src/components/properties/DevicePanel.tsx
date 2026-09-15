"use client";

import * as React from "react";

import { ColorField } from "@/components/ui/color-field";
import { NumericField } from "@/components/ui/numeric-field";
import { PanelRow, PanelSection } from "@/components/ui/panel";
import { Slider } from "@/components/ui/slider";
import { getDevice } from "@/devices/registry";
import { finishesFor } from "@/engine/devices/device-definitions";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/project-store";
import { DEFAULT_DEVICE_APPEARANCE, type DeviceFinish } from "@/types/device";
import type { DeviceLayerMetadata, Layer } from "@/types/layer";

/**
 * Device finish and shadow.
 *
 * Finishes recolour the imported model's own PBR materials — cloned per layer,
 * derived from the import each time — so switching between them is reversible
 * and never touches the screen, glass, lenses or sensors.
 */
export function DevicePanel({ layer }: { layer: Layer }) {
  const metadata = (layer.metadata ?? {}) as Partial<DeviceLayerMetadata>;
  const updateDeviceMetadata = useProjectStore((state) => state.updateDeviceMetadata);

  const device = getDevice(metadata.deviceId ?? "");
  const finishes = finishesFor(device);
  const appearance = metadata.deviceAppearance ?? DEFAULT_DEVICE_APPEARANCE;
  const isCustom = appearance.finish === "custom";

  function setFinish(finish: DeviceFinish) {
    updateDeviceMetadata(layer.id, {
      deviceAppearance: {
        finish: finish.id,
        // Seed the picker from the finish that was active, so opening Custom
        // starts from what is already on screen rather than jumping.
        bodyColor: finish.id === "custom" ? (appearance.bodyColor ?? finish.tint) : appearance.bodyColor,
      },
    });
  }

  function setBodyColor(bodyColor: string) {
    updateDeviceMetadata(layer.id, {
      deviceAppearance: { finish: "custom", bodyColor },
    });
  }

  return (
    <PanelSection title="Device">
      <div className="space-y-1.5">
        <span className="panel-label">{device.name} finish</span>
        <div className="grid grid-cols-3 gap-1.5">
          {finishes.map((finish) => (
            <FinishSwatch
              key={finish.id}
              finish={finish}
              color={finish.custom ? (appearance.bodyColor ?? finish.tint) : finish.tint}
              active={appearance.finish === finish.id}
              onSelect={() => setFinish(finish)}
            />
          ))}
        </div>
      </div>

      {isCustom ? (
        <div className="space-y-1.5 rounded-sm border border-line bg-surface-raised/60 p-2">
          <ColorField
            label="Body colour"
            value={appearance.bodyColor ?? "#b6b1a8"}
            onChange={setBodyColor}
          />
          <div className="flex gap-1.5">
            {CUSTOM_SWATCHES.map((swatch) => (
              <button
                key={swatch.value}
                type="button"
                title={swatch.label}
                aria-label={swatch.label}
                onClick={() => setBodyColor(swatch.value)}
                className={cn(
                  "h-4 flex-1 rounded-xs border transition-transform duration-150 hover:scale-105",
                  swatch.value === appearance.bodyColor
                    ? "border-accent"
                    : "border-line hover:border-line-strong",
                )}
                style={{ backgroundColor: swatch.value }}
              />
            ))}
          </div>
          <p className="text-[10px] leading-relaxed text-ink-subtle">
            Applies to the body and rails only. The display, camera glass, lenses and sensors keep
            their own materials.
          </p>
        </div>
      ) : null}

      <PanelRow label="Shadow">
        <Slider
          aria-label="Shadow intensity"
          value={metadata.shadowIntensity ?? 0.55}
          onChange={(value) => updateDeviceMetadata(layer.id, { shadowIntensity: value })}
          min={0}
          max={1}
          step={0.01}
          className="flex-1"
        />
        <NumericField
          label="%"
          value={Math.round((metadata.shadowIntensity ?? 0.55) * 100)}
          onChange={(value) => updateDeviceMetadata(layer.id, { shadowIntensity: value / 100 })}
          min={0}
          max={100}
          step={1}
          decimals={0}
          className="w-[64px]"
        />
      </PanelRow>
    </PanelSection>
  );
}

const CUSTOM_SWATCHES = [
  { label: "Midnight", value: "#1c1d21" },
  { label: "Titanium", value: "#b6b1a8" },
  { label: "Desert", value: "#c9a227" },
  { label: "Ultramarine", value: "#3a4a8b" },
  { label: "Rose", value: "#c98b8b" },
  { label: "Sage", value: "#8fa58c" },
];

function FinishSwatch({
  finish,
  color,
  active,
  onSelect,
}: {
  finish: DeviceFinish;
  color: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-sm border px-1.5 py-2 text-[10px] transition-colors duration-150",
        active
          ? "border-accent/60 bg-accent-soft text-ink"
          : "border-line bg-surface-raised text-ink-muted hover:border-line-strong hover:text-ink",
      )}
    >
      <span
        className="h-4 w-4 rounded-full border border-black/30 shadow-inner"
        style={{
          // A two-stop wash reads as metal rather than as a flat paint chip.
          backgroundImage: `linear-gradient(140deg, ${color}, color-mix(in srgb, ${color} 65%, #000))`,
        }}
      />
      {finish.label}
    </button>
  );
}
