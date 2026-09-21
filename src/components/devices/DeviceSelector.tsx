"use client";

import { Check, Lock, Plus } from "lucide-react";
import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { preloadDeviceModel } from "@/engine/devices/model-loader";
import { DEVICES } from "@/devices/registry";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import type { DeviceDefinition } from "@/types/device";
import type { DeviceLayerMetadata } from "@/types/layer";

/**
 * The device library.
 *
 * Devices are read straight from the registry, so shipping a new one is a
 * definition file and a GLB — this component never learns about it.
 */
export function DeviceSelector() {
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const layers = useProjectStore((state) => state.project?.layers);
  const updateDeviceMetadata = useProjectStore((state) => state.updateDeviceMetadata);
  const renameLayer = useProjectStore((state) => state.renameLayer);

  const targetLayer = layers?.find((layer) => layer.id === selectedLayerId && layer.type === "device");

  const currentDeviceId = ((targetLayer?.metadata ?? {}) as Partial<DeviceLayerMetadata>).deviceId;

  const modelled = DEVICES.filter((device) => device.available);
  const upcoming = DEVICES.filter((device) => !device.available);

  function addBlankDevice(device: DeviceDefinition) {
    const id = useProjectStore.getState().addDeviceLayer(device.id);
    if (!id) return;
    const editor = useEditorStore.getState();
    editor.pause();
    editor.selectLayer(id);
    editor.requestCameraReset();
    notify.success(`${device.name} added`, "Blank editable device. Upload an image or video to its screen.");
  }

  function selectDevice(device: DeviceDefinition) {
    if (!device.available) {
      notify.info(`${device.name} is coming soon`, "The device library grows in the next release.");
      return;
    }
    if (!targetLayer) {
      addBlankDevice(device);
      return;
    }
    if (currentDeviceId === device.id) return;

    // A layer still carrying the old device's name would be misleading in the
    // layer list and the timeline; a renamed one is the user's own.
    const previousName = layers?.find((layer) => layer.id === targetLayer.id)?.name;
    const wasDefaultName = DEVICES.some((entry) => entry.name === previousName);

    updateDeviceMetadata(targetLayer.id, { deviceId: device.id });
    if (wasDefaultName) renameLayer(targetLayer.id, device.name);
    useEditorStore.getState().selectLayer(targetLayer.id);

    notify.info(`${device.name} selected`, "Loading the photorealistic model…");
  }

  return (
    <div className="space-y-4 p-3">
      <div className="space-y-2">
        {modelled.map((device) => (
          <div key={device.id} className="space-y-1">
          <DeviceCard
            device={device}
            selected={device.id === currentDeviceId}
            actionLabel={targetLayer ? "Replace selected device" : "Add blank device"}
            onSelect={() => selectDevice(device)}
          />
          <button type="button" aria-label={`Add blank ${device.name}`} onClick={() => addBlankDevice(device)}
            className="flex w-full items-center justify-center gap-1 rounded border border-line py-1.5 text-[10px] text-ink-muted hover:bg-surface-hover">
            <Plus className="size-3" /> Add blank
          </button>
          </div>
        ))}
      </div>

      {upcoming.length > 0 ? (
        <div className="space-y-2">
          <span className="panel-label px-0.5">Coming soon</span>
          <div className="grid grid-cols-3 gap-1.5">
            {upcoming.map((device) => (
              <UpcomingCard key={device.id} device={device} onSelect={() => selectDevice(device)} />
            ))}
          </div>
        </div>
      ) : null}

      <ModelCredits />
    </div>
  );
}

interface DeviceCardProps {
  device: DeviceDefinition;
  selected: boolean;
  actionLabel: string;
  onSelect: () => void;
}

function DeviceCard({ device, selected, actionLabel, onSelect }: DeviceCardProps) {
  return (
    <button
      type="button"
      onPointerEnter={() => { void preloadDeviceModel(device).catch(() => {}); }}
      onFocus={() => { void preloadDeviceModel(device).catch(() => {}); }}
      onClick={onSelect}
      aria-pressed={selected}
      title={device.description}
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-md border p-2.5 text-left transition-colors duration-150",
        selected
          ? "border-accent/60 bg-accent-soft"
          : "border-line bg-surface-raised hover:border-line-strong hover:bg-surface-hover",
      )}
    >
      <DeviceThumbnail device={device} selected={selected} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-medium text-ink">{device.name}</span>
        <span className="numeric mt-0.5 block text-[10px] text-ink-subtle">
          {device.ratioLabel ?? formatRatio(device.screenAspect)}
          {device.model ? " · 3D model" : null}
        </span>
        <span
          className={cn(
            "mt-1 block text-[10px] font-medium",
            selected ? "text-accent" : "text-ink-subtle/70",
          )}
        >
          {selected ? "Selected" : actionLabel}
        </span>
      </span>

      {selected ? (
        <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-accent">
          <Check className="h-2.5 w-2.5 text-accent-ink" />
        </span>
      ) : null}
    </button>
  );
}

