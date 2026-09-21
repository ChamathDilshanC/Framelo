"use client";

import * as React from "react";

import { EditorCanvas } from "@/components/canvas/EditorCanvas";
import { LeftSidebar } from "@/components/editor/LeftSidebar";
import { RightSidebar } from "@/components/editor/RightSidebar";
import { ShortcutsDialog } from "@/components/editor/ShortcutsDialog";
import { TopBar } from "@/components/editor/TopBar";
import { ExportDialog } from "@/components/export/ExportDialog";
import { TemplateBrowser } from "@/components/templates/TemplateBrowser";
import { Timeline } from "@/components/timeline/Timeline";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useAutosave } from "@/lib/hooks/use-autosave";
import { useDebugBridge } from "@/lib/hooks/use-debug-bridge";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useProjectLoader } from "@/lib/hooks/use-project-loader";
import { useProjectThumbnail } from "@/lib/hooks/use-project-thumbnail";
import { useResponsivePanels } from "@/lib/hooks/use-responsive-panels";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";

interface EditorShellProps {
  projectId: string;
}

/**
 * Composes the editor. Layout and wiring live here; every panel owns its own
 * logic and reads the stores directly, so nothing is prop-drilled through.
 */
export function EditorShell({ projectId }: EditorShellProps) {
  const { state, error } = useProjectLoader(projectId);
  const project = useProjectStore((store) => store.project);

  const duration = project?.canvas.duration ?? 5;
  const fps = project?.canvas.fps ?? 30;

  useAutosave();
  useKeyboardShortcuts(fps);
  useResponsivePanels();
  useProjectThumbnail();
  useDebugBridge();
  useSyncDuration(duration);
  useDefaultSelection();

  if (state === "error") {
    return (
      <main className="flex h-dvh items-center justify-center p-8">
        <Alert tone="danger" title="This project could not be opened" className="max-w-md">
          {error ?? "Something went wrong."} Your other projects are unaffected — try opening one
          from the home page.
        </Alert>
      </main>
    );
  }

  if (state === "loading" || !project) {
    return (
      <main className="flex h-dvh flex-col items-center justify-center gap-3">
        <Spinner className="h-5 w-5" />
        <p className="text-[12px] text-ink-subtle">Opening project…</p>
      </main>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        <LeftSidebar />

        <main className="relative flex min-w-0 flex-1 flex-col surface-grid">
          <EditorCanvas
            canvas={project.canvas}
            background={project.background}
            layers={project.layers}
          />
        </main>

        <RightSidebar />
      </div>

      <Timeline layers={project.layers} canvas={project.canvas} />

      <ExportDialog />
      <ShortcutsDialog />
      <TemplateBrowser />
    </div>
  );
}

/** Keeps the editor clock's duration aligned with the composition. */
function useSyncDuration(duration: number): void {
  const setDuration = useEditorStore((state) => state.setDuration);
  React.useEffect(() => {
    setDuration(duration);
  }, [duration, setDuration]);
}

/** Select the first layer once a project is available. */
function useDefaultSelection(): void {
  const firstLayerId = useProjectStore((state) => state.project?.layers[0]?.id ?? null);
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const selectLayer = useEditorStore((state) => state.selectLayer);

  React.useEffect(() => {
    if (!firstLayerId) return;
    if (selectedLayerId) return;
    selectLayer(firstLayerId);
  }, [firstLayerId, selectedLayerId, selectLayer]);
}
