"use client";

import { Search, Sparkles } from "lucide-react";
import * as React from "react";

import { MotionPresetCard } from "@/components/motion/MotionPresetCard";
import { PresetConflictDialog } from "@/components/motion/PresetConflictDialog";
import { PresetParameters } from "@/components/motion/PresetParameters";
import { EmptyState } from "@/components/ui/panel";
import {
  activeMotionCategories,
  searchMotionPresets,
} from "@/engine/motion/motion-presets";
import {
  generateTracks,
  planDuration,
  presetProperties,
  type DurationStrategy,
} from "@/engine/motion/preset-generator";
import { presetPreview } from "@/engine/motion/preset-preview";
import {
  DEFAULT_PRESET_PARAMETERS,
  MOTION_CATEGORY_LABELS,
  type MotionCategory,
  type MotionPresetDefinition,
  type MotionPresetParameters,
} from "@/engine/motion/preset-types";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { resolvePresets, useMotionStore } from "@/store/motion-store";
import { useProjectStore } from "@/store/project-store";
import { PROPERTY_LABELS } from "@/types/animation";
import type { Layer } from "@/types/layer";

/** How long a preview runs before stopping on its own. */
const PREVIEW_TIMEOUT_MS = 12_000;

/**
 * Which half of the preset library this browser is showing.
 *
 * The split is by what a preset *is for*, not by what it can be applied to:
 * "Rise In" animates Y and opacity and works perfectly well on a headline, so
 * it stays in the general library and is offered for a text layer too. The text
 * library is the presets that only make sense on text — a typewriter needs
 * something to type, and a word reveal needs words.
 *
 * Splitting them the other way, by capability, would put thirty-nine device
 * presets in the Text tab and make finding the four typewriters impossible.
 */
export type PresetScope = "device" | "text";

/**
 * The motion library.
 *
 * Presets are data and this is the only place that knows about the UI for
 * them; adding a preset never touches this file. Preview and Apply share the
 * same generator, so what plays is exactly what gets written.
 */
