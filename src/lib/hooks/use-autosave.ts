"use client";

import * as React from 'react';
import { AUTOSAVE_DEBOUNCE_MS } from '@/lib/constants';
import { flushSyncQueue, saveProject } from '@/lib/projects/project-service';
import { notify } from '@/lib/toast';
import { useEditorStore } from '@/store/editor-store';
import { useProjectStore } from '@/store/project-store';
import type { Project } from '@/types/project';

/** Capture the viewport without adding timeline ticks to undo history. */
export function checkpointEditorView(): void {
  const editor = useEditorStore.getState();
  const project = useProjectStore.getState().project;
  if (!project || editor.isExporting) return;
  useProjectStore.getState().setEditorState({
    currentTime: Math.min(editor.currentTime, project.canvas.duration),
    cameraView: editor.cameraView, camera: editor.cameraPose, selectedLayerId: editor.selectedLayerId,
  });
}

export function useAutosave(): void {
  const project = useProjectStore(state => state.project);
  const saveStatus = useProjectStore(state => state.saveStatus);
  React.useEffect(() => useEditorStore.subscribe((state, previous) => {
    if (state.isExporting || previous.isExporting || state.isPlaying || state.cameraRestoreToken !== previous.cameraRestoreToken) return;
    if (state.currentTime !== previous.currentTime || state.isPlaying !== previous.isPlaying ||
        state.cameraPose !== previous.cameraPose || state.selectedLayerId !== previous.selectedLayerId) checkpointEditorView();
  }), []);
  React.useEffect(() => {
    if (!project || saveStatus !== 'unsaved') return;
    const timer = window.setTimeout(() => { void saveProjectNow(project); }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [project, saveStatus]);
  React.useEffect(() => {
    const flush = () => {
      const current = useProjectStore.getState().project;
      if (current) void saveProjectNow(current);
    };
    const visibility = () => { if (document.visibilityState === 'hidden') flush(); };
    const retry = () => {
      void flushSyncQueue().then(() => {
        const state = useProjectStore.getState();
        if (state.project && state.saveStatus === 'offline') void saveProjectNow(state.project);
      }).catch(() => 0);
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('online', retry);
    if (navigator.onLine) retry();
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('online', retry);
    };
  }, []);
}

/** Only the exact saved revision may update the current document's save badge. */
export async function saveProjectNow(project: Project): Promise<boolean> {
  if (useProjectStore.getState().project?.id === project.id) checkpointEditorView();
  const snapshot = useProjectStore.getState().project?.id === project.id ? useProjectStore.getState().project! : project;
  const isCurrent = () => useProjectStore.getState().project === snapshot;
  if (isCurrent()) useProjectStore.getState().setSaveStatus('saving');
  try {
    const result = await saveProject(snapshot);
    if (isCurrent()) {
      if (result.synced) useProjectStore.getState().markSaved(snapshot.updatedAt);
      else useProjectStore.getState().setSaveStatus('offline', result.error);
    }
    return true;
  } catch (error) {
    if (isCurrent()) useProjectStore.getState().setSaveStatus('error');
    notify.error('Project could not be saved', error instanceof Error ? error.message : 'Local storage is unavailable.');
    return false;
  }
}
