"use client";
/* eslint-disable @next/next/no-img-element -- Browser-local asset URLs cannot use image optimisation. */

import { Film, ImageOff, Replace, RotateCcw, Upload } from "lucide-react";

import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { ACCEPTED_MEDIA_EXTENSIONS } from "@/lib/constants";
import { templateScreenUrl } from "@/engine/templates/screen-artwork";
import { Button } from "@/components/ui/button";
import { NumericField } from "@/components/ui/numeric-field";
import { PanelRow, PanelSection } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { Slider } from "@/components/ui/slider";
import { useAssetStore } from "@/store/asset-store";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import type { DeviceLayerMetadata, Layer, ScreenFit } from "@/types/layer";

const FIT_OPTIONS: Array<{ value: ScreenFit; label: string }> = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "fill", label: "Stretch" },
];

/**
 * Screen media and its colour adjustments.
 *
 * Every control here is a shader uniform on the display material. Nothing is
 * baked into the uploaded image, so the adjustments are free to change, free to
 * undo, and the original file is never rewritten.
 */
const FILTERS = [
  { key: "screenBrightness", label: "Brightness", min: 0.2, max: 2 },
  { key: "screenContrast", label: "Contrast", min: 0, max: 2 },
  { key: "screenSaturation", label: "Saturation", min: 0, max: 2 },
] as const;

