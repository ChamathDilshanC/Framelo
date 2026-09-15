"use client";

import { Clapperboard, Search } from "lucide-react";
import * as React from "react";

import { DeviceMotionCard } from "@/components/motion/DeviceMotionCard";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/panel";
import { presetPreview } from "@/engine/motion/preset-preview";
import { buildDeviceMotion } from "@/engine/templates/device-motion-builder";
import {
  DEVICE_MOTION_CATEGORY_LABELS,
  activeDeviceMotionCategories,
  searchDeviceMotionTemplates,
  type DeviceMotionCategory,
  type DeviceMotionTemplate,
} from "@/engine/templates/device-motion-templates";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { resolveDeviceMotionTemplates, useMotionStore } from "@/store/motion-store";
import { useProjectStore } from "@/store/project-store";

/** A preview stops on its own rather than running until someone notices. */
const PREVIEW_TIMEOUT_MS = 14_000;

/**
 * The device motion template library.
 *
 * Preview runs through the same `presetPreview` channel the motion presets use:
 * generated tracks held outside the project and read by the renderer in place
 * of the layer's own. That is what makes "preview must not mutate the project"
 * true by construction rather than by care — there is no code path from here to
 * the project store until Apply is pressed.
 *
 * Apply asks first, because a choreography takes the device's pose and the
 * composition's length. Those are big enough changes to be worth a sentence.
 */
