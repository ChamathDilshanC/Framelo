"use client";

import * as React from "react";

import { createProject } from "@/lib/project-factory";
import {
  loadProject as fetchProject,
  saveProject,
} from "@/lib/projects/project-service";
import { saveProjectNow } from "./use-autosave";
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

      try {
        await hydrateAssets();
        if (cancelled) return;
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

        // Read errors must never replace the user's document with an empty one.
        setState("error");
        setError(message);
      }
    }

    void run();

    return () => {
      cancelled = true;
      const current = useProjectStore.getState();
      if (current.project?.id === projectId && current.saveStatus !== "saved") void saveProjectNow(current.project);
      closeProject();
    };
  }, [projectId, loadProject, closeProject, hydrateAssets, setDuration]);

  return { state, error };
}
