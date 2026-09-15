"use client";

import { Camera, Smartphone } from "lucide-react";

import { PanelSection } from "@/components/ui/panel";
import {
  CAMERA_VIEWS,
  DEVICE_TRANSFORM_PRESETS,
  matchesTransformPreset,
  type DeviceTransformPreset,
} from "@/engine/devices/device-presets";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import type { Layer } from "@/types/layer";

/**
 * The two ways to change what the shot looks like, kept visibly apart.
 *
 * **Device presets** write the layer's rotation. They are project data: they
 * land on keyframes when a property is animated, and they are what the export
 * renders.
 *
 * **Camera views** move the viewport only. Nothing about them is saved into the
 * project, and nothing about them is animated.
 */
export function ViewPresetsPanel({ layer }: { layer: Layer }) {
  return (
    <PanelSection title="Presets">
      <DevicePresets layer={layer} />
      <CameraPresets />
    </PanelSection>
  );
}

function DevicePresets({ layer }: { layer: Layer }) {
  const setTransformValue = useProjectStore((state) => state.setTransformValue);
  const currentTime = useEditorStore((state) => state.currentTime);

  function apply(preset: DeviceTransformPreset) {
    // Routed through setTransformValue, so a preset applied while a rotation is
    // animated writes a keyframe at the playhead rather than silently fighting
    // the timeline.
    for (const [property, value] of Object.entries(preset.rotation)) {
      setTransformValue(layer.id, property as "rotationX", value, {
        time: currentTime,
        coalesceKey: `preset:${layer.id}`,
      });
    }
    notify.info(`${preset.label} angle applied`, preset.description);
  }

  return (
    <div className="space-y-1.5">
      <span className="panel-label flex items-center gap-1.5">
        <Smartphone className="h-3 w-3" /> Device angle
      </span>
      <div className="grid grid-cols-2 gap-1.5">
        {DEVICE_TRANSFORM_PRESETS.map((preset) => {
          const active = matchesTransformPreset(layer.transform, preset);
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              title={preset.description}
              onClick={() => apply(preset)}
              className={cn(
                "rounded-sm border px-2 py-1.5 text-[11px] font-medium transition-colors duration-150",
                active
                  ? "border-accent/60 bg-accent-soft text-ink"
                  : "border-line bg-surface-raised text-ink-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CameraPresets() {
  const view = useEditorStore((state) => state.cameraView);
  const setCameraView = useEditorStore((state) => state.setCameraView);

  return (
    <div className="space-y-1.5 pt-1">
      <span className="panel-label flex items-center gap-1.5">
        <Camera className="h-3 w-3" /> Camera
      </span>
      <div className="grid grid-cols-3 gap-1.5">
        {CAMERA_VIEWS.map((entry) => {
          const active = entry.id === view;
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={active}
              disabled={entry.id === "custom"}
              title={
                entry.id === "custom"
                  ? "Set by dragging in the viewport"
                  : `Move the camera to the ${entry.label.toLowerCase()} view`
              }
              onClick={() => setCameraView(entry.id)}
              className={cn(
                "rounded-sm border px-1.5 py-1.5 text-[10px] font-medium transition-colors duration-150",
                active
                  ? "border-accent/60 bg-accent-soft text-ink"
                  : "border-line bg-surface-raised text-ink-muted hover:border-line-strong hover:text-ink",
                entry.id === "custom" && "cursor-default disabled:opacity-70",
              )}
            >
              {entry.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] leading-relaxed text-ink-subtle">
        Camera views frame the shot and are never animated — the timeline only
        drives the device.
      </p>
    </div>
  );
}
