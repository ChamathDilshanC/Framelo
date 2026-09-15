"use client";

import * as React from "react";

import { captureThumbnail, scheduleIdleThumbnail } from "@/engine/scene/thumbnail";
import { useBackgroundAssetUrl } from "@/lib/hooks/use-background-asset";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";

/**
 * Keeps a project's poster image roughly current.
 *
 * Deliberately lazy. A thumbnail is a real 3D render, so it is taken only when
 * the editor has been idle for a few seconds *and* the project has meaningfully
 * changed — never while scrubbing, dragging or playing back, and never more
 * often than the capture's own rate limit allows.
 *
 * "Meaningfully changed" is judged from the project's structure — device,
 * background, screen media, canvas — not from its keyframe values, because
 * nudging a keyframe by a frame does not change what the poster should look
 * like.
 */
export function useProjectThumbnail(): void {
  const projectId = useProjectStore((state) => state.project?.id ?? null);
  const saveStatus = useProjectStore((state) => state.saveStatus);
  const isPlaying = useEditorStore((state) => state.isPlaying);

  const signature = useProjectStore((state) => {
    const project = state.project;
    if (!project) return "";

    const device = project.layers.find((layer) => layer.type === "device");
    const metadata = (device?.metadata ?? {}) as Record<string, unknown>;

    return [
      project.canvas.width,
      project.canvas.height,
      project.background.type,
      JSON.stringify(project.background),
      metadata.deviceId,
      metadata.screenAssetId,
      JSON.stringify(metadata.deviceAppearance),
      project.layers.length,
    ].join("|");
  });

  const background = useProjectStore((state) => state.project?.background ?? null);
  const aspect = useProjectStore((state) => {
    const canvas = state.project?.canvas;
    return canvas ? canvas.width / canvas.height : 16 / 9;
  });

  const backgroundAssetUrl = useBackgroundAssetUrl(background);

  React.useEffect(() => {
    // Capturing mid-playback would poster a random frame, and capturing before
    // the save has landed would poster a project that does not exist yet.
    if (!projectId || !background || isPlaying || saveStatus !== "saved") return;

    return scheduleIdleThumbnail({
      projectId,
      aspect,
      background,
      backgroundAssetUrl,
    });
  }, [projectId, signature, saveStatus, isPlaying, aspect, background, backgroundAssetUrl]);
}

/** Force a capture — used after an export, when the frame is already proven. */
export async function captureThumbnailNow(): Promise<void> {
  const project = useProjectStore.getState().project;
  if (!project) return;

  await captureThumbnail({
    projectId: project.id,
    aspect: project.canvas.width / project.canvas.height,
    background: project.background,
    force: true,
  });
}
