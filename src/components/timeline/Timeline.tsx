"use client";

import { ChevronDown, Magnet, PanelBottomClose, Trash2 } from "lucide-react";
import * as React from "react";

import { Playhead } from "@/components/timeline/Playhead";
import { PlaybackControls } from "@/components/timeline/PlaybackControls";
import { KeyframeContextMenu } from "@/components/timeline/KeyframeContextMenu";
import { TimelineRuler } from "@/components/timeline/TimelineRuler";
import {
  LayerSummaryRow,
  ROW_HEIGHT,
  TimelineTrack,
  type KeyframeMenuRequest,
} from "@/components/timeline/TimelineTrack";
import { keyframesInMarquee, useTimelineLayout } from "@/components/timeline/timeline-model";
import { WorkAreaBar } from "@/components/timeline/WorkAreaBar";
import {
  TRACK_LABEL_WIDTH,
  useTimelineGeometry,
} from "@/components/timeline/use-timeline-geometry";
import { IconButton } from "@/components/ui/icon-button";
import { collectKeyframeTimes } from "@/engine/animation/evaluate";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import { PROPERTY_LABELS } from "@/types/animation";
import type { Layer } from "@/types/layer";
import type { CanvasConfig } from "@/types/project";

interface TimelineProps {
  layers: Layer[];
  canvas: CanvasConfig;
}

/** A marquee under this many pixels is a click that wobbled, not a selection. */
const MARQUEE_THRESHOLD_PX = 4;

