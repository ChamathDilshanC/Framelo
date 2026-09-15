"use client";

import {
  ChevronFirst,
  ChevronLast,
  Pause,
  Play,
  Repeat,
  Square,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Timecode } from "@/components/timeline/Playhead";
import { IconButton } from "@/components/ui/icon-button";
import { formatTimecode } from "@/lib/utils";
import {
  MAX_PIXELS_PER_SECOND,
  MIN_PIXELS_PER_SECOND,
  useEditorStore,
} from "@/store/editor-store";

interface PlaybackControlsProps {
  fps: number;
  duration: number;
}

export function PlaybackControls({ fps, duration }: PlaybackControlsProps) {
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const loop = useEditorStore((state) => state.loop);
  const pixelsPerSecond = useEditorStore((state) => state.pixelsPerSecond);

  const togglePlay = useEditorStore((state) => state.togglePlay);
  const stop = useEditorStore((state) => state.stop);
  const setLoop = useEditorStore((state) => state.setLoop);
  const setCurrentTime = useEditorStore((state) => state.setCurrentTime);
  const stepFrames = useEditorStore((state) => state.stepFrames);
  const setPixelsPerSecond = useEditorStore((state) => state.setPixelsPerSecond);

  return (
    <div className="flex h-10 shrink-0 items-center gap-3 border-b border-line px-3">
      <div className="flex items-center gap-0.5">
        <IconButton
          icon={ChevronFirst}
          label="Jump to start"
          shortcut="Home"
          size="sm"
          tooltipSide="top"
          onClick={() => setCurrentTime(0)}
        />
        <IconButton
          icon={isPlaying ? Pause : Play}
          label={isPlaying ? "Pause" : "Play"}
          shortcut="Space"
          tooltipSide="top"
          onClick={togglePlay}
          active={isPlaying}
        />
        <IconButton
          icon={Square}
          label="Stop"
          size="sm"
          tooltipSide="top"
          onClick={stop}
        />
        <IconButton
          icon={ChevronLast}
          label="Jump to end"
          shortcut="End"
          size="sm"
          tooltipSide="top"
          onClick={() => setCurrentTime(duration)}
        />
      </div>

      <div className="flex items-baseline gap-1.5 rounded-sm border border-line bg-surface-raised px-2 py-1">
        <Timecode fps={fps} className="numeric text-ink" />
        <span className="numeric text-ink-subtle">/ {formatTimecode(duration, fps)}</span>
      </div>

      <IconButton
        icon={Repeat}
        label={loop ? "Looping on" : "Looping off"}
        size="sm"
        tooltipSide="top"
        active={loop}
        onClick={() => setLoop(!loop)}
      />

      <div className="flex items-center gap-1">
        <IconButton
          icon={ZoomOut}
          label="Zoom out timeline"
          size="sm"
          tooltipSide="top"
          disabled={pixelsPerSecond <= MIN_PIXELS_PER_SECOND}
          onClick={() => setPixelsPerSecond(pixelsPerSecond / 1.4)}
        />
        <IconButton
          icon={ZoomIn}
          label="Zoom in timeline"
          size="sm"
          tooltipSide="top"
          disabled={pixelsPerSecond >= MAX_PIXELS_PER_SECOND}
          onClick={() => setPixelsPerSecond(pixelsPerSecond * 1.4)}
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="numeric hidden text-ink-subtle sm:inline">
          {fps} fps · {duration.toFixed(2)}s
        </span>
        <button
          type="button"
          onClick={() => stepFrames(-1, fps)}
          className="numeric rounded-xs border border-line bg-surface-raised px-1.5 py-1 text-ink-muted transition-colors hover:text-ink"
          aria-label="Step back one frame"
        >
          ◀ frame
        </button>
        <button
          type="button"
          onClick={() => stepFrames(1, fps)}
          className="numeric rounded-xs border border-line bg-surface-raised px-1.5 py-1 text-ink-muted transition-colors hover:text-ink"
          aria-label="Step forward one frame"
        >
          frame ▶
        </button>
      </div>
    </div>
  );
}
