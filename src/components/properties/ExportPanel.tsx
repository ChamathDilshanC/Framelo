"use client";

import { Download, Share2 } from "lucide-react";
import * as React from "react";

import { ShareDialog } from "@/components/dashboard/ShareDialog";
import { Button } from "@/components/ui/button";
import { PanelSection } from "@/components/ui/panel";
import { EXPORT_RESOLUTIONS } from "@/lib/constants";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import { resolveWorkArea } from "@/types/project";

/**
 * Export, from the properties sidebar.
 *
 * The second of the two entry points the brief asks for, and deliberately not a
 * second implementation of anything: it calls `setExportDialogOpen(true)`, the
 * same store action the toolbar button calls, and the same dialog opens. There
 * is one export workflow and one set of settings, reachable from wherever the
 * user happens to be looking.
 *
 * What it adds over a bare button is the *state*: the format and size this
 * project was last exported at, and the range it will use. Someone deciding
 * whether to re-export wants those three facts, and getting them by opening the
 * dialog to look and closing it again is the kind of friction that makes a
 * panel feel slow even when it is not.
 */
export function ExportPanel() {
  const canvas = useProjectStore((state) => state.project?.canvas);
  const settings = useProjectStore((state) => state.project?.exportSettings);
  const setExportDialogOpen = useEditorStore((state) => state.setExportDialogOpen);
  const project = useProjectStore((state) => state.project);

  const [shareOpen, setShareOpen] = React.useState(false);

  if (!canvas) return null;

  const scale =
    EXPORT_RESOLUTIONS.find((entry) => entry.id === settings?.resolutionId)?.scale ?? 1;
  const width = Math.round(canvas.width * scale);
  const height = Math.round(canvas.height * scale);

  const area = resolveWorkArea(canvas);
  const usesWorkArea = settings?.range === "work-area" && Boolean(canvas.workArea?.enabled);

  return (
    <PanelSection title="Export">
      <dl className="space-y-1 rounded-sm border border-line bg-surface-raised px-2 py-1.5">
        <Row label="Size">
          <span className="numeric text-ink">
            {width} × {height}
          </span>
        </Row>
        <Row label="Format">
          <span className="text-[11px] text-ink">
            {(settings?.format ?? "png").toUpperCase()}
            {settings?.transparent ? " · transparent" : ""}
          </span>
        </Row>
        <Row label="Range">
          <span className="numeric text-ink">
            {usesWorkArea
              ? `${area.in.toFixed(2)}–${area.out.toFixed(2)}s`
              : `0–${canvas.duration.toFixed(2)}s`}
          </span>
        </Row>
        <Row label="Frame rate">
          <span className="numeric text-ink">{canvas.fps} fps</span>
        </Row>
      </dl>

      <Button
        variant="primary"
        size="sm"
        className="w-full"
        onClick={() => setExportDialogOpen(true)}
      >
        <Download className="h-3.5 w-3.5" />
        Export…
      </Button>

      <Button
        variant="secondary"
        size="sm"
        className="w-full"
        onClick={() => setShareOpen(true)}
        disabled={!project}
      >
        <Share2 className="h-3 w-3" />
        Share a link
      </Button>

      <p className="text-[10px] leading-relaxed text-ink-subtle">
        {settings
          ? "These are the settings this project was last exported with."
          : "Exports render the viewport at the chosen resolution, including the device finish, text and background."}
      </p>

      <ShareDialog
        project={shareOpen ? project : null}
        onOpenChange={(open) => setShareOpen(open)}
      />
    </PanelSection>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[11px] text-ink-subtle">{label}</dt>
      <dd className="min-w-0 truncate text-right">{children}</dd>
    </div>
  );
}
