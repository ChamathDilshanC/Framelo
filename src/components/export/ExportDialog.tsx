"use client";

import { Check, Download, Film, ImageIcon } from "lucide-react";
import * as React from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PanelRow } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { EXPORT_RESOLUTIONS, type ExportResolutionId } from "@/lib/constants";
import {
  exportService,
  sanitizeFilename,
  supportsTransparency,
  type ExportFormat,
  type ExportResult,
} from "@/lib/export/export-service";
import { useBackgroundAssetUrl } from "@/lib/hooks/use-background-asset";
import { captureThumbnailNow } from "@/lib/hooks/use-project-thumbnail";
import { notify } from "@/lib/toast";
import { cn, formatBytes, formatTimecode } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import { resolveWorkArea, type ExportSettings } from "@/types/project";

type ExportPhase = "idle" | "running" | "done" | "failed";

const FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string }> = [
  { value: "png", label: "PNG" },
  { value: "jpg", label: "JPG" },
  { value: "webp", label: "WebP" },
  { value: "webm", label: "WebM" },
  { value: "mp4", label: "MP4" },
];

/**
 * The export panel.
 *
 * One dialog, opened from two places — the toolbar's Export button and the
 * Export section in the properties sidebar. Both call
 * `setExportDialogOpen(true)`; neither knows anything about formats, and there
 * is exactly one export code path (§2).
 *
 * ## What it renders
 *
 * The composition as the viewport shows it, at the chosen resolution: the
 * device and its finish, the screen image, the text layers with their real
 * typefaces, the background, the lighting, and the camera exactly where it is
 * — because the export is a readback of the live scene rather than a second
 * renderer that would have to be kept in step with the first.
 *
 * Which *frame* is therefore a real setting, and the panel says so. The
 * playhead is the default because that is what the user is looking at, and
 * there are one-click ways to reach the frames people actually want: the start,
 * the end, and the work area's in point.
 *
 * ## What it does not do
 *
 * Animated video. WebM and MP4 are listed and honestly disabled — see the note
 * in the panel. Showing a progress bar that produced a still with a video
 * extension would be worse than saying so.
 */
export function ExportDialog() {
  const open = useEditorStore((state) => state.exportDialogOpen);
  const setOpen = useEditorStore((state) => state.setExportDialogOpen);
  const saved = useProjectStore((state) => state.project?.exportSettings);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* The body is mounted only while the dialog is open, which is what lets
          it seed its controls from the project's saved export settings in
          `useState` initialisers. Restoring them in an effect instead would
          render the panel once with the wrong values and then correct itself,
          and the user would watch the format flick from PNG to WebP.
          Unmounting also resets the progress and result state for free. */}
      {open ? <ExportBody saved={saved} onClose={() => setOpen(false)} /> : null}
    </Dialog>
  );
}