export function ScreenPanel({ layer }: { layer: Layer }) {
  const metadata = (layer.metadata ?? {}) as Partial<DeviceLayerMetadata>;
  const updateDeviceMetadata = useProjectStore((state) => state.updateDeviceMetadata);
  const assets = useAssetStore((state) => state.assets);
  const uploadFiles = useAssetStore((state) => state.uploadFiles);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const setLeftPanelTab = useEditorStore((state) => state.setLeftPanelTab);

  const screenAsset = assets.find((asset) => asset.id === metadata.screenAssetId);
  const filtersAtDefault = FILTERS.every(({ key }) => (metadata[key] ?? 1) === 1);
  const imageTransformAtDefault =
    (metadata.screenZoom ?? 1) === 1 &&
    (metadata.screenCropX ?? 0) === 0 &&
    (metadata.screenCropY ?? 0) === 0;

  return (
    <PanelSection title="Screen media">
      <p className="mb-2 text-[11px] font-medium text-ink">{layer.name}</p>
      <input ref={inputRef} type="file" accept={ACCEPTED_MEDIA_EXTENSIONS} className="sr-only"
        aria-label={`Upload screen media for ${layer.name}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void uploadFiles([file]).then(([asset]) => {
            if (asset) updateDeviceMetadata(layer.id, { screenAssetId: asset.id });
          });
        }} />
      <div className="space-y-2">
        <div className="flex min-w-0 items-center gap-2 rounded-sm border border-line bg-surface-raised p-2">
          {screenAsset?.type === "video" ? screenAsset.posterUrl
            ? <img src={screenAsset.posterUrl} alt="" className="h-12 w-9 shrink-0 rounded-xs object-cover" />
            : <Film className="h-5 w-5 shrink-0 text-accent" />
            : <img src={screenAsset?.url ?? templateScreenUrl(metadata.screenArtwork) ?? "/reference/studio-reference.png"}
                alt="" className="h-12 w-9 shrink-0 rounded-xs object-cover" />}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-ink">{screenAsset?.originalName ?? "Template screen artwork"}</p>
            <p className="text-[10px] text-ink-subtle">{screenAsset?.type === "video"
              ? `${screenAsset.duration?.toFixed(1) ?? "—"}s · video`
              : screenAsset ? "Image" : "Replaceable default"}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button size="xs" variant="secondary" className="flex-1" onClick={() => inputRef.current?.click()}>
            {screenAsset ? <Replace className="h-3 w-3" /> : <Upload className="h-3 w-3" />}
            {screenAsset ? "Replace" : "Upload media"}
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setLeftPanelTab("assets")}>Assets</Button>
          {screenAsset ? <Button size="xs" variant="ghost" aria-label="Remove screen media"
            onClick={() => updateDeviceMetadata(layer.id, { screenAssetId: null })}>
            <ImageOff className="h-3 w-3" /> Remove
          </Button> : null}
        </div>
        <p className="text-[10px] text-ink-subtle">PNG, JPG, WebP, MP4 or WebM</p>
      </div>

      <PanelRow label="Fit">
        <Segmented
          aria-label="Screen fit"
          value={metadata.screenFit ?? "cover"}
          onChange={(value) => updateDeviceMetadata(layer.id, { screenFit: value })}
          options={FIT_OPTIONS}
        />
      </PanelRow>
      <p className="text-[10px] text-ink-subtle">
        With Cover selected, hold and drag the image on the device to reposition the crop.
      </p>
      <div className="space-y-2 border-t border-line pt-2">
        <div className="flex items-center justify-between">
          <span className="panel-label">Image position &amp; zoom</span>
          {!imageTransformAtDefault ? (
            <Button
              size="xs"
              variant="ghost"
              onClick={() => updateDeviceMetadata(layer.id, {
                screenZoom: 1,
                screenCropX: 0,
                screenCropY: 0,
              })}
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
          ) : null}
        </div>
        <PanelRow label="Zoom">
          <Slider
            aria-label="Screen image zoom"
            value={metadata.screenZoom ?? 1}
            onChange={(screenZoom) => updateDeviceMetadata(layer.id, { screenZoom })}
            min={0.2}
            max={3}
            step={0.01}
            className="flex-1"
          />
          <NumericField
            label="×"
            value={metadata.screenZoom ?? 1}
            onChange={(screenZoom) => updateDeviceMetadata(layer.id, { screenZoom })}
            min={0.2}
            max={3}
            step={0.01}
            decimals={2}
            className="w-[64px]"
          />
        </PanelRow>
        <PanelRow label="Horizontal">
          <Slider
            aria-label="Screen image horizontal position"
            value={metadata.screenCropX ?? 0}
            onChange={(screenCropX) => updateDeviceMetadata(layer.id, { screenCropX })}
            min={-1}
            max={1}
            step={0.01}
            className="flex-1"
          />
        </PanelRow>
        <PanelRow label="Vertical">
          <Slider
            aria-label="Screen image vertical position"
            value={metadata.screenCropY ?? 0}
            onChange={(screenCropY) => updateDeviceMetadata(layer.id, { screenCropY })}
            min={-1}
            max={1}
            step={0.01}
            className="flex-1"
          />
        </PanelRow>
      </div>

      {screenAsset?.type === "video" ? <div className="space-y-1.5 border-t border-line pt-2">
        <span className="panel-label">Video</span>
        <div className="flex items-center justify-between text-[11px] text-ink-muted">Loop
          <Switch aria-label="Loop screen video" checked={metadata.videoLoop ?? true}
            onCheckedChange={(videoLoop) => updateDeviceMetadata(layer.id, { videoLoop })} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-ink-muted">Muted
          <Switch aria-label="Mute screen video" checked={metadata.videoMuted ?? true}
            onCheckedChange={(videoMuted) => updateDeviceMetadata(layer.id, { videoMuted })} />
        </div>
      </div> : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="panel-label">Filters</span>
          {!filtersAtDefault ? (
            <Button
              size="xs"
              variant="ghost"
              onClick={() =>
                updateDeviceMetadata(layer.id, {
                  screenBrightness: 1,
                  screenContrast: 1,
                  screenSaturation: 1,
                })
              }
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          ) : null}
        </div>

        {FILTERS.map(({ key, label, min, max }) => (
          <PanelRow key={key} label={label}>
            <Slider
              aria-label={`Screen ${label.toLowerCase()}`}
              value={metadata[key] ?? 1}
              onChange={(value) => updateDeviceMetadata(layer.id, { [key]: value })}
              min={min}
              max={max}
              step={0.01}
              className="flex-1"
            />
            <NumericField
              label="×"
              value={metadata[key] ?? 1}
              onChange={(value) => updateDeviceMetadata(layer.id, { [key]: value })}
              min={min}
              max={max}
              step={0.01}
              decimals={2}
              className="w-[64px]"
            />
          </PanelRow>
        ))}
      </div>
    </PanelSection>
  );
}
