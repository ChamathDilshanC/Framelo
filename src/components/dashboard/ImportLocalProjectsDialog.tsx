"use client";

import { CloudUpload } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { importLocalProjects } from "@/lib/projects/project-service";
import { notify } from "@/lib/toast";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { ProjectSummary } from "@/types/project";

interface ImportLocalProjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectSummary[];
  onImported: () => void;
}

/**
 * Offering to move guest work into a new account.
 *
 * This used to happen silently the moment someone signed in. Uploading a
 * person's files without asking is the wrong default even when the files are
 * theirs: they may be signing in on a shared machine, or signing into a
 * different account than the one the work belongs in.
 *
 * So it asks, it lists what it found, and it lets them pick. Nothing is
 * deleted locally either way — importing copies upward, it does not move.
 */
export function ImportLocalProjectsDialog({
  open,
  onOpenChange,
  projects,
  onImported,
}: ImportLocalProjectsDialogProps) {
  // Everything is ticked to start: the common case is "yes, all of it", and
  // the list is there to uncheck from rather than to build up.
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(projects.map((project) => project.id)),
  );
  const [busy, setBusy] = React.useState(false);
  const [choosing, setChoosing] = React.useState(false);

  async function run(ids: string[]) {
    if (ids.length === 0) {
      onOpenChange(false);
      return;
    }

    setBusy(true);
    try {
      const result = await importLocalProjects(ids);

      if (result.imported > 0) {
        notify.success(
          `${result.imported} project${result.imported === 1 ? "" : "s"} imported`,
          "They are in your account and still on this device.",
        );
      }
      if (result.failed.length > 0) {
        // Not an error state: the work is still local and still openable.
        notify.warning(
          `${result.failed.length} could not be uploaded`,
          "They stay on this device. Framelo will try again later.",
        );
      }

      onImported();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  const count = projects.length;

  return (
    <Dialog open={open} onOpenChange={busy ? () => {} : onOpenChange}>
      <DialogContent
        title="Projects found on this device"
        description={`You made ${count} project${count === 1 ? "" : "s"} before signing in. Add ${count === 1 ? "it" : "them"} to your account?`}
        style={{ ["--dialog-width" as string]: "460px" }}
      >
        <div className="space-y-3 px-5 py-4">
          {choosing ? (
            <ul className="max-h-56 space-y-px overflow-y-auto rounded-sm border border-line bg-surface-raised p-1">
              {projects.map((project) => {
                const checked = selected.has(project.id);
                return (
                  <li key={project.id}>
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-xs px-2 py-1.5 transition-colors",
                        checked ? "bg-surface-active" : "hover:bg-surface-hover",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelected((current) => {
                            const next = new Set(current);
                            if (next.has(project.id)) next.delete(project.id);
                            else next.add(project.id);
                            return next;
                          })
                        }
                        className="h-3 w-3 accent-[var(--framelo-accent)]"
                      />
                      <span className="min-w-0 flex-1 truncate text-[12px] text-ink">
                        {project.name}
                      </span>
                      <span className="shrink-0 text-[10px] text-ink-subtle">
                        {formatRelativeTime(project.updatedAt)}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="space-y-0.5 rounded-sm border border-line bg-surface-raised px-2.5 py-2">
              {projects.slice(0, 4).map((project) => (
                <li key={project.id} className="truncate text-[12px] text-ink-muted">
                  {project.name}
                </li>
              ))}
              {count > 4 ? (
                <li className="text-[11px] text-ink-subtle">and {count - 4} more</li>
              ) : null}
            </ul>
          )}

          <p className="text-[10px] leading-relaxed text-ink-subtle">
            Importing copies them to your account. Nothing is removed from this device, and you can
            do this later from any project.
          </p>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line px-5 py-4">
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Not now
          </Button>

          <div className="flex items-center gap-2">
            {choosing ? (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void run([...selected])}
              >
                {busy ? <Spinner /> : null}
                Import {selected.size} selected
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy}
                onClick={() => setChoosing(true)}
              >
                Choose
              </Button>
            )}

            {!choosing ? (
              <Button
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() => void run(projects.map((project) => project.id))}
              >
                {busy ? <Spinner className="border-t-white" /> : <CloudUpload className="h-3 w-3" />}
                Import all
              </Button>
            ) : null}
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
