"use client";

import * as React from "react";

import { AUTOSAVE_DEBOUNCE_MS } from "@/lib/constants";
import { flushSyncQueue, saveProject } from "@/lib/projects/project-service";
import { notify } from "@/lib/toast";
import { useProjectStore } from "@/store/project-store";
import type { Project } from "@/types/project";

/**
 * Debounced, optimistic persistence.
 *
 * The editor never waits for a save. Local state updates on the keystroke, the
 * local write happens once the user pauses, and the cloud write follows it —
 * so "Saved" means the work is durable on this machine, which is the promise
 * that actually matters.
 *
 * A failed sync is explicitly **not** an error state for the user's data: the
 * draft is safe locally and the queue retries it. That is said out loud rather
 * than shown as a red failure, because the two are genuinely different.
 */
export function useAutosave(): void {
  const project = useProjectStore((state) => state.project);
  const saveStatus = useProjectStore((state) => state.saveStatus);
  const setSaveStatus = useProjectStore((state) => state.setSaveStatus);
  const markSaved = useProjectStore((state) => state.markSaved);

  const syncWarned = React.useRef(false);
  const lastSavedSnapshot = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!project || saveStatus !== "unsaved") return;

    const timer = window.setTimeout(() => {
      void run(project);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);

    async function run(current: Project) {
      // Undo and redo can land the project back on a state already written.
      const snapshot = JSON.stringify(current);
      if (snapshot === lastSavedSnapshot.current) {
        markSaved();
        return;
      }

      setSaveStatus("saving");

      try {
        const result = await saveProject(current);
        lastSavedSnapshot.current = snapshot;

        if (result.synced) {
          markSaved(current.updatedAt);
          syncWarned.current = false;
          return;
        }

        // Local write succeeded, cloud write did not.
        setSaveStatus("offline");
        if (!syncWarned.current) {
          syncWarned.current = true;
          notify.warning(
            "Couldn't sync changes",
            "Your local draft is safe. Framelo will retry automatically.",
          );
        }
      } catch (error) {
        setSaveStatus("error");
        notify.error(
          "Project could not be saved",
          error instanceof Error ? error.message : "Local storage is unavailable.",
        );
      }
    }
  }, [project, saveStatus, setSaveStatus, markSaved]);

  useRetryOnReconnect();
}

/**
 * Retry pending pushes when the connection returns.
 *
 * Listening for `online` rather than polling: a tab that is offline for an hour
 * should make zero requests in that hour.
 */
function useRetryOnReconnect(): void {
  const setSaveStatus = useProjectStore((state) => state.setSaveStatus);
  const markSaved = useProjectStore((state) => state.markSaved);

  React.useEffect(() => {
    async function retry() {
      const pushed = await flushSyncQueue().catch(() => 0);
      if (pushed === 0) return;

      markSaved();
      notify.success("Changes synced", `${pushed} project${pushed === 1 ? "" : "s"} brought up to date.`);
    }

    function handleOffline() {
      if (useProjectStore.getState().saveStatus === "saved") setSaveStatus("offline");
    }

    window.addEventListener("online", retry);
    window.addEventListener("offline", handleOffline);

    // Also try once on mount, for the case where the tab was closed offline.
    if (navigator.onLine) void retry();

    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("offline", handleOffline);
    };
  }, [setSaveStatus, markSaved]);
}

/** Explicit save, used by Cmd/Ctrl+S and the save-status button. */
export async function saveProjectNow(project: Project): Promise<boolean> {
  const store = useProjectStore.getState();
  store.setSaveStatus("saving");

  try {
    const result = await saveProject(project);
    if (result.synced) {
      store.markSaved(project.updatedAt);
      return true;
    }

    store.setSaveStatus("offline");
    notify.warning("Saved locally", "Your draft is safe. Framelo will sync when you're back online.");
    return true;
  } catch (error) {
    store.setSaveStatus("error");
    notify.error(
      "Project could not be saved",
      error instanceof Error ? error.message : "Local storage is unavailable.",
    );
    return false;
  }
}
