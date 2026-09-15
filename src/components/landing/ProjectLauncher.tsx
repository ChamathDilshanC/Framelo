"use client";

import { ArrowRight, Clock, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { cachedProjects, listProjects } from "@/lib/projects/project-service";
import { notify } from "@/lib/toast";
import { formatRelativeTime } from "@/lib/utils";
import type { ProjectSummary } from "@/types/project";

/** Create-a-project CTA plus the list of projects already on this device. */
export function ProjectLauncher() {
  const router = useRouter();
  // Seeded synchronously from the cached index, so returning visitors see their
  // work in the first paint rather than after a round trip.
  const [projects, setProjects] = React.useState<ProjectSummary[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!cancelled) setProjects(cachedProjects());
      try {
        const list = await listProjects();
        if (!cancelled) setProjects(list);
      } catch {
        if (!cancelled) setProjects([]);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(summary: ProjectSummary) {
    const { deleteProject } = await import("@/lib/projects/project-service");
    try {
      await deleteProject(summary.id);
      setProjects((current) => (current ?? []).filter((entry) => entry.id !== summary.id));
      notify.info("Project deleted", summary.name);
    } catch {
      notify.error("Could not delete the project");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="xl" variant="primary" onClick={() => router.push("/dashboard")}>
          <Plus className="h-4 w-4" />
          Create a mockup
        </Button>
        <Button size="xl" variant="secondary" onClick={() => router.push("/portfolio")}>
          <Sparkles className="h-4 w-4" />
          See what people made
        </Button>
      </div>

      {projects === null ? (
        <div className="flex items-center gap-2 text-[12px] text-ink-subtle">
          <Spinner /> Looking for your projects…
        </div>
      ) : projects.length === 0 ? (
        <p className="text-[13px] text-ink-subtle">
          No projects on this device yet — your first mockup is one click away.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="panel-label">Recent projects</p>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="text-[11px] text-ink-subtle transition-colors hover:text-ink"
            >
              All projects
            </button>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {projects.slice(0, 4).map((summary) => (
              <li
                key={summary.id}
                className="group flex items-center gap-3 rounded-md border border-line bg-surface/60 px-3 py-2.5 transition-colors duration-150 hover:border-line-strong hover:bg-surface"
              >
                <button
                  type="button"
                  onClick={() => router.push(`/editor/${summary.id}`)}
                  className="flex min-w-0 flex-1 flex-col items-start text-left"
                >
                  <span className="w-full truncate text-[13px] text-ink">{summary.name}</span>
                  <span className="flex items-center gap-1 text-[11px] text-ink-subtle">
                    <Clock className="h-2.5 w-2.5" />
                    {formatRelativeTime(summary.updatedAt)}
                  </span>
                </button>
                <IconButton
                  icon={Trash2}
                  label={`Delete ${summary.name}`}
                  size="sm"
                  tone="danger"
                  onClick={() => void handleDelete(summary)}
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                />
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-subtle transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
