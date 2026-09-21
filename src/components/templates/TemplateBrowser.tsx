"use client";

import { ArrowLeft, ArrowUpRight, LayoutTemplate, Search } from "lucide-react";
import * as React from "react";

import { TemplatePreview } from "@/components/templates/TemplatePreview";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/panel";
import { getDevice } from "@/devices/registry";
import {
  TEMPLATE_CATEGORY_LABELS,
  activeTemplateCategories,
  searchProjectTemplates,
  templateDeviceIds,
  type ProjectTemplate,
  type TemplateCategory,
} from "@/engine/templates/project-templates";
import { buildTemplateLayers } from "@/engine/templates/template-builder";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import type { Project } from "@/types/project";

/**
 * The template browser.
 *
 * A surface over the editor rather than a panel beside it. Choosing a template
 * means comparing whole compositions, and a composition shown 200 pixels wide
 * is a coloured rectangle — the decision needs the room.
 *
 * Opening it does nothing to the project. The only path from here to the
 * project store is `apply`, behind an explicit *Use template*, and behind a
 * confirmation when there is work that applying would replace. Browsing is
 * free; that is the whole point of a browser.
 */

type Filter = TemplateCategory | "all";

/** Only categories that have something in them, computed once. */
const FILTERS: Filter[] = ["all", ...activeTemplateCategories()];

