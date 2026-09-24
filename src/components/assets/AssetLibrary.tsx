"use client";

import { Check, Film, ImageOff, MonitorSmartphone, Trash2 } from "lucide-react";
import * as React from "react";

import { UploadDropzone } from "@/components/assets/UploadDropzone";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/panel";
import { IconButton } from "@/components/ui/icon-button";
import { notify } from "@/lib/toast";
import { cn, formatBytes } from "@/lib/utils";
import { useAssetStore } from "@/store/asset-store";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import type { ResolvedAsset } from "@/types/asset";
import type { DeviceLayerMetadata } from "@/types/layer";

export function AssetLibrary() {
  const assets = useAssetStore((state) => state.assets);
  const removeAsset = useAssetStore((state) => state.removeAsset);
  const removeAllAssets = useAssetStore((state) => state.removeAllAssets);

  const layers = useProjectStore((state) => state.project?.layers);
  const updateDeviceMetadata = useProjectStore((state) => state.updateDeviceMetadata);
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);

  const targetLayer = layers?.find((layer) => layer.id === selectedLayerId && layer.type === "device");

  const activeAssetId = ((targetLayer?.metadata ?? {}) as Partial<DeviceLayerMetadata>)
    .screenAssetId;

  const applyToScreen = React.useCallback(
    (asset: ResolvedAsset) => {
      if (!targetLayer) {
        notify.warning("No device on the canvas", "Add a device before assigning screen media.");
        return;
      }
      updateDeviceMetadata(targetLayer.id, { screenAssetId: asset.id });
      notify.success("Applied to device screen", asset.originalName);
    },
    [targetLayer, updateDeviceMetadata],
  );

  const handleRemove = React.useCallback(
    async (asset: ResolvedAsset) => {
      if (targetLayer && activeAssetId === asset.id) {
        updateDeviceMetadata(targetLayer.id, { screenAssetId: null });
      }
      await removeAsset(asset.id);
      notify.info("Asset removed", asset.originalName);
    },
    [activeAssetId, removeAsset, targetLayer, updateDeviceMetadata],
  );

  const removableAssets = assets.filter((asset) => !asset.storageKey.startsWith("builtin:"));

  const handleRemoveAll = React.useCallback(async () => {
    if (targetLayer && removableAssets.some((asset) => asset.id === activeAssetId)) {
      updateDeviceMetadata(targetLayer.id, { screenAssetId: null });
    }
    await removeAllAssets();
  }, [activeAssetId, removableAssets, removeAllAssets, targetLayer, updateDeviceMetadata]);

  return (
    <div className="space-y-3 p-3">
      <UploadDropzone
        compact
        onUploaded={(uploaded) => {
          const [first] = uploaded;
          if (first && targetLayer) applyToScreen(first);
        }}
      />

      {assets.length === 0 ? (
        <EmptyState
          icon={ImageOff}
          title="No media yet"
          description="Upload a screenshot to place it inside the device screen."
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 px-0.5">
            <p className="panel-label">Library · {assets.length}</p>
            {removableAssets.length > 0 ? (
              <Button
                type="button"
                variant="danger"
                size="xs"
                onClick={() => void handleRemoveAll()}
                className="h-6 px-2 text-[11px]"
              >
                <Trash2 className="h-3 w-3" />
                Delete all
              </Button>
            ) : null}
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {assets.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                active={asset.id === activeAssetId}
                onApply={() => applyToScreen(asset)}
                onRemove={() => void handleRemove(asset)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

interface AssetCardProps {
  asset: ResolvedAsset;
  active: boolean;
  onApply: () => void;
  onRemove: () => void;
}

function AssetCard({ asset, active, onApply, onRemove }: AssetCardProps) {
  return (
    <li
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("application/x-framelo-screen-asset", asset.id);
        event.dataTransfer.effectAllowed = "copy";
      }}
      className={cn(
        "group relative overflow-hidden rounded-md border transition-colors duration-150",
        active ? "border-accent/60" : "border-line hover:border-line-strong",
      )}
    >
      <button
        type="button"
        onClick={onApply}
        className="block w-full text-left"
        title={`Apply ${asset.originalName} to the selected device screen`}
      >
        <span className="relative flex h-20 w-full items-center justify-center overflow-hidden bg-canvas">
          {asset.type === "video" && !asset.posterUrl ? <Film className="h-7 w-7 text-ink-subtle" />
            : <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.posterUrl ?? asset.url} alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />
            </>}
          {asset.type === "video" ? <Film className="absolute right-1.5 bottom-1.5 h-4 w-4 text-white" /> : null}
          {active ? (
            <span className="absolute top-1.5 left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent">
              <Check className="h-2.5 w-2.5 text-accent-ink" />
            </span>
          ) : null}
        </span>
        <span className="block space-y-0.5 bg-surface-raised px-2 py-1.5">
          <span className="block truncate text-[11px] text-ink" title={asset.originalName}>
            {asset.originalName}
          </span>
          <span className="numeric block text-ink-subtle">
            {asset.type === "video" ? `Video${asset.duration ? ` · ${asset.duration.toFixed(1)}s` : ""}` : "Image"}
            {asset.size > 0 ? ` · ${formatBytes(asset.size)}` : ""}
          </span>
        </span>
      </button>

      <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
        <IconButton
          icon={MonitorSmartphone}
          label="Apply to selected screen"
          size="sm"
          onClick={onApply}
          className="bg-surface/90 backdrop-blur-sm"
          tooltipSide="left"
        />
        <IconButton
          icon={Trash2}
          label="Delete asset"
          size="sm"
          tone="danger"
          onClick={onRemove}
          className="bg-surface/90 backdrop-blur-sm"
          tooltipSide="left"
        />
      </div>
    </li>
  );
}
