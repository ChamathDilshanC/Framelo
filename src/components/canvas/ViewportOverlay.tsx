"use client";

import { Focus, Orbit, RotateCcw } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";
import { useEditorStore } from "@/store/editor-store";
import type { CanvasConfig } from "@/types/project";

interface ViewportOverlayProps {
  canvas: CanvasConfig;
}

/**
 * Floating chrome above the WebGL surface. Pointer events are disabled on the
 * container so orbiting still works everywhere except on the controls.
 */
export function ViewportOverlay({ canvas }: ViewportOverlayProps) {
  const orbitEnabled = useEditorStore((state) => state.orbitEnabled);
  const setOrbitEnabled = useEditorStore((state) => state.setOrbitEnabled);
  const requestCameraReset = useEditorStore((state) => state.requestCameraReset);
  const requestCameraFit = useEditorStore((state) => state.requestCameraFit);

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="numeric pointer-events-auto rounded-sm border border-line bg-surface/80 px-2 py-1 text-ink-muted backdrop-blur-sm">
          {canvas.width} × {canvas.height}
        </span>
        <span className="numeric pointer-events-auto rounded-sm border border-line bg-surface/80 px-2 py-1 text-ink-subtle backdrop-blur-sm">
          {canvas.fps} fps
        </span>
      </div>

      <div className="pointer-events-auto absolute top-3 right-3 flex items-center gap-0.5 rounded-md border border-line bg-surface/85 p-0.5 backdrop-blur-sm">
        <IconButton
          icon={Orbit}
          label={orbitEnabled ? "Lock camera" : "Unlock camera"}
          active={orbitEnabled}
          onClick={() => setOrbitEnabled(!orbitEnabled)}
          tooltipSide="left"
          size="sm"
        />
        <IconButton
          icon={Focus}
          label="Fit view"
          shortcut="F"
          onClick={requestCameraFit}
          tooltipSide="left"
          size="sm"
        />
        <IconButton
          icon={RotateCcw}
          label="Reset camera"
          shortcut="0"
          onClick={requestCameraReset}
          tooltipSide="left"
          size="sm"
        />
      </div>
    </div>
  );
}