export function MotionPresetBrowser({ scope = "device" }: { scope?: PresetScope } = {}) {
  const layers = useProjectStore((state) => state.project?.layers);
  const projectDuration = useProjectStore((state) => state.project?.canvas.duration ?? 5);
  const applyMotionPreset = useProjectStore((state) => state.applyMotionPreset);
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const setDuration = useEditorStore((state) => state.setDuration);

  const favorites = useMotionStore((state) => state.favorites);
  const recent = useMotionStore((state) => state.recent);
  const hydrate = useMotionStore((state) => state.hydrate);
  const toggleFavorite = useMotionStore((state) => state.toggleFavorite);
  const markUsed = useMotionStore((state) => state.markUsed);

  const [category, setCategory] = React.useState<MotionCategory | "all">("all");
  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [parameters, setParameters] = React.useState<MotionPresetParameters>(
    DEFAULT_PRESET_PARAMETERS,
  );
  const [previewingId, setPreviewingId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<PendingApply | null>(null);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  // The layer a preset would land on.
  //
  // The selection wins when it is the right kind for this tab; otherwise the
  // tab falls back to the first layer of its kind. Without that, opening Text
  // Presets with the device selected would offer a typewriter and then apply
  // it to a phone.
  const wanted = scope === "text" ? "text" : "device";
  const selected = layers?.find((layer) => layer.id === selectedLayerId) ?? null;
  const targetLayer =
    (selected?.type === wanted ? selected : null) ??
    layers?.find((layer) => layer.type === wanted) ??
    (scope === "device" ? selected : null) ??
    null;

  const results = React.useMemo(() => {
    const found = searchMotionPresets(category, query, targetLayer?.type);
    return found.filter((preset) => inScope(preset, scope));
  }, [category, query, targetLayer?.type, scope]);
  // Recent and Favourites are filtered by layer kind too. They are stored
  // across sessions and across layers, so without this a device preset used
  // yesterday is offered for a headline today — and applying it would appear
  // to succeed while animating nothing.
  const usable = React.useCallback(
    (preset: MotionPresetDefinition) =>
      inScope(preset, scope) &&
      (!targetLayer || !preset.appliesTo || preset.appliesTo.includes(targetLayer.type)),
    [targetLayer, scope],
  );

  const favoritePresets = React.useMemo(
    () => resolvePresets(favorites).filter(usable),
    [favorites, usable],
  );
  const recentPresets = React.useMemo(
    () => resolvePresets(recent).filter(usable),
    [recent, usable],
  );

  // --- Preview --------------------------------------------------------------
  const stopPreview = React.useCallback(() => {
    presetPreview.stop();
    setPreviewingId(null);
  }, []);

  // Leaving the panel, unmounting or switching layers must not strand a
  // preview: it would keep overriding the device with tracks nothing owns.
  React.useEffect(() => stopPreview, [stopPreview]);

  React.useEffect(() => {
    if (!previewingId) return;
    const timer = window.setTimeout(stopPreview, PREVIEW_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [previewingId, stopPreview]);

  const startPreview = React.useCallback(
    (preset: MotionPresetDefinition, params: MotionPresetParameters) => {
      if (!targetLayer) {
        notify.warning("Nothing to animate", "Select a layer first.");
        return;
      }

      const plan = planDuration(preset, projectDuration, "fit");
      const tracks = generateTracks(
        preset,
        {
          baseTransform: targetLayer.transform,
          baseMetadata: targetLayer.metadata,
          duration: plan.presetSpan,
        },
        params,
      );

      presetPreview.start({
        layerId: targetLayer.id,
        presetId: preset.id,
        presetName: preset.name,
        tracks,
        duration: plan.presetSpan,
      });

      setPreviewingId(preset.id);
      notify.info(`${preset.name} preview`, "Nothing is written until you apply it.");
    },
    [targetLayer, projectDuration],
  );

  // --- Apply ----------------------------------------------------------------
  const commit = React.useCallback(
    (preset: MotionPresetDefinition, params: MotionPresetParameters, strategy: DurationStrategy) => {
      if (!targetLayer) return;

      stopPreview();

      const result = applyMotionPreset(targetLayer.id, preset, {
        parameters: params,
        durationStrategy: strategy,
      });

      if (!result.applied) {
        notify.error("Could not apply the preset");
        return;
      }

      markUsed(preset.id);
      setDuration(result.duration);
      useEditorStore.getState().setCurrentTime(0);

      if (result.replaced.length > 0) {
        notify.success(
          `${preset.name} applied`,
          `${result.replaced.map((property) => PROPERTY_LABELS[property]).join(", ")} replaced.`,
        );
      } else {
        notify.success(`${preset.name} applied`, "Keyframes are on the timeline — tweak away.");
      }
    },
    [targetLayer, applyMotionPreset, markUsed, setDuration, stopPreview],
  );

  const requestApply = React.useCallback(
    (preset: MotionPresetDefinition, params: MotionPresetParameters) => {
      if (!targetLayer) {
        notify.warning("Nothing to animate", "Select a layer first.");
        return;
      }

      const conflicts = findConflicts(targetLayer, preset);
      const plan = planDuration(preset, projectDuration, "fit");

      // Anything that would overwrite existing work, or change the length of
      // the composition, gets asked about rather than assumed.
      if (conflicts.length > 0 || plan.conflict) {
        setPending({ preset, params, conflicts, plan });
        return;
      }

      commit(preset, params, "fit");
    },
    [targetLayer, projectDuration, commit],
  );

  // --- Selection ------------------------------------------------------------
  const select = React.useCallback((preset: MotionPresetDefinition) => {
    setSelectedId((current) => (current === preset.id ? null : preset.id));
    setParameters(DEFAULT_PRESET_PARAMETERS);
  }, []);

  // --- Keyboard -------------------------------------------------------------
  // R previews the selection, Enter applies it, Escape stops. Scoped to the
  // panel so they cannot fire while someone is typing in the canvas or a field.
  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) {
        if (event.key === "Escape") stopPreview();
        return;
      }

      const preset = results.find((entry) => entry.id === selectedId);

      if (event.key === "Escape") {
        stopPreview();
        return;
      }
      if (!preset) return;

      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        if (previewingId === preset.id) stopPreview();
        else startPreview(preset, parameters);
      }
      if (event.key === "Enter") {
        event.preventDefault();
        requestApply(preset, parameters);
      }
    },
    [results, selectedId, previewingId, parameters, startPreview, stopPreview, requestApply],
  );

  if (!targetLayer) {
    return (
      <EmptyState
        icon={Sparkles}
        title={scope === "text" ? "No text layer yet" : "No layer selected"}
        description={
          scope === "text"
            ? "Text presets animate words. Add a text layer with the Text tool (T) first."
            : "Select a device or text layer to browse motion presets."
        }
      />
    );
  }

  const renderCard = (preset: MotionPresetDefinition) => (
    <MotionPresetCard
      key={preset.id}
      preset={preset}
      selected={selectedId === preset.id}
      favorite={favorites.includes(preset.id)}
      previewing={previewingId === preset.id}
      onSelect={() => select(preset)}
      onPreview={() => startPreview(preset, parameters)}
      onStopPreview={stopPreview}
      onApply={() => requestApply(preset, parameters)}
      onToggleFavorite={() => toggleFavorite(preset.id)}
    >
      <PresetParameters preset={preset} value={parameters} onChange={setParameters} />
    </MotionPresetCard>
  );

  return (
    <div className="space-y-3 p-3" onKeyDown={onKeyDown}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2 text-ink-subtle" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search motion presets…"
          aria-label="Search motion presets"
          className="h-7 w-full rounded-sm border border-line bg-surface-raised pr-2 pl-7 text-[11px] text-ink placeholder:text-ink-subtle focus:border-accent/60 focus:outline-none"
        />
      </div>

      {/* Horizontal scroll rather than wrapping: the sidebar is narrow, and a
          three-row chip block would push the presets below the fold. */}
      <div className="-mx-0.5 flex gap-1 overflow-x-auto px-0.5 pb-1">
        {(["all", ...activeMotionCategories(targetLayer?.type)] as const).map((entry) => (
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
            {entry === "all" ? "All" : MOTION_CATEGORY_LABELS[entry]}
          </button>
        ))}
      </div>

      {/* Recent and favourites only when browsing, not when searching: a
          search is a specific question and these would bury the answer. */}
      {!query && category === "all" ? (
        <>
          <Section title="Recent" empty="Your recently used presets will appear here.">
            {recentPresets.map(renderCard)}
          </Section>
          <Section title="Favourites" empty="No favourites yet.">
            {favoritePresets.map(renderCard)}
          </Section>
        </>
      ) : null}

      <div className="space-y-1.5">
        <span className="panel-label">
          {query || category !== "all" ? `${results.length} presets` : "All presets"}
        </span>

        {results.length === 0 ? (
          <p className="px-0.5 py-4 text-center text-[11px] text-ink-subtle">
            No motion presets found.
          </p>
        ) : (
          <div className="space-y-1.5">{results.map(renderCard)}</div>
        )}
      </div>

      <PresetConflictDialog
        pending={pending}
        onCancel={() => setPending(null)}
        onConfirm={(strategy) => {
          if (pending) commit(pending.preset, pending.params, strategy);
          setPending(null);
        }}
      />
    </div>
  );
}

