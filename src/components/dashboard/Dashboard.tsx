"use client";

import { FolderOpen, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Wordmark } from "@/components/brand/Logo";
import { AccountMenu } from "@/components/dashboard/AccountMenu";
import { CreateProjectDialog } from "@/components/dashboard/CreateProjectDialog";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import { PublishDialog } from "@/components/dashboard/PublishDialog";
import { ShareDialog } from "@/components/dashboard/ShareDialog";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton } from "@/components/ui/icon-button";
import { EmptyState } from "@/components/ui/panel";
import { Spinner } from "@/components/ui/spinner";
import {
  cachedProjects,
  deleteProject,
  duplicateProject,
  listProjects,
  loadProject,
} from "@/lib/projects/project-service";
import { notify } from "@/lib/toast";
import { useAuthStore } from "@/store/auth-store";
import type { Project, ProjectSummary } from "@/types/project";

/**
 * Report a sign-in that came back from a provider having failed.
 *
 * `/auth/callback` has no UI of its own — it redirects — so it passes the
 * reason here. Without this, a refused Google consent screen would land the
 * user back on the dashboard silently signed out, with nothing to explain why.
 *
 * The parameter is stripped afterwards so a reload, a bookmark or a shared URL
 * does not replay the message.
 *
 * Read from `window` rather than `useSearchParams`, which would opt the whole
 * dashboard out of static prerendering for a message that only ever exists
 * after a redirect the browser has already followed.
 */
function useAuthErrorNotice(): void {
  React.useEffect(() => {
    const url = new URL(window.location.href);
    const message = url.searchParams.get("auth_error");
    if (!message) return;

    notify.error("Sign-in did not complete", message);

    url.searchParams.delete("auth_error");
    window.history.replaceState(null, "", url.pathname + url.search);
  }, []);
}

/**
 * The project dashboard.
 *
 * Paints from the local index on the first frame and refreshes from the cloud
 * behind it, so the list is never a spinner for a returning user. Every action
 * updates local state first and reconciles afterwards — the grid must not stall
 * on a request to show that a project was renamed.
 */
export function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = React.useState<ProjectSummary[]>(() => []);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);

  const [pendingDelete, setPendingDelete] = React.useState<ProjectSummary | null>(null);
  const [shareTarget, setShareTarget] = React.useState<Project | null>(null);
  const [publishTarget, setPublishTarget] = React.useState<Project | null>(null);

  const authStatus = useAuthStore((state) => state.status);

  useAuthErrorNotice();

  const refresh = React.useCallback(async () => {
    try {
      setProjects(await listProjects());
    } catch {
      // The cached list is already on screen; a failed refresh is not worth
      // replacing it with an error.
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    // The cached index paints first — a returning user should not watch a
    // spinner for work that is already on their machine — and the cloud list
    // replaces it when it arrives.
    async function load() {
      setProjects(cachedProjects());
      await refresh();
    }
    void load();
  }, [refresh, authStatus]);

  async function withProject(summary: ProjectSummary, run: (project: Project) => void) {
    const project = await loadProject(summary.id);
    if (!project) {
      notify.error("Project could not be opened");
      return;
    }
    run(project);
  }

  async function handleRename(summary: ProjectSummary, name: string) {
    // Optimistic: the card shows the new name immediately.
    setProjects((current) =>
      current.map((entry) => (entry.id === summary.id ? { ...entry, name } : entry)),
    );

    const project = await loadProject(summary.id);
    if (!project) return;

    const { saveProject } = await import("@/lib/projects/project-service");
    await saveProject({ ...project, name, updatedAt: new Date().toISOString() });
    void refresh();
  }

  async function handleDuplicate(summary: ProjectSummary) {
    const copy = await duplicateProject(summary.id);
    if (!copy) {
      notify.error("Could not duplicate the project");
      return;
    }
    notify.success("Project duplicated", copy.name);
    void refresh();
  }

  async function handleDelete(summary: ProjectSummary) {
    setProjects((current) => current.filter((entry) => entry.id !== summary.id));
    await deleteProject(summary.id);
    notify.info("Project deleted", summary.name);
    void refresh();
  }

  const existingNames = React.useMemo(() => projects.map((entry) => entry.name), [projects]);

  return (
    <div className="min-h-dvh bg-canvas">
      <DashboardHeader onCreate={() => setCreating(true)} />

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-ink">
              My projects
            </h1>
            <p className="text-[12px] text-ink-subtle">
              {projects.length === 0
                ? "Nothing here yet."
                : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
              {authStatus === "guest" ? " · stored on this device" : ""}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" />
            New project
          </Button>
        </div>

        {loading && projects.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-24 text-[12px] text-ink-subtle">
            <Spinner /> Loading projects…
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line">
            <EmptyState
              icon={FolderOpen}
              title="No projects yet"
              description="Create one to place a screenshot on a device, animate it, and share the result."
              action={
                <Button variant="primary" size="sm" onClick={() => setCreating(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  New project
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((summary) => (
              <ProjectCard
                key={summary.id}
                summary={summary}
                onRename={(entry, name) => void handleRename(entry, name)}
                onDuplicate={(entry) => void handleDuplicate(entry)}
                onDelete={setPendingDelete}
                onShare={(entry) => void withProject(entry, setShareTarget)}
                onPublish={(entry) => void withProject(entry, setPublishTarget)}
                onExport={(entry) => router.push(`/editor/${entry.id}?export=1`)}
              />
            ))}
          </div>
        )}
      </main>

      <CreateProjectDialog
        open={creating}
        onOpenChange={setCreating}
        existingNames={existingNames}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete project?"
        description={`“${pendingDelete?.name ?? ""}” and its animation will be removed. This action cannot be undone.`}
        confirmLabel="Delete project"
        onConfirm={async () => {
          if (pendingDelete) await handleDelete(pendingDelete);
        }}
      />

      <ShareDialog
        project={shareTarget}
        onOpenChange={(open) => !open && setShareTarget(null)}
        onChanged={refresh}
      />

      <PublishDialog
        project={publishTarget}
        onOpenChange={(open) => !open && setPublishTarget(null)}
        onChanged={refresh}
      />
    </div>
  );
}

function DashboardHeader({ onCreate }: { onCreate: () => void }) {
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Wordmark />
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/portfolio"
            className="text-[12px] text-ink-muted transition-colors hover:text-ink"
          >
            Discover
          </Link>
          <Button variant="secondary" size="sm" onClick={onCreate}>
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
          <IconButton
            icon={Settings}
            label="Settings"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          />
          <AccountMenu />

          <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
      </div>
    </header>
  );
}