export function TemplateBrowser() {
  const open = useEditorStore((state) => state.templateBrowserOpen);
  const setOpen = useEditorStore((state) => state.setTemplateBrowserOpen);
  const project = useProjectStore((state) => state.project);
  const applyProjectTemplate = useProjectStore((state) => state.applyProjectTemplate);

  const [category, setCategory] = React.useState<Filter>("all");
  const [query, setQuery] = React.useState("");
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState<ProjectTemplate | null>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);

  const results = React.useMemo(
    () => searchProjectTemplates(category, query),
    [category, query],
  );

  const detail = detailId ? results.find((entry) => entry.id === detailId) ?? null : null;

  // Reopening starts at the gallery. Landing back inside the detail of a
  // template someone looked at yesterday is never what they came back for.
  // Adjusted during render rather than in an effect, so the browser never
  // paints one frame of the stale detail on its way back to the grid.
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    setDetailId(null);
  }

  const apply = React.useCallback(
    (template: ProjectTemplate) => {
      const current = useProjectStore.getState().project;
      if (!current) return;

      const existing = current.layers.find((layer) => layer.type === "device") ?? null;
      const { layers, deviceLayerId } = buildTemplateLayers(template, existing);
      applyProjectTemplate(template, layers);

      const editor = useEditorStore.getState();
      editor.pause();
      editor.endTextEditing();
      editor.clearKeyframeSelection();
      editor.setDuration(template.canvas.duration);
      editor.setCurrentTime(template.posterTime ?? 0);
      editor.requestCameraReset();
      editor.setCameraView(template.cameraView ?? "front");
      editor.selectLayer(deviceLayerId);
      editor.toggleTimeline(true);
      editor.setTemplateBrowserOpen(false);

      notify.success(
        `${template.name} applied`,
        "Editable layers, screen artwork and cinematic keyframes. Press play to preview.",
      );
    },
    [applyProjectTemplate],
  );

  /** Ask first when there is something to lose; apply straight away when not. */
  const request = React.useCallback(
    (template: ProjectTemplate) => {
      if (project && hasWork(project)) setPending(template);
      else apply(template);
    },
    [apply, project],
  );

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          title="Templates"
          description="Start with a professionally designed scene."
          className="flex h-[min(88vh,880px)] flex-col"
          style={{ ["--dialog-width" as string]: "1240px" }}
        >
          {detail ? (
            <TemplateDetail
              template={detail}
              onBack={() => setDetailId(null)}
              onUse={() => request(detail)}
              disabled={!project}
            />
          ) : (
            <>
              <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line px-5 py-3">
                <label className="relative min-w-[220px] flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search templates..."
                    aria-label="Search templates"
                    className="h-8 w-full rounded-md border border-line bg-surface-raised pr-3 pl-8 text-[12px] text-ink placeholder:text-ink-subtle focus:border-line-strong focus:outline-none"
                  />
                </label>

                <div
                  role="tablist"
                  aria-label="Template categories"
                  className="flex flex-wrap items-center gap-1"
                >
                  {FILTERS.map((entry) => (
                    <button
                      key={entry}
                      type="button"
                      role="tab"
                      aria-selected={entry === category}
                      onClick={() => setCategory(entry)}
                      className={cn(
                        "h-8 rounded-md px-3 text-[12px] transition-colors duration-150",
                        entry === category
                          ? "bg-surface-active font-medium text-ink"
                          : "text-ink-subtle hover:bg-surface-hover hover:text-ink-muted",
                      )}
                    >
                      {entry === "all" ? "All" : TEMPLATE_CATEGORY_LABELS[entry]}
                    </button>
                  ))}
                </div>
              </div>

              <div ref={gridRef} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {results.length === 0 ? (
                  <EmptyState
                    icon={LayoutTemplate}
                    title="No templates match"
                    description="Try a different search, or switch back to All."
                    action={
                      <Button
                        size="xs"
                        variant="secondary"
                        onClick={() => {
                          setQuery("");
                          setCategory("all");
                        }}
                      >
                        Clear filters
                      </Button>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {results.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        scrollRoot={gridRef}
                        disabled={!project}
                        onOpen={() => setDetailId(template.id)}
                        onUse={() => request(template)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <footer className="shrink-0 border-t border-line px-5 py-2.5 text-[10px] leading-relaxed text-ink-subtle">
                Every template is an ordinary composition: edit each layer, replace any screen,
                make it yours. Applying replaces the composition and keeps your screen media.
                Undo restores it.
              </footer>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(next) => {
          if (!next) setPending(null);
        }}
        tone="default"
        title={pending ? `Apply ${pending.name}?` : "Apply template?"}
        description="This replaces the canvas, background, layers and keyframes in this project. Your uploaded screen media is kept, and undo restores what is here now."
        confirmLabel="Use template"
        onConfirm={() => {
          if (pending) apply(pending);
          setPending(null);
        }}
      />
    </>
  );
}

/**
 * Does this project hold work a template would replace?
 *
 * A project straight from the factory is one device layer with no animation,
 * so anything beyond that is something the user made. Deliberately generous:
 * a needless confirmation costs a click, and a missing one costs the work.
 */
function hasWork(project: Project): boolean {
  return (
    project.layers.length > 1 ||
    project.layers.some((layer) => layer.animations.length > 0) ||
    Boolean(project.templateId)
  );
}

/**
 * Is this card near enough to the viewport to be worth rendering?
 *
 * Each preview is a live WebGL canvas, and a browser will drop the oldest
 * context once too many are alive — including the editor's own, sitting behind
 * this dialog. With five templates that never mattered; with a catalogue that
 * grows it would, so a card only holds a context while it is on screen.
 */
function useNearViewport(
  ref: React.RefObject<HTMLElement | null>,
  // The grid's own scroll container, not the viewport: `rootMargin` expands the
  // root's box only, so observing the page would give no run-up at all for a
  // card that is inside the dialog but below its fold.
  root: React.RefObject<HTMLElement | null>,
): boolean {
  // No observer (older browsers, a test renderer): start visible and stay
  // that way, rather than showing a gallery of empty boxes.
  const [near, setNear] = React.useState(() => typeof IntersectionObserver === "undefined");

  React.useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry.isIntersecting),
      { root: root.current, rootMargin: "300px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, root]);

  return near;
}

function TemplateCard({
  template,
  scrollRoot,
  disabled,
  onOpen,
  onUse,
}: {
  template: ProjectTemplate;
  scrollRoot: React.RefObject<HTMLElement | null>;
  disabled: boolean;
  onOpen: () => void;
  onUse: () => void;
}) {
  const ref = React.useRef<HTMLElement>(null);
  const near = useNearViewport(ref, scrollRoot);

  return (
    <article
      ref={ref}
      className="group flex min-w-0 flex-col overflow-hidden rounded-md border border-line bg-surface-raised transition-colors duration-150 hover:border-line-strong"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Preview ${template.name}`}
        className="block w-full cursor-pointer text-left"
      >
        {near ? (
          <TemplatePreview template={template} />
        ) : (
          <div
            className="w-full bg-surface"
            style={{
              aspectRatio: `${template.canvas.width} / ${template.canvas.height}`,
            }}
          />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-3 p-3">
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-medium text-ink">{template.name}</h3>
          <p className="mt-1 text-[11px] text-ink-subtle">{metaLine(template)}</p>
        </div>

        <p className="line-clamp-2 text-[11px] leading-relaxed text-ink-subtle">
          {template.description}
        </p>

        <Button
          size="xs"
          variant="secondary"
          className="mt-auto w-full justify-between"
          disabled={disabled}
          onClick={onUse}
        >
          Use template <ArrowUpRight className="size-3" />
        </Button>
      </div>
    </article>
  );
}

/**
 * One template, large.
 *
 * The same live composition as the card, given the space to be read, beside
 * the facts that decide whether it is the right starting point: what it is
 * built around, how long it runs, and which devices are in it.
 */
function TemplateDetail({
  template,
  onBack,
  onUse,
  disabled,
}: {
  template: ProjectTemplate;
  onBack: () => void;
  onUse: () => void;
  disabled: boolean;
}) {
  const devices = templateDeviceIds(template).map((id) => getDevice(id).name);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-line px-5 py-2.5">
        <Button size="xs" variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-3" /> All templates
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-h-0 min-w-0 items-start justify-center">
          <div className="w-full max-w-[520px] overflow-hidden rounded-md border border-line">
            <TemplatePreview template={template} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <p className="text-[9px] font-medium tracking-[0.18em] text-ink-subtle uppercase">
              {TEMPLATE_CATEGORY_LABELS[template.category]}
            </p>
            <h3 className="mt-1.5 text-[17px] font-medium tracking-tight text-ink">
              {template.name}
            </h3>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-muted">
              {template.description}
            </p>
          </div>

          <dl className="space-y-1.5 border-t border-line pt-3 text-[11px]">
            <Fact label="Canvas">
              {template.canvas.width} × {template.canvas.height} · {aspectLabel(template)}
            </Fact>
            <Fact label="Duration">
              {template.canvas.duration}s at {template.canvas.fps}fps
            </Fact>
            <Fact label="Devices">{devices.join(" · ")}</Fact>
            <Fact label="Layers">
              {(template.deviceLayers?.length ?? 1) +
                (template.textLayers?.length ?? 0) +
                (template.imageLayers?.length ?? 0)}{" "}
              editable
            </Fact>
          </dl>

          <Button
            size="sm"
            variant="primary"
            className="w-full justify-between"
            disabled={disabled}
            onClick={onUse}
          >
            Use template <ArrowUpRight className="size-3.5" />
          </Button>

          <p className="text-[10px] leading-relaxed text-ink-subtle">
            Applying replaces the composition. Your uploaded screen media is kept, and undo
            restores what is here now.
          </p>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-[70px] shrink-0 text-ink-subtle">{label}</dt>
      <dd className="min-w-0 flex-1 text-ink-muted">{children}</dd>
    </div>
  );
}

function metaLine(template: ProjectTemplate): string {
  const devices = templateDeviceIds(template).map((id) => getDevice(id).name);
  return [
    TEMPLATE_CATEGORY_LABELS[template.category],
    `${template.canvas.duration}s`,
    devices.join(" + "),
  ].join(" · ");
}

/** `1080 × 1350` → `4 : 5`, reduced so the ratio is readable. */
function aspectLabel(template: ProjectTemplate): string {
  const { width, height } = template.canvas;
  const divisor = greatestCommonDivisor(width, height);
  return `${width / divisor} : ${height / divisor}`;
}

function greatestCommonDivisor(a: number, b: number): number {
  return b === 0 ? a : greatestCommonDivisor(b, a % b);
}
