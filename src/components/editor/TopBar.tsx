"use client";

import {
  ArrowLeft,
  Check,
  CloudOff,
  Download,
  Keyboard,
  Loader2,
  Pause,
  Play,
  Redo2,
  Settings,
  Settings2,
  Share2,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { ShareDialog } from "@/components/dashboard/ShareDialog";
import { CanvasSettings } from "@/components/editor/CanvasSettings";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { Wordmark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { saveProjectNow } from "@/lib/hooks/use-autosave";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import {
  selectCanRedo,
  selectCanUndo,
  useProjectStore,
  type SaveStatus,
} from "@/store/project-store";

export function TopBar() {
  const project = useProjectStore((state) => state.project);
  const projectName = useProjectStore((state) => state.project?.name ?? "");
  const renameProject = useProjectStore((state) => state.renameProject);
  const undo = useProjectStore((state) => state.undo);
  const redo = useProjectStore((state) => state.redo);
  const canUndo = useProjectStore(selectCanUndo);
  const canRedo = useProjectStore(selectCanRedo);
  const saveStatus = useProjectStore((state) => state.saveStatus);

  const isPlaying = useEditorStore((state) => state.isPlaying);
  const togglePlay = useEditorStore((state) => state.togglePlay);
  const setExportDialogOpen = useEditorStore((state) => state.setExportDialogOpen);
  const setShortcutsOpen = useEditorStore((state) => state.setShortcutsOpen);

  const [shareOpen, setShareOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  return (
    <header className="relative z-20 flex h-(--shell-topbar) shrink-0 items-center gap-3 border-b border-line bg-surface px-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Tooltip label="Back to projects">
          <Link
            href="/"
            className="flex h-7 w-7 items-center justify-center rounded-sm text-ink-subtle transition-colors hover:bg-surface-hover hover:text-ink"
            aria-label="Back to projects"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Tooltip>

        <Wordmark className="hidden sm:flex" />

        <span className="h-5 w-px bg-line" aria-hidden />

        <div className="flex min-w-0 items-center gap-2">
          <ProjectNameField name={projectName} onRename={renameProject} />
          <SaveIndicator status={saveStatus} />
        </div>
      </div>

      <div className="flex items-center gap-0.5 rounded-md border border-line bg-surface-raised p-0.5">
        <IconButton
          icon={Undo2}
          label="Undo"
          shortcut="Ctrl+Z"
          disabled={!canUndo}
          onClick={undo}
          size="sm"
        />
        <IconButton
          icon={Redo2}
          label="Redo"
          shortcut="Ctrl+Shift+Z"
          disabled={!canRedo}
          onClick={redo}
          size="sm"
        />
        <span className="mx-0.5 h-4 w-px bg-line" aria-hidden />
        <IconButton
          icon={isPlaying ? Pause : Play}
          label={isPlaying ? "Pause preview" : "Play preview"}
          shortcut="Space"
          onClick={togglePlay}
          active={isPlaying}
          size="sm"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-1.5">
        <CanvasSettings
          trigger={
            <IconButton icon={Settings2} label="Composition settings" size="sm" showTooltip={false} />
          }
        />
        <IconButton
          icon={Keyboard}
          label="Keyboard shortcuts"
          shortcut="?"
          size="sm"
          onClick={() => setShortcutsOpen(true)}
        />
        {/* App preferences. The sliders icon beside it is the *project's*
            composition settings — different scope, different icon. */}
        <IconButton
          icon={Settings}
          label="Settings"
          size="sm"
          onClick={() => setSettingsOpen(true)}
        />
        <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)} className="ml-1">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
        <Button variant="primary" size="sm" onClick={() => setExportDialogOpen(true)}>
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>

      <ShareDialog
        project={shareOpen ? project : null}
        onOpenChange={(open) => setShareOpen(open)}
      />
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}

function ProjectNameField({
  name,
  onRename,
}: {
  name: string;
  onRename: (value: string) => void;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);

  return (
    <input
      value={draft ?? name}
      aria-label="Project name"
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={(event) => {
        onRename(event.target.value);
        setDraft(null);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(null);
          event.currentTarget.blur();
        }
      }}
      className="w-[clamp(8rem,18vw,16rem)] truncate rounded-sm border border-transparent bg-transparent px-1.5 py-1 text-[13px] font-medium text-ink transition-colors hover:border-line hover:bg-surface-raised focus:border-accent/60 focus:bg-surface-raised focus:outline-none"
    />
  );
}

const SAVE_LABELS: Record<SaveStatus, { label: string; icon: typeof Check; className: string }> = {
  idle: { label: "Ready", icon: Check, className: "text-ink-subtle" },
  saved: { label: "Saved", icon: Check, className: "text-ink-subtle" },
  saving: { label: "Saving…", icon: Loader2, className: "text-ink-muted" },
  unsaved: { label: "Unsaved changes", icon: CloudOff, className: "text-caution" },
  offline: { label: "Saved locally", icon: CloudOff, className: "text-ink-muted" },
  error: { label: "Save failed", icon: CloudOff, className: "text-danger" },
};

function SaveIndicator({ status }: { status: SaveStatus }) {
  const project = useProjectStore((state) => state.project);
  const saveError = useProjectStore((state) => state.saveError);
  const { label, icon: Icon, className } = SAVE_LABELS[status];

  const canRetry = status === "error" || status === "unsaved" || status === "offline";

  return (
    <button
      type="button"
      disabled={!canRetry || !project}
      onClick={() => {
        if (!project) return;
        void saveProjectNow(project).then((ok) => {
          if (!ok) return;
          const state = useProjectStore.getState();
          if (state.saveStatus === "offline") notify.info("Saved locally", state.saveError ?? "Cloud sync will retry when connected.");
          else notify.success("Saved to your account");
        });
      }}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-sm px-1.5 py-1 text-[11px] transition-colors",
        canRetry && "hover:bg-surface-hover",
        className,
      )}
      title={
        status === "offline"
          ? `${saveError ?? "Your draft is safe on this device."} Click to retry syncing.`
          : canRetry
            ? "Save now"
            : label
      }
    >
      <Icon className={cn("h-3 w-3", status === "saving" && "animate-spin")} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}