export function DeviceMotionBrowser() {
  const layers = useProjectStore((state) => state.project?.layers);
  const appliedId = useProjectStore((state) => state.project?.deviceMotionTemplateId);
  const applyDeviceMotionTemplate = useProjectStore((state) => state.applyDeviceMotionTemplate);
  const setDuration = useEditorStore((state) => state.setDuration);

  const favorites = useMotionStore((state) => state.templateFavorites);
  const recent = useMotionStore((state) => state.templateRecent);
  const hydrate = useMotionStore((state) => state.hydrate);
  const toggleFavorite = useMotionStore((state) => state.toggleTemplateFavorite);
  const markUsed = useMotionStore((state) => state.markTemplateUsed);

  const [category, setCategory] = React.useState<DeviceMotionCategory | "all">("all");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [previewingId, setPreviewingId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<DeviceMotionTemplate | null>(null);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Always the device layer, never "whatever is selected". A choreography is
  // about the device; applying one while a caption happened to be selected
  // would animate the caption and leave the device where it was.
  const deviceLayer = layers?.find((layer) => layer.type === "device") ?? null;

  const results = React.useMemo(
    () => searchDeviceMotionTemplates(category, query),
    [category, query],
  );

  const stopPreview = React.useCallback(() => {
    presetPreview.stop();
    setPreviewingId(null);
  }, []);

  // Leaving the panel must not strand a preview: it would keep overriding the
  // device with tracks nothing owns.
  React.useEffect(() => stopPreview, [stopPreview]);

  React.useEffect(() => {
    if (!previewingId) return;
    const timer = window.setTimeout(stopPreview, PREVIEW_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [previewingId, stopPreview]);

  const startPreview = React.useCallback(
    (template: DeviceMotionTemplate) => {
      if (!deviceLayer) return;

      const build = buildDeviceMotion(template, deviceLayer);

      presetPreview.start({
        layerId: deviceLayer.id,
        presetId: template.id,
        presetName: template.name,
        tracks: build.tracks,
        duration: build.duration,
      });

      setPreviewingId(template.id);
      notify.info(`${template.name} preview`, "Nothing is written until you apply it.");
    },
    [deviceLayer],
  );

  const apply = React.useCallback(
    (template: DeviceMotionTemplate) => {
      if (!deviceLayer) return;

      stopPreview();

      const build = buildDeviceMotion(template, deviceLayer);
      const ok = applyDeviceMotionTemplate(deviceLayer.id, template, build);

      if (!ok) {
        notify.error("Could not apply the template");
        return;
      }

      markUsed(template.id);
      setDuration(build.duration);

      const editor = useEditorStore.getState();
      editor.setCurrentTime(0);
      editor.selectLayer(deviceLayer.id);
      if (template.cameraView) editor.setCameraView(template.cameraView);

      notify.success(
        `${template.name} applied`,
        `${build.tracks.length} tracks on the timeline, ${build.duration}s composition.`,
      );
    },
    [deviceLayer, applyDeviceMotionTemplate, markUsed, setDuration, stopPreview],
  );

  if (!deviceLayer) {
    return (
      <EmptyState
        icon={Clapperboard}
        title="No device in this project"
        description="Device motion templates choreograph a device. Add one from the Devices tab."
      />
    );
  }

  const renderCard = (template: DeviceMotionTemplate) => (
    <DeviceMotionCard
      key={template.id}
      template={template}
      selected={selectedId === template.id}
      favorite={favorites.includes(template.id)}
      previewing={previewingId === template.id}
      applied={appliedId === template.id}
      onSelect={() => setSelectedId((current) => (current === template.id ? null : template.id))}
      onPreview={() => startPreview(template)}
      onStopPreview={stopPreview}
      onApply={() => setPending(template)}
      onToggleFavorite={() => toggleFavorite(template.id)}
    />
  );

  const favoriteTemplates = resolveDeviceMotionTemplates(favorites);
  const recentTemplates = resolveDeviceMotionTemplates(recent);

  return (
    <div className="space-y-3 p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-ink-subtle" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search device motion…"
          aria-label="Search device motion templates"
          className="h-7 w-full rounded-sm border border-line bg-surface-raised pr-2 pl-7 text-[11px] text-ink placeholder:text-ink-subtle focus:border-accent/60 focus:outline-none"
        />
      </div>

      <div className="-mx-0.5 flex gap-1 overflow-x-auto px-0.5 pb-1">
        {(["all", ...activeDeviceMotionCategories()] as const).map((entry) => (
          <button
            key={entry}
            type="button"
            aria-pressed={category === entry}
            onClick={() => setCategory(entry)}
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] transition-colors duration-150",
              category === entry
                ? "border-accent/60 bg-accent-soft text-ink"
                : "border-line bg-surface-raised text-ink-subtle hover:border-line-strong hover:text-ink-muted",
            )}
          >
            {entry === "all" ? "All" : DEVICE_MOTION_CATEGORY_LABELS[entry]}
          </button>
        ))}
      </div>

      {/* Recent and favourites while browsing only. A search is a specific
          question, and these would bury the answer. */}
      {!query && category === "all" && (recentTemplates.length > 0 || favoriteTemplates.length > 0) ? (
        <>
          {recentTemplates.length > 0 ? (
            <Section title="Recent">{recentTemplates.map(renderCard)}</Section>
          ) : null}
          {favoriteTemplates.length > 0 ? (
            <Section title="Favourites">{favoriteTemplates.map(renderCard)}</Section>
          ) : null}
        </>
      ) : null}

      <div className="space-y-1.5">
        <span className="panel-label">
          {query || category !== "all" ? `${results.length} templates` : "All device motion"}
        </span>

        {results.length === 0 ? (
          <p className="px-0.5 py-4 text-center text-[11px] text-ink-subtle">
            No device motion template matches that.
          </p>
        ) : (
          <div className="space-y-1.5">{results.map(renderCard)}</div>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        tone="default"
        title={`Apply ${pending?.name ?? ""}?`}
        description={
          pending
            ? `This replaces the device's pose and its animation, and makes the composition ${pending.duration}s.${
                pending.background ? " It also sets the background." : ""
              } Your canvas size, text layers and screen image are kept. One undo takes it all back.`
            : ""
        }
        confirmLabel="Apply"
        onConfirm={() => {
          if (pending) apply(pending);
          setPending(null);
        }}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode[] }) {
  return (
    <div className="space-y-1.5">
      <span className="panel-label">{title}</span>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
