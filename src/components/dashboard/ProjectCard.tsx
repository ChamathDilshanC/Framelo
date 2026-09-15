"use client";

import {
  Copy,
  Download,
  Globe,
  MoreHorizontal,
  Pencil,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime } from "@/lib/utils";
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
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [renaming, setRenaming] = React.useState(false);
  const thumbnail = useThumbnail(summary);

  return (
    <div
      className={cn(
        // No `overflow-hidden` here: it used to clip the actions menu to the
        // card. The thumbnail rounds its own top corners instead, so the card
        // still looks the same and the menu can leave its bounds.
        "group relative flex flex-col rounded-lg border border-line bg-surface transition-colors duration-200 hover:border-line-strong",
        // While the menu is open this card has to out-rank the ones after it
        // in the grid, or they paint over the menu it just opened.
        // `z-auto` when closed, so fifty cards do not each create a stacking
        // context for nothing.
        menuOpen ? "z-30" : "z-auto",
      )}
    >
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

        <ProjectMenu
          open={menuOpen}
          onOpenChange={setMenuOpen}
          summary={summary}
          onStartRename={() => setRenaming(true)}
          onDuplicate={actions.onDuplicate}
          onDelete={actions.onDelete}
          onShare={actions.onShare}
          onExport={actions.onExport}
          onPublish={actions.onPublish}
        />
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

interface ProjectMenuProps extends Omit<ProjectCardActions, "onRename"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: ProjectSummary;
  onStartRename: () => void;
}

/**
 * The per-project menu.
 *
 * A plain popover rather than a menu library: it holds six items, needs to
 * close on outside click and Escape, and nothing more.
 */
function ProjectMenu({
  open,
  onOpenChange,
  summary,
  onStartRename,
  onDuplicate,
  onDelete,
  onShare,
  onExport,
  onPublish,
}: ProjectMenuProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [dropUp, setDropUp] = React.useState(false);

  /**
   * Open upwards when the menu would run off the bottom of the window.
   *
   * Measured rather than guessed from the row index: the grid reflows with the
   * viewport, so which cards are near the bottom edge changes with the window.
   */
  React.useLayoutEffect(() => {
    if (!open) return;
    const trigger = ref.current?.getBoundingClientRect();
    if (!trigger) return;
    const menu = ref.current?.querySelector("[role=menu]")?.getBoundingClientRect();
    const height = menu?.height ?? 220;
    setDropUp(trigger.bottom + height + 12 > window.innerHeight);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;

    function handlePointer(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) onOpenChange(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onOpenChange]);

  const items = [
    { label: "Rename", icon: Pencil, run: onStartRename },
    { label: "Duplicate", icon: Copy, run: () => onDuplicate(summary) },
    { label: "Share", icon: Share2, run: () => onShare(summary) },
    { label: "Add to portfolio", icon: Sparkles, run: () => onPublish(summary) },
    { label: "Export", icon: Download, run: () => onExport(summary) },
  ];

  return (
    <div ref={ref} className="relative">
      <Button
        size="xs"
        variant="ghost"
        aria-label={`Actions for ${summary.name}`}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "h-6 w-6 p-0",
          !open && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        )}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </Button>

      {open ? (
        <div
          role="menu"
          className={cn(
            "animate-fade-up absolute right-0 z-40 w-44 overflow-hidden rounded-md border border-line-strong bg-surface py-1 shadow-2xl shadow-black/50",
            dropUp ? "bottom-full mb-1" : "top-full mt-1",
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                onOpenChange(false);
                item.run();
              }}
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px] text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <item.icon className="h-3 w-3" />
              {item.label}
            </button>
          ))}

          <span className="my-1 block h-px bg-line" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onOpenChange(false);
              onDelete(summary);
            }}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[12px] text-danger transition-colors hover:bg-danger/10"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>
      ) : null}
    </div>
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