function UpcomingCard({
  device,
  onSelect,
}: {
  device: DeviceDefinition;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      title={device.description}
      className="flex flex-col items-center gap-1 rounded-sm border border-line bg-surface-raised/60 px-1.5 py-2 opacity-70 transition-opacity duration-150 hover:opacity-100"
    >
      <Lock className="h-2.5 w-2.5 text-ink-subtle" />
      <span className="truncate text-[10px] text-ink-muted">{device.name}</span>
    </button>
  );
}

/**
 * A CSS silhouette rather than a rendered preview.
 *
 * A real thumbnail would mean loading every GLB just to populate a sidebar —
 * tens of megabytes for an image the size of a stamp.
 */
function DeviceThumbnail({ device, selected }: { device: DeviceDefinition; selected: boolean }) {
  const aspect = device.body.width / device.body.height;

  return (
    <span
      className={cn(
        "flex h-14 w-11 shrink-0 items-center justify-center rounded-sm border transition-colors",
        selected ? "border-accent/40 bg-accent/8" : "border-line bg-canvas",
      )}
    >
      <span
        className={cn(
          "relative flex flex-col overflow-hidden rounded-[4px] border bg-gradient-to-b from-[#2c2d33] to-[#141419] shadow-sm shadow-black/50",
          selected ? "border-accent/50" : "border-line-strong",
        )}
        style={{ height: `${Math.min(44, 34 / aspect)}px`, width: `${Math.min(34, Math.max(18, aspect * 44))}px` }}
      >
        {/* Display */}
        <span className="absolute inset-[2px] rounded-[3px] bg-gradient-to-br from-[#1b1b26] to-[#0b0b10]" />
        {/* Dynamic Island */}
        {device.features?.dynamicIsland ? (
          <span className="absolute top-[4px] left-1/2 h-[3px] w-[9px] -translate-x-1/2 rounded-full bg-[#05050a]" />
        ) : null}
        {/* Camera plateau hint on the rail */}
        <span className="absolute top-[6px] -left-[1px] h-[7px] w-[1px] rounded-full bg-ink-subtle/40" />
      </span>
    </span>
  );
}

/** Normalised to 9 on the short side, the way phone displays are quoted. */
function formatRatio(aspect: number): string {
  if (!Number.isFinite(aspect) || aspect <= 0) return "—";
  const long = Math.round((aspect > 1 ? aspect * 9 : 9 / aspect) * 10) / 10;
  return aspect > 1 ? `${long} : 9` : `9 : ${long}`;
}

/**
 * Required attribution for the bundled models.
 *
 * The models are CC BY 4.0, which means the credit travels with them — so it
 * lives next to the picker where the devices are chosen, not only in a file.
 */
const MODEL_AUTHORS = [
  { device: "iPhone 15 Pro Max", author: "Sketcher", url: "https://sketchfab.com/jnanbr07" },
  { device: "iPhone 17 Pro Max", author: "MajdyModels", url: "https://sketchfab.com/MG990" },
  { device: "iPhone 17 Pro", author: "Ranguel", url: "https://sketchfab.com/Ranguel" },
];

function ModelCredits() {
  return (
    <Alert tone="info" title="3D model credits">
      <span className="block space-y-0.5">
        {MODEL_AUTHORS.map((entry) => (
          <span key={entry.device} className="block">
            {entry.device} —{" "}
            <a
              href={entry.url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-ink"
            >
              {entry.author}
            </a>
          </span>
        ))}
        <span className="block pt-1">
          iPad and MacBook: original Framelo studio geometry. iPhone Sketchfab assets under{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-ink"
          >
            CC BY 4.0
          </a>
          . Not official Apple assets.
        </span>
      </span>
    </Alert>
  );
}