export function Timeline({ layers, canvas }: TimelineProps) {
  const { duration, fps } = canvas;

  const open = useEditorStore((state) => state.timelineOpen);
  const toggleTimeline = useEditorStore((state) => state.toggleTimeline);
  const pixelsPerSecond = useEditorStore((state) => state.pixelsPerSecond);
  const timelineSnap = useEditorStore((state) => state.timelineSnap);
  const setTimelineSnap = useEditorStore((state) => state.setTimelineSnap);

  const geometry = useTimelineGeometry(duration, pixelsPerSecond);
  const layout = useTimelineLayout(layers);

  const rulerViewportRef = React.useRef<HTMLDivElement>(null);
  const labelViewportRef = React.useRef<HTMLDivElement>(null);
  const tracksRef = React.useRef<HTMLDivElement>(null);

  const [menu, setMenu] = React.useState<KeyframeMenuRequest | null>(null);
  const [marquee, setMarquee] = React.useState<null | {
    left: number;
    top: number;
    width: number;
    height: number;
  }>(null);
  const marqueeStart = React.useRef<{ x: number; y: number; additive: boolean } | null>(null);

  /**
   * The ruler scrolls horizontally with the tracks and the label column scrolls
   * vertically with them, so every row stays aligned with its name.
   */
  function handleTracksScroll(event: React.UIEvent<HTMLDivElement>) {
    const { scrollLeft, scrollTop } = event.currentTarget;
    if (rulerViewportRef.current) rulerViewportRef.current.scrollLeft = scrollLeft;
    if (labelViewportRef.current) labelViewportRef.current.scrollTop = scrollTop;
  }

  /**
   * Zoom on Ctrl + wheel, keeping the time under the cursor still.
   *
   * Without the anchoring, zooming in on a keyframe at eight seconds walks it
   * off the right of the panel and the user has to hunt for it again — which is
   * the entire reason a timeline zoom is judged by whether it holds position.
   */
  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();

    const element = tracksRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const pointerX = event.clientX - rect.left + element.scrollLeft;
    const anchorTime = geometry.xToTime(pointerX);

    const editor = useEditorStore.getState();
    const next = editor.pixelsPerSecond * (event.deltaY < 0 ? 1.15 : 1 / 1.15);
    editor.setPixelsPerSecond(next);

    // Applied after the store settles, so the new scale is in effect.
    requestAnimationFrame(() => {
      const scaled = useEditorStore.getState().pixelsPerSecond;
      element.scrollLeft = anchorTime * scaled - (event.clientX - rect.left);
    });
  }

  function beginMarquee(event: React.PointerEvent<HTMLDivElement>) {
    // Only on empty grid. A keyframe stops propagation, so reaching here means
    // the press landed on background.
    if (event.button !== 0) return;
    const element = tracksRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    marqueeStart.current = {
      x: event.clientX - rect.left + element.scrollLeft,
      y: event.clientY - rect.top + element.scrollTop,
      additive: event.shiftKey,
    };

    if (!event.shiftKey) useEditorStore.getState().clearKeyframeSelection();
  }

  function moveMarquee(event: React.PointerEvent<HTMLDivElement>) {
    const start = marqueeStart.current;
    const element = tracksRef.current;
    if (!start || !element) return;

    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left + element.scrollLeft;
    const y = event.clientY - rect.top + element.scrollTop;

    const box = {
      left: Math.min(start.x, x),
      top: Math.min(start.y, y),
      width: Math.abs(x - start.x),
      height: Math.abs(y - start.y),
    };

    if (box.width < MARQUEE_THRESHOLD_PX && box.height < MARQUEE_THRESHOLD_PX) return;

    setMarquee(box);

    const hits = keyframesInMarquee(layers, layout, box, geometry.timeToX);
    const editor = useEditorStore.getState();
    if (start.additive) editor.addKeyframes(hits);
    else editor.selectKeyframes(hits);
  }

  function endMarquee() {
    marqueeStart.current = null;
    setMarquee(null);
  }

  const hasAnimation = layers.some((layer) =>
    layer.animations.some((track) => track.keyframes.length > 0),
  );

  return (
    <section
      aria-label="Timeline"
      className={cn(
        "flex shrink-0 flex-col overflow-hidden border-t border-line bg-surface transition-[height] duration-200 ease-out-quint",
        open ? "h-[268px]" : "h-10",
      )}
    >
      {open ? (
        <PlaybackControls fps={fps} duration={duration} />
      ) : (
        <button
          type="button"
          onClick={() => toggleTimeline(true)}
          className="flex h-10 items-center gap-2 px-3 text-[12px] text-ink-muted transition-colors hover:text-ink"
        >
          <ChevronDown className="h-3 w-3 -rotate-90" />
          Timeline
        </button>
      )}

      {open ? (
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Header: label column heading, work area strip, and the time ruler */}
          <div className="flex shrink-0 border-b border-line">
            <div
              className="flex shrink-0 flex-col justify-between border-r border-line pr-1.5 pl-2"
              style={{ width: TRACK_LABEL_WIDTH }}
            >
              <div className="flex h-3 items-center">
                <span className="text-[9px] tracking-wide text-ink-subtle uppercase">Work area</span>
              </div>
              <div className="flex h-8 items-center justify-between">
                <span className="panel-label">Layers &amp; tracks</span>
                <div className="flex items-center">
                  <IconButton
                    icon={Magnet}
                    label={timelineSnap ? "Snapping on" : "Snapping off"}
                    size="sm"
                    tooltipSide="top"
                    active={timelineSnap}
                    onClick={() => setTimelineSnap(!timelineSnap)}
                  />
                  <IconButton
                    icon={PanelBottomClose}
                    label="Collapse timeline"
                    size="sm"
                    tooltipSide="top"
                    onClick={() => toggleTimeline(false)}
                  />
                </div>
              </div>
            </div>

            <div ref={rulerViewportRef} className="relative min-w-0 flex-1 overflow-hidden">
              <WorkAreaBar canvas={canvas} geometry={geometry} />
              <TimelineRuler
                geometry={geometry}
                duration={duration}
                pixelsPerSecond={pixelsPerSecond}
                fps={fps}
              />
              <div className="pointer-events-none absolute inset-0" style={{ width: geometry.width }}>
                <Playhead pixelsPerSecond={pixelsPerSecond} showHandle />
              </div>
            </div>
          </div>

          {/* Body: label column + scrollable tracks */}
          <div className="flex min-h-0 flex-1">
            <div
              ref={labelViewportRef}
              className="shrink-0 overflow-hidden border-r border-line"
              style={{ width: TRACK_LABEL_WIDTH }}
            >
              {layers.map((layer) => (
                <LayerLabels key={layer.id} layer={layer} />
              ))}
            </div>

            <div
              ref={tracksRef}
              onScroll={handleTracksScroll}
              onWheel={handleWheel}
              onPointerDown={beginMarquee}
              onPointerMove={moveMarquee}
              onPointerUp={endMarquee}
              onPointerLeave={endMarquee}
              className="relative min-h-0 min-w-0 flex-1 overflow-auto"
            >
              <div className="relative" style={{ width: geometry.width }}>
                <Playhead pixelsPerSecond={pixelsPerSecond} />

                {/* The unlit part of the composition, drawn behind the rows so
                    the work area is visible against the keyframes it contains. */}
                <WorkAreaShade canvas={canvas} geometry={geometry} height={layout.height} />

                {layers.map((layer) => (
                  <div key={layer.id}>
                    <LayerSummaryRow times={collectKeyframeTimes(layer)} geometry={geometry} />
                    {layer.animations
                      .filter((track) => track.keyframes.length > 0)
                      .map((track) => (
                        <TimelineTrack
                          key={track.property}
                          layerId={layer.id}
                          track={track}
                          geometry={geometry}
                          duration={duration}
                          fps={fps}
                          onContextMenu={setMenu}
                        />
                      ))}
                  </div>
                ))}

                {marquee ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute z-30 rounded-xs border border-accent bg-accent/12"
                    style={marquee}
                  />
                ) : null}
              </div>

              {!hasAnimation ? (
                <p className="sticky left-0 max-w-md px-4 py-5 text-[11px] leading-relaxed text-ink-subtle">
                  No keyframes yet. Use the diamond beside any transform property to start a track,
                  press K at the playhead, or apply a device motion template from the left sidebar.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <KeyframeContextMenu request={menu} onClose={() => setMenu(null)} fps={fps} />
    </section>
  );
}

/** Dims everything outside the in/out range, across every track row. */
function WorkAreaShade({
  canvas,
  geometry,
  height,
}: {
  canvas: CanvasConfig;
  geometry: TimelineGeometry_;
  height: number;
}) {
  const area = canvas.workArea;
  if (!area?.enabled || height === 0) return null;

  const left = geometry.timeToX(Math.max(0, area.in));
  const right = geometry.timeToX(Math.min(canvas.duration, area.out));

  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0" style={{ height }}>
      <span className="absolute top-0 bottom-0 left-0 bg-black/25" style={{ width: left }} />
      <span className="absolute top-0 right-0 bottom-0 bg-black/25" style={{ left: right }} />
    </div>
  );
}