function ExportBody({
  saved,
  onClose,
}: {
  /** Read once, in the initialisers below: a settings change underneath an
   *  open dialog must not reset controls someone is in the middle of using. */
  saved: ExportSettings | undefined;
  onClose: () => void;
}) {
  const project = useProjectStore((state) => state.project);
  const setExportSettings = useProjectStore((state) => state.setExportSettings);

  const [format, setFormat] = React.useState<ExportFormat>(() =>
    saved && FORMAT_OPTIONS.some((option) => option.value === saved.format)
      ? (saved.format as ExportFormat)
      : "png",
  );
  const [resolution, setResolution] = React.useState<ExportResolutionId>(() =>
    saved && EXPORT_RESOLUTIONS.some((entry) => entry.id === saved.resolutionId)
      ? (saved.resolutionId as ExportResolutionId)
      : "1080p",
  );
  const [transparent, setTransparent] = React.useState(() => saved?.transparent ?? false);
  const [range, setRange] = React.useState<ExportSettings["range"]>(
    () => saved?.range ?? "composition",
  );
  const [phase, setPhase] = React.useState<ExportPhase>("idle");
  const [progress, setProgress] = React.useState(0);
  const [result, setResult] = React.useState<ExportResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const scale = EXPORT_RESOLUTIONS.find((entry) => entry.id === resolution)?.scale ?? 1;
  const width = Math.round((project?.canvas.width ?? 1920) * scale);
  const height = Math.round((project?.canvas.height ?? 1080) * scale);

  const canvas = project?.canvas;
  const area = canvas ? resolveWorkArea(canvas) : null;
  const workAreaSet = Boolean(canvas?.workArea?.enabled);

  // An image background is a stored asset; the compositor needs its URL.
  const backgroundAssetUrl = useBackgroundAssetUrl(project?.background ?? null);

  const supported = exportService.isSupported(format);
  const isVideo = format === "webm" || format === "mp4";
  // Only PNG and WebP carry an alpha channel, so transparency is derived.
  const transparentAvailable = supportsTransparency(format);
  const useTransparent = transparent && transparentAvailable;

  // The blob URL of a superseded result is revoked when it leaves state, which
  // also covers unmount — no manual bookkeeping needed.
  React.useEffect(() => {
    if (!result) return;
    return () => exportService.release(result);
  }, [result]);

  /** Move the playhead, so the preview and the export agree before it runs. */
  function seek(time: number) {
    const editor = useEditorStore.getState();
    editor.pause();
    editor.setCurrentTime(time);
  }

  async function runExport() {
    if (!project) return;

    setResult(null);
    setPhase("running");
    setProgress(0);
    setError(null);
    notify.info("Export started", `${format.toUpperCase()} · ${width} × ${height}`);

    // Remembered on the project, so it travels with it and syncs like any
    // other edit rather than living in this browser only.
    setExportSettings({ format, resolutionId: resolution, transparent, range });

    try {
      const output = await exportService.run(
        {
          format,
          width,
          height,
          transparent: useTransparent || project.background.type === "transparent",
          name: sanitizeFilename(project.name),
          background: project.background,
          backgroundAssetUrl: backgroundAssetUrl,
        },
        setProgress,
      );

      setResult(output);
      setPhase("done");
      exportService.download(output);
      notify.success("Export completed", `${output.filename} · ${formatBytes(output.bytes)}`);

      // The frame is already proven good, so this is the cheapest moment to
      // refresh the project's poster.
      void captureThumbnailNow();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "The export could not be finished";
      setPhase("failed");
      setError(message);
      notify.error("Export failed", message);
    }
  }

  const fps = canvas?.fps ?? 30;

  return (
    <DialogContent
      title="Export"
      description="Renders the composition exactly as the viewport shows it."
      style={{ ["--dialog-width" as string]: "500px" }}
    >
        <div className="space-y-4 px-5 py-4">
          <div className="space-y-1.5">
            <span className="panel-label">Format</span>
            <div className="grid grid-cols-5 gap-1.5">
              {FORMAT_OPTIONS.map((option) => {
                const available = exportService.isSupported(option.value);
                const active = option.value === format;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormat(option.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-sm border px-2 py-2.5 text-[11px] font-medium transition-colors duration-150",
                      active
                        ? "border-accent/60 bg-accent-soft text-ink"
                        : "border-line bg-surface-raised text-ink-muted hover:border-line-strong hover:text-ink",
                      !available && "opacity-60",
                    )}
                  >
                    {option.value === "png" || option.value === "jpg" || option.value === "webp" ? (
                      <ImageIcon className="h-3.5 w-3.5" />
                    ) : (
                      <Film className="h-3.5 w-3.5" />
                    )}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <PanelRow label="Resolution">
            <Select
              aria-label="Export resolution"
              size="md"
              value={resolution}
              onChange={(value) => setResolution(value)}
              options={EXPORT_RESOLUTIONS.map((entry) => ({
                value: entry.id,
                label: entry.label,
                hint: `${Math.round((project?.canvas.width ?? 1920) * entry.scale)}×${Math.round(
                  (project?.canvas.height ?? 1080) * entry.scale,
                )}`,
              }))}
            />
          </PanelRow>

          <PanelRow label="Background">
            <Segmented
              aria-label="Export background"
              value={useTransparent ? "transparent" : "current"}
              onChange={(value) => setTransparent(value === "transparent")}
              options={[
                { value: "current", label: "Current" },
                { value: "transparent", label: "Transparent" },
              ]}
            />
          </PanelRow>

          {transparent && !transparentAvailable ? (
            <Alert tone="warning">
              Only PNG and WebP keep an alpha channel — this export renders on the current
              background.
            </Alert>
          ) : null}

          {/* Range and frame. The range setting is stored with the project and
              read by the video exporter when there is one; today it decides
              which frames the quick-pick buttons offer. */}
          <div className="space-y-2 rounded-md border border-line bg-surface-raised/50 p-2.5">
            <PanelRow label="Range">
              <Segmented
                aria-label="Export range"
                value={range}
                onChange={(value) => setRange(value as ExportSettings["range"])}
                options={[
                  { value: "composition", label: "Composition" },
                  { value: "work-area", label: "Work area" },
                ]}
              />
            </PanelRow>

            <div className="flex items-center justify-between text-[10px] text-ink-subtle">
              <span className="numeric">
                {range === "work-area" && area
                  ? `${area.in.toFixed(2)}s → ${area.out.toFixed(2)}s`
                  : `0.00s → ${(canvas?.duration ?? 0).toFixed(2)}s`}
              </span>
              <span className="numeric">
                {fps} fps · {canvas?.width ?? 0}×{canvas?.height ?? 0}
              </span>
            </div>

            {range === "work-area" && !workAreaSet ? (
              <p className="text-[10px] leading-relaxed text-caution">
                No work area is set, so this is the whole composition. Drag the in/out handles
                above the timeline to set one.
              </p>
            ) : null}

            <div className="space-y-1.5 border-t border-line pt-2">
              <div className="flex items-center justify-between">
                <span className="panel-label">Frame</span>
                <FrameReadout fps={fps} />
              </div>

              <div className="flex gap-1.5">
                <Button size="xs" variant="secondary" className="flex-1" onClick={() => seek(0)}>
                  Start
                </Button>
                {area && workAreaSet ? (
                  <Button
                    size="xs"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => seek(area.in)}
                  >
                    Work in
                  </Button>
                ) : null}
                <Button
                  size="xs"
                  variant="secondary"
                  className="flex-1"
                  onClick={() =>
                    seek(range === "work-area" && area ? area.out : (canvas?.duration ?? 0))
                  }
                >
                  End
                </Button>
              </div>

              <p className="text-[10px] leading-relaxed text-ink-subtle">
                A still export renders the frame at the playhead — with the device, its finish,
                every text layer and the camera exactly as they are at that moment. Scrub the
                timeline to choose a different one.
              </p>
            </div>
          </div>

          {isVideo ? (
            <Alert tone="info" title="Video export is not available yet">
              Animated MP4 and WebM rendering arrives in a later version, and this build will not
              pretend otherwise — choosing one of them disables the export button rather than
              handing you a still with a video extension. The range and frame rate above are saved
              with the project, so they will be what the video renderer uses when it lands.
            </Alert>
          ) : null}

          {phase === "running" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-ink-muted">
                <span className="flex items-center gap-2">
                  <Spinner /> Rendering frame…
                </span>
                <span className="numeric">{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-200"
                  style={{ width: `${Math.max(4, progress * 100)}%` }}
                />
              </div>
            </div>
          ) : null}

          {phase === "done" && result ? (
            <div className="flex items-center gap-3 rounded-md border border-positive/25 bg-positive/8 px-3 py-2.5">
              <Check className="h-4 w-4 shrink-0 text-positive" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] text-ink">{result.filename}</p>
                <p className="numeric text-ink-subtle">
                  {width} × {height} · {formatBytes(result.bytes)}
                </p>
              </div>
              <Button size="xs" variant="secondary" onClick={() => exportService.download(result)}>
                Download again
              </Button>
            </div>
          ) : null}

          {phase === "failed" && error ? (
            <Alert tone="danger" title="Export failed">
              {error}
            </Alert>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-line bg-surface-raised/40 px-5 py-3">
          <p className="numeric text-ink-subtle">
            {width} × {height}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => void runExport()}
              disabled={!supported || phase === "running" || !project}
            >
              <Download className="h-3.5 w-3.5" />
              Export {format.toUpperCase()}
            </Button>
          </div>
        </footer>
    </DialogContent>
  );
}

/** The playhead, live, without re-rendering the dialog on every frame. */
function FrameReadout({ fps }: { fps: number }) {
  const ref = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    function apply(time: number) {
      if (ref.current) ref.current.textContent = formatTimecode(time, fps);
    }
    apply(useEditorStore.getState().currentTime);
    return useEditorStore.subscribe((state) => apply(state.currentTime));
  }, [fps]);

  return <span ref={ref} className="numeric text-ink" />;
}
