"use client";

import * as React from "react";

import { createProject } from "@/lib/project-factory";
import {
  loadProject as fetchProject,
  saveProject,
} from "@/lib/projects/project-service";
import { notify } from "@/lib/toast";
import { useAssetStore } from "@/store/asset-store";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";

export type ProjectLoadState = "loading" | "ready" | "error";

interface ProjectLoaderResult {
  state: ProjectLoadState;
  error: string | null;
}

/**
 * Resolves the project for `/editor/[projectId]`.
 *
 * An unknown id creates a fresh project under that id so a shared or bookmarked
 * URL always opens something usable instead of a dead end.
 */
export function useProjectLoader(projectId: string): ProjectLoaderResult {
  const [state, setState] = React.useState<ProjectLoadState>("loading");
  const [error, setError] = React.useState<string | null>(null);

  const loadProject = useProjectStore((store) => store.loadProject);
  const closeProject = useProjectStore((store) => store.closeProject);
  const hydrateAssets = useAssetStore((store) => store.hydrate);
  const setDuration = useEditorStore((store) => store.setDuration);

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      setState("loading");
      setError(null);

      await hydrateAssets();

      try {
        const existing = await fetchProject(projectId);
        if (cancelled) return;

        if (existing) {
          loadProject(existing);
          setDuration(existing.canvas.duration);
          setState("ready");
          return;
        }

        const fresh = { ...createProject(), id: projectId };
        await saveProject(fresh);
        if (cancelled) return;

        loadProject(fresh);
        setDuration(fresh.canvas.duration);
        setState("ready");
      } catch (caught) {
        if (cancelled) return;

        const message = caught instanceof Error ? caught.message : "The project could not be read";

        // A corrupt record should not trap the user — fall back to a new project.
        try {
          const fresh = { ...createProject(), id: projectId };
          loadProject(fresh);
          setDuration(fresh.canvas.duration);
          setState("ready");
          setError(message);
          notify.warning("Project data could not be read", "A new empty project was opened instead.");
        } catch {
          setState("error");
          setError(message);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      closeProject();
    };
  }, [projectId, loadProject, closeProject, hydrateAssets, setDuration]);

  return { state, error };
}
