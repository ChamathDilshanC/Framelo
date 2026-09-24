"use client";

import { Globe, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";
import { localThumbnailUrl } from "@/lib/projects/project-service";
import type { ProjectSummary } from "@/types/project";

export interface ProjectCardActions {
  onRename: (summary: ProjectSummary, name: string) => void;
  onDuplicate: (summary: ProjectSummary) => void;
  onDelete: (summary: ProjectSummary) => void;
  onShare: (summary: ProjectSummary) => void;
  onExport: (summary: ProjectSummary) => void;
  onPublish: (summary: ProjectSummary) => void;
}

interface ProjectCardProps extends ProjectCardActions {
  summary: ProjectSummary;
}

/**
 * One project in the dashboard grid.
 *
 * The thumbnail is whatever poster the project last stored — a cloud URL when
 * signed in, an IndexedDB blob for a guest. It is loaded lazily and never
 * regenerated from here: rendering a 3D frame to draw a list would be the most
 * expensive possible way to show a name and a date.
 */
export function ProjectCard({ summary, ...actions }: ProjectCardProps) {
  const [renaming, setRenaming] = React.useState(false);
  const thumbnail = useThumbnail(summary);

  return (
    <div className="group relative flex flex-col rounded-lg border border-line bg-surface transition-colors duration-200 hover:border-line-strong">
      <Link
        href={`/editor/${summary.id}`}
        className="relative block aspect-video overflow-hidden rounded-t-[7px] bg-canvas"
        aria-label={`Open ${summary.name}`}
      >
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 ease-out-quint group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-raised">
            <span className="text-[10px] text-ink-subtle">No preview yet</span>
          </div>
        )}

        {summary.isPortfolio ? (
          <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[9px] text-white/90 backdrop-blur-sm">
            <Sparkles className="h-2.5 w-2.5" /> Portfolio
          </span>
        ) : summary.isPublic ? (
          <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[9px] text-white/90 backdrop-blur-sm">
            <Globe className="h-2.5 w-2.5" /> Shared
          </span>
        ) : null}
      </Link>

      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          {renaming ? (
            <RenameField
              value={summary.name}
              onCommit={(name) => {
                setRenaming(false);
                if (name !== summary.name) actions.onRename(summary, name);
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <button
              type="button"
              onDoubleClick={() => setRenaming(true)}
              className="block w-full truncate text-left text-[13px] font-medium text-ink"
              title={`${summary.name} — double-click to rename`}
            >
              {summary.name}
            </button>
          )}
          <p className="mt-0.5 truncate text-[11px] text-ink-subtle">
            Edited {formatRelativeTime(summary.updatedAt)}
            {summary.origin === "local" ? " · on this device" : ""}
          </p>
        </div>

        <Button
          type="button"
          size="xs"
          variant="ghost"
          aria-label={`Delete ${summary.name}`}
          onClick={() => actions.onDelete(summary)}
          className="h-6 w-6 p-0 text-ink-subtle hover:text-danger"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function RenameField({
  value,
  onCommit,
  onCancel,
}: {
  value: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = React.useState(value);

  return (
    <input
      autoFocus
      value={draft}
      aria-label="Project name"
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={() => onCommit(draft.trim() || value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(value);
          onCancel();
        }
      }}
      className="h-6 w-full rounded-sm border border-accent/60 bg-surface-raised px-1.5 text-[13px] font-medium text-ink focus:outline-none"
    />
  );
}

/**
 * Resolve a poster image.
 *
 * A cloud project already carries a CDN URL. A guest project's poster is a blob
 * in IndexedDB, so an object URL is minted here and revoked on unmount — a grid
 * of fifty cards would otherwise leak fifty blobs per navigation.
 */
function useThumbnail(summary: ProjectSummary): string | null {
  const [local, setLocal] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (summary.thumbnailUrl) return;

    let url: string | null = null;
    let cancelled = false;

    void localThumbnailUrl(summary.id).then((result) => {
      if (cancelled) {
        if (result) URL.revokeObjectURL(result);
        return;
      }
      url = result;
      setLocal(result);
    });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [summary.id, summary.thumbnailUrl]);

  return summary.thumbnailUrl ?? local;
}
