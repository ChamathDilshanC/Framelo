"use client";

import * as React from "react";

import { useEditorStore } from "@/store/editor-store";

interface PlayheadProps {
  pixelsPerSecond: number;
  /** The ruler copy carries the grab handle; track rows show the line only. */
  showHandle?: boolean;
}

/**
 * The playhead updates 60 times a second during playback, so it is positioned
 * imperatively — React never re-renders the timeline while the clock runs.
 */
export function Playhead({ pixelsPerSecond, showHandle = false }: PlayheadProps) {
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function apply(time: number) {
      const element = elementRef.current;
      if (element) element.style.transform = `translateX(${time * pixelsPerSecond}px)`;
    }

    apply(useEditorStore.getState().currentTime);
    return useEditorStore.subscribe((state) => apply(state.currentTime));
  }, [pixelsPerSecond]);

  return (
    <div
      ref={elementRef}
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 z-20 w-px bg-accent will-change-transform"
    >
      {showHandle ? (
        <span className="absolute -top-px -left-[5px] h-2.5 w-[11px] rounded-b-xs bg-accent" />
      ) : null}
    </div>
  );
}

/** Live timecode readout, isolated so only this node re-renders each frame. */
export function Timecode({ fps, className }: { fps: number; className?: string }) {
  const elementRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    function apply(time: number) {
      const element = elementRef.current;
      if (!element) return;
      const whole = Math.floor(time);
      const frames = Math.min(Math.round((time - whole) * fps), fps - 1);
      const mm = String(Math.floor(whole / 60)).padStart(2, "0");
      const ss = String(whole % 60).padStart(2, "0");
      element.textContent = `${mm}:${ss}.${String(frames).padStart(2, "0")}`;
    }

    apply(useEditorStore.getState().currentTime);
    return useEditorStore.subscribe((state) => apply(state.currentTime));
  }, [fps]);

  return <span ref={elementRef} className={className} />;
}