type TimelineGeometry_ = ReturnType<typeof useTimelineGeometry>;

function LayerLabels({ layer }: { layer: Layer }) {
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const selectLayer = useEditorStore((state) => state.selectLayer);
  const clearTrack = useProjectStore((state) => state.clearTrack);

  const tracks = layer.animations.filter((track) => track.keyframes.length > 0);
  const active = layer.id === selectedLayerId;

  return (
    <div>
      <button
        type="button"
        onClick={() => selectLayer(layer.id)}
        style={{ height: ROW_HEIGHT }}
        className={cn(
          "flex w-full items-center gap-2 border-b border-line px-2 text-left transition-colors",
          active ? "bg-surface-active" : "bg-surface-raised/40 hover:bg-surface-hover",
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            active ? "bg-accent" : "bg-ink-subtle/40",
          )}
        />
        <span className="truncate text-[11px] font-medium text-ink">{layer.name}</span>
      </button>

      {tracks.map((track) => (
        <TrackLabel
          key={track.property}
          layerId={layer.id}
          property={track.property}
          count={track.keyframes.length}
          onClear={() => clearTrack(layer.id, track.property)}
        />
      ))}
    </div>
  );
}

function TrackLabel({
  layerId,
  property,
  count,
  onClear,
}: {
  layerId: string;
  property: keyof typeof PROPERTY_LABELS;
  count: number;
  onClear: () => void;
}) {
  const selectKeyframes = useEditorStore((state) => state.selectKeyframes);

  return (
    <div
      style={{ height: ROW_HEIGHT }}
      className="group flex items-center gap-2 border-b border-line/60 pr-1 pl-6"
    >
      <button
        type="button"
        // Clicking a track name selects its keyframes, the way clicking a
        // property name does in After Effects. It is the fastest way to grab a
        // whole track and re-time or re-ease it in one go.
        onClick={() => {
          const layer = useProjectStore
            .getState()
            .project?.layers.find((entry) => entry.id === layerId);
          const track = layer?.animations.find((entry) => entry.property === property);
          if (!track) return;
          selectKeyframes(
            track.keyframes.map((keyframe) => ({
              layerId,
              property,
              keyframeId: keyframe.id,
            })),
          );
        }}
        className="min-w-0 flex-1 truncate text-left text-[11px] text-ink-muted transition-colors hover:text-ink"
        title={`Select all ${PROPERTY_LABELS[property]} keyframes`}
      >
        {PROPERTY_LABELS[property]}
      </button>
      <span className="numeric text-ink-subtle">{count}</span>
      <IconButton
        icon={Trash2}
        label={`Clear ${PROPERTY_LABELS[property]}`}
        size="sm"
        tone="danger"
        tooltipSide="top"
        onClick={onClear}
        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      />
    </div>
  );
}