export interface PendingApply {
  preset: MotionPresetDefinition;
  params: MotionPresetParameters;
  conflicts: ReturnType<typeof findConflicts>;
  plan: ReturnType<typeof planDuration>;
}

/**
 * Whether a preset belongs in this tab.
 *
 * `appliesTo: ["text"]` is the marker for a text-only preset. Everything else —
 * including presets with no `appliesTo` at all, which means "any layer" — is
 * the general library.
 */
function inScope(preset: MotionPresetDefinition, scope: PresetScope): boolean {
  const textOnly = preset.appliesTo?.length === 1 && preset.appliesTo[0] === "text";
  return scope === "text" ? textOnly : !textOnly;
}

/** Properties the preset writes that the layer already animates. */
function findConflicts(layer: Layer, preset: MotionPresetDefinition) {
  const incoming = new Set(presetProperties(preset));

  return layer.animations
    .filter((track) => incoming.has(track.property) && track.keyframes.length > 0)
    .map((track) => track.property);
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <div className="space-y-1.5">
      <span className="panel-label">{title}</span>
      {children.length === 0 ? (
        <p className="px-0.5 text-[10px] text-ink-subtle">{empty}</p>
      ) : (
        <div className="space-y-1.5">{children}</div>
      )}
    </div>
  );
}
