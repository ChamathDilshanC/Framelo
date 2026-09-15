"use client";

import * as React from "react";
import * as THREE from "three";

import { evaluateTransform } from "@/engine/animation/evaluate";
import { sceneRegistry } from "@/engine/scene/capture";
import { textBlockMetrics } from "@/engine/text/text-renderer";
import { visibleContent } from "@/engine/text/text-layout";
import {
  pxToWorld,
  resolveTextMetadata,
  TEXT_PLACEHOLDER,
  worldToPx,
  type TextLayerMetadata,
} from "@/engine/text/text-types";
import {
  projectQuad,
  quadBounds,
  screenDeltaToWorld,
  screenToWorld,
  worldUnitsPerPixel,
  type ScreenPoint,
} from "@/engine/text/text-viewport";
import {
  pointsAttribute,
  useQuadTracking,
  type QuadHandles,
} from "@/components/text/TextSelectionChrome";
import { degToRad } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import type { Layer } from "@/types/layer";

interface TextCanvasOverlayProps {
  layers: Layer[];
  frame: { width: number; height: number };
}

/**
 * Direct manipulation of text on the canvas.
 *
 * The text itself is a plane in the WebGL scene; this is the HTML above it that
 * makes it editable. The division is deliberate (§41): a caret, a selection and
 * the browser's own IME belong to a real text field, and reimplementing them
 * inside a texture would be writing a text editor from scratch — which is
 * exactly where multilingual input breaks.
 *
 * So while a layer is being edited its plane hides and a transparent textarea
 * takes its place, matched to the same position, size and typeface. Everywhere
 * else the overlay is only chrome: an outline, handles, and guides.
 *
 * Positions are recomputed every frame and written straight to `style`, never
 * to React state. The camera can be orbited while text is selected and the box
 * follows it without re-rendering anything.
 */
export function TextCanvasOverlay({ layers, frame }: TextCanvasOverlayProps) {
  const activeTool = useEditorStore((state) => state.activeTool);
  const selectedLayerId = useEditorStore((state) => state.selectedLayerId);
  const editingLayerId = useEditorStore((state) => state.editingLayerId);
  const rootRef = React.useRef<HTMLDivElement>(null);

  useDeselectOnEmptyCanvas(rootRef);

  const textLayers = React.useMemo(
    () => layers.filter((layer) => layer.type === "text" && layer.visible),
    [layers],
  );

  const editingLayer = textLayers.find((layer) => layer.id === editingLayerId) ?? null;

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      {activeTool === "text" ? <TextCreationSurface frame={frame} /> : null}

      {textLayers.map((layer) => (
        <TextLayerHandle
          key={layer.id}
          layer={layer}
          frame={frame}
          selected={layer.id === selectedLayerId}
          editing={layer.id === editingLayerId}
          interactive={activeTool === "select"}
        />
      ))}

      {editingLayer ? <TextEditingField layer={editingLayer} frame={frame} /> : null}
    </div>
  );
}

/**
 * Clicking empty space clears the selection.
 *
 * The test is precise on purpose: only a press that reaches the WebGL canvas
 * itself counts as empty space. A text layer's outline sits above the canvas
 * and consumes its own presses, and the viewport buttons are their own
 * elements — so neither is mistaken for a click on nothing.
 */
function useDeselectOnEmptyCanvas(rootRef: React.RefObject<HTMLDivElement | null>): void {
  React.useEffect(() => {
    const container = rootRef.current?.parentElement;
    if (!container) return;

    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof HTMLCanvasElement)) return;
      const editor = useEditorStore.getState();
      // The text tool is placing a layer; that press is not a deselect.
      if (editor.activeTool !== "select") return;
      if (editor.editingLayerId) editor.endTextEditing();
      if (editor.selectedLayerId) editor.selectLayer(null);
    }

    container.addEventListener("pointerdown", handlePointerDown);
    return () => container.removeEventListener("pointerdown", handlePointerDown);
  }, [rootRef]);
}

// ---------------------------------------------------------------------------
// Creation
// ---------------------------------------------------------------------------

/** How far the pointer must travel before a click becomes a fixed-width box. */
const DRAG_THRESHOLD = 12;

/**
 * The surface the text tool draws on.
 *
 * A click creates auto-width text; a drag creates a text box of that width,
 * which then wraps (§1, §6).
 */
function TextCreationSurface({ frame }: { frame: { width: number; height: number } }) {
  const addTextLayer = useProjectStore((state) => state.addTextLayer);
  const beginTextEditing = useEditorStore((state) => state.beginTextEditing);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);

  const [marquee, setMarquee] = React.useState<{
    start: ScreenPoint;
    current: ScreenPoint;
  } | null>(null);

  function pointFrom(event: React.PointerEvent<HTMLDivElement>): ScreenPoint {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = pointFrom(event);
    setMarquee({ start, current: start });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!marquee) return;
    setMarquee({ ...marquee, current: pointFrom(event) });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!marquee) return;
    const end = pointFrom(event);
    setMarquee(null);

    const handle = sceneRegistry.get();
    if (!handle) return;

    const width = Math.abs(end.x - marquee.start.x);
    const dragged = width > DRAG_THRESHOLD;

    // A dragged box is created around its centre, so the text sits where the
    // rectangle was drawn rather than hanging off its first corner.
    const centre = dragged
      ? { x: (marquee.start.x + end.x) / 2, y: (marquee.start.y + end.y) / 2 }
      : marquee.start;

    const depth = 0.6;
    const world = screenToWorld(handle.camera, centre, frame, depth);
    const perPixel = worldUnitsPerPixel(handle.camera, world, frame);

    const overrides: Partial<TextLayerMetadata> = dragged
      ? { boxMode: "fixed", boxWidth: Math.round(worldToPx(width * perPixel)) }
      : {};

    const layerId = addTextLayer(overrides);
    if (!layerId) return;

    useProjectStore.getState().setTransformValue(layerId, "x", round(world.x));
    useProjectStore.getState().setTransformValue(layerId, "y", round(world.y));

    // Straight into typing, and back to the select tool — an armed tool that
    // stays armed makes the next click create a layer nobody asked for (§48).
    beginTextEditing(layerId);
    setActiveTool("select");
  }

  const box = marquee
    ? {
        left: Math.min(marquee.start.x, marquee.current.x),
        top: Math.min(marquee.start.y, marquee.current.y),
        width: Math.abs(marquee.current.x - marquee.start.x),
        height: Math.abs(marquee.current.y - marquee.start.y),
      }
    : null;

  return (
    <div
      role="presentation"
      aria-label="Click or drag to add text"
      className="pointer-events-auto absolute inset-0 cursor-text"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {box && box.width > DRAG_THRESHOLD ? (
        <div
          className="absolute border border-dashed border-accent/80 bg-accent/10"
          style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selection, move, resize, rotate
// ---------------------------------------------------------------------------

type DragMode =
  | { kind: "move"; startWorld: { x: number; y: number } }
  | { kind: "rotate"; centre: ScreenPoint; startAngle: number; startRotation: number }
  | { kind: "width"; edge: "left" | "right"; startWidth: number }
  | { kind: "scale"; startScale: { x: number; y: number }; startDistance: number };

/** Snap distance, in screen pixels (§38). */
const SNAP_THRESHOLD = 6;

/**
 * Memoised for the same reason as the scene object: a project commit rebuilds
 * the layers array, and without this every text layer would re-measure its
 * text layout on every edit to any other layer.
 */
const TextLayerHandle = React.memo(function TextLayerHandle({
  layer,
  frame,
  selected,
  editing,
  interactive,
}: {
  layer: Layer;
  frame: { width: number; height: number };
  selected: boolean;
  editing: boolean;
  interactive: boolean;
}) {
  const hitRef = React.useRef<SVGPolygonElement>(null);
  const outlineRef = React.useRef<SVGPolygonElement>(null);
  const handlesRef = React.useRef<HTMLDivElement>(null);
  const guidesRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<DragMode | null>(null);
  // Kept for the rotate gesture, which needs the on-screen centre.
  const centreRef = React.useRef<ScreenPoint>({ x: 0, y: 0 });

  const selectLayer = useEditorStore((state) => state.selectLayer);
  const beginTextEditing = useEditorStore((state) => state.beginTextEditing);

  const style = React.useMemo(() => resolveTextMetadata(layer.metadata), [layer.metadata]);
  const metrics = React.useMemo(
    () => textBlockMetrics(style, visibleContent(style, style.content || TEXT_PLACEHOLDER, undefined)),
    [style],
  );

  // One projection per frame feeds the hit area, the outline and every
  // handle, so they can never disagree about where the text is.
  useQuadTracking(layer, metrics, frame, (handles) => {
    const points = pointsAttribute(handles.corners);
    hitRef.current?.setAttribute("points", points);
    outlineRef.current?.setAttribute("points", points);
    centreRef.current = handles.centre;
    positionHandles(handlesRef.current, handles);
  });

  const locked = layer.locked;

  function handlePointerDown(event: React.PointerEvent<SVGPolygonElement>) {
    if (locked || editing) return;
    event.stopPropagation();
    selectLayer(layer.id);
    if (!selected) return;

    const transform = currentTransform(layer);
    beginDrag(event, { kind: "move", startWorld: { x: transform.x, y: transform.y } });
  }

  function beginDrag(event: React.PointerEvent<Element>, mode: DragMode) {
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    dragRef.current = mode;

    const startX = event.clientX;
    const startY = event.clientY;
    const time = useEditorStore.getState().currentTime;
    const store = useProjectStore.getState();

    function onMove(moveEvent: PointerEvent) {
      const mode = dragRef.current;
      const handle = sceneRegistry.get();
      if (!mode || !handle) return;

      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (mode.kind === "move") {
        applyMove(mode, handle.camera, dx, dy, moveEvent.shiftKey);
        return;
      }

      if (mode.kind === "rotate") {
        const angle = Math.atan2(
          moveEvent.clientY - mode.centre.y,
          moveEvent.clientX - mode.centre.x,
        );
        const degrees = mode.startRotation - ((angle - mode.startAngle) * 180) / Math.PI;
        // Shift snaps to 15°, the increment a designer actually wants.
        const snapped = moveEvent.shiftKey ? Math.round(degrees / 15) * 15 : Math.round(degrees);
        store.setTransformValue(layer.id, "rotationZ", snapped, {
          time,
          coalesceKey: `text:rotate:${layer.id}`,
        });
        return;
      }

      if (mode.kind === "width") {
        const perPixel = worldUnitsPerPixel(handle.camera, currentTransform(layer), frame);
        const deltaPx = worldToPx((mode.edge === "right" ? dx : -dx) * perPixel);
        store.updateTextMetadata(
          layer.id,
          { boxMode: "fixed", boxWidth: Math.max(40, Math.round(mode.startWidth + deltaPx)) },
          { coalesceKey: `text:width:${layer.id}` },
        );
        return;
      }

      if (mode.kind === "scale") {
        const distance = Math.hypot(dx, dy);
        const ratio = 1 + (distance * Math.sign(dx + dy)) / Math.max(60, mode.startDistance);
        const next = Math.max(0.05, Math.min(3, mode.startScale.x * ratio));
        store.setTransformValue(layer.id, "scaleX", round(next), {
          time,
          coalesceKey: `text:scale:${layer.id}`,
        });
        store.setTransformValue(layer.id, "scaleY", round(next), {
          time,
          coalesceKey: `text:scale:${layer.id}`,
        });
      }
    }

    function applyMove(
      mode: Extract<DragMode, { kind: "move" }>,
      camera: THREE.Camera,
      dx: number,
      dy: number,
      shift: boolean,
    ) {
      // Shift locks to whichever axis the pointer has travelled furthest along,
      // decided per move so the lock follows the gesture (§8).
      const lockX = shift && Math.abs(dx) < Math.abs(dy);
      const lockY = shift && Math.abs(dy) <= Math.abs(dx);

      const delta = screenDeltaToWorld(
        camera,
        { x: mode.startWorld.x, y: mode.startWorld.y, z: currentTransform(layer).z },
        frame,
        lockX ? 0 : dx,
        lockY ? 0 : dy,
      );

      let nextX = mode.startWorld.x + delta.x;
      let nextY = mode.startWorld.y + delta.y;

      const snap = useEditorStore.getState().snapEnabled;
      const guides: Array<"x" | "y"> = [];

      if (snap) {
        const perPixel = worldUnitsPerPixel(camera, { x: nextX, y: nextY, z: 0 }, frame);
        const tolerance = SNAP_THRESHOLD * perPixel;
        // The composition centre is the only guide worth snapping to here: it
        // is where a headline is centred and where the device sits.
        if (Math.abs(nextX) < tolerance) {
          nextX = 0;
          guides.push("x");
        }
        if (Math.abs(nextY) < tolerance) {
          nextY = 0;
          guides.push("y");
        }
      }

      showGuides(guidesRef.current, guides);

      store.setTransformValue(layer.id, "x", round(nextX), {
        time,
        coalesceKey: `text:move:${layer.id}`,
      });
      store.setTransformValue(layer.id, "y", round(nextY), {
        time,
        coalesceKey: `text:move:${layer.id}`,
      });
    }

    function onUp() {
      dragRef.current = null;
      showGuides(guidesRef.current, []);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const showChrome = selected && !editing && !locked;

  return (
    <>
      <div ref={guidesRef} className="pointer-events-none absolute inset-0" hidden>
        <div data-guide="x" className="absolute inset-y-0 left-1/2 w-px bg-accent/70" hidden />
        <div data-guide="y" className="absolute inset-x-0 top-1/2 h-px bg-accent/70" hidden />
      </div>

      {/*
        The quad is both the outline and the hit area. Drawn as a polygon
        through the four projected corners rather than as a CSS box, because
        under perspective a rotated layer is a general quadrilateral and a box
        could only show its axis-aligned bounds.
      */}
      <svg
        className="absolute inset-0 h-full w-full overflow-visible"
        width={frame.width}
        height={frame.height}
        aria-hidden
      >
        <polygon
          ref={hitRef}
          points=""
          fill="transparent"
          className={cn(
            interactive && !locked && !editing ? "pointer-events-auto" : "pointer-events-none",
          )}
          style={{ cursor: locked ? "default" : "move" }}
          onPointerDown={handlePointerDown}
          onDoubleClick={(event) => {
            if (locked) return;
            event.stopPropagation();
            beginTextEditing(layer.id);
          }}
        />
        <polygon
          ref={outlineRef}
          points=""
          fill="none"
          className="pointer-events-none"
          stroke={showChrome ? "var(--framelo-accent, #7C5CFF)" : "transparent"}
          strokeWidth={1}
        />
      </svg>

      {showChrome ? (
        <div ref={handlesRef} className="pointer-events-none absolute inset-0">
          <SelectionChrome
            layer={layer}
            style={style}
            metrics={metrics}
            frame={frame}
            centreRef={centreRef}
            onBeginDrag={beginDrag}
          />
        </div>
      ) : null}
    </>
  );
});

/**
 * Put each handle on its projected point.
 *
 * Written straight to the DOM from the tracking callback: a handle that
 * re-rendered React every frame would make orbiting a selected layer cost a
 * tree pass per frame, for four dots and a line.
 */
function positionHandles(container: HTMLDivElement | null, handles: QuadHandles): void {
  if (!container) return;

  const place = (selector: string, point: ScreenPoint) => {
    const element = container.querySelector<HTMLElement>(selector);
    if (!element) return;
    element.style.left = `${point.x}px`;
    element.style.top = `${point.y}px`;
  };

  const names = ["tl", "tr", "br", "bl"] as const;
  handles.corners.forEach((corner, index) => place(`[data-handle="${names[index]}"]`, corner));

  place('[data-handle="left"]', handles.left);
  place('[data-handle="right"]', handles.right);
  place('[data-handle="rotate"]', handles.rotate);

  // The stalk runs from the top edge to the rotate handle, so it stays
  // attached however the layer is turned.
  const stalk = container.querySelector<HTMLElement>('[data-handle="stalk"]');
  if (stalk) {
    const top = {
      x: (handles.corners[0].x + handles.corners[1].x) / 2,
      y: (handles.corners[0].y + handles.corners[1].y) / 2,
    };
    const dx = handles.rotate.x - top.x;
    const dy = handles.rotate.y - top.y;
    stalk.style.left = `${top.x}px`;
    stalk.style.top = `${top.y}px`;
    stalk.style.width = `${Math.hypot(dx, dy)}px`;
    stalk.style.transform = `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)`;
  }
}

/**
 * The handles drawn on a selected layer.
 *
 * Each one is positioned by `positionHandles` at a projected point, so they
 * follow the text through a three-dimensional rotation instead of sitting on
 * the corners of a flat box that no longer matches it.
 *
 * Width handles only appear on a fixed-width box, because dragging the side of
 * auto-width text has nothing to change — the box is whatever the words need.
 * Corner handles scale, and are distinct from width on purpose: one reflows the
 * text, the other makes the same text bigger (§9).
 */
function SelectionChrome({
  layer,
  style,
  metrics,
  frame,
  centreRef,
  onBeginDrag,
}: {
  layer: Layer;
  style: TextLayerMetadata;
  metrics: { pixelWidth: number; pixelHeight: number };
  frame: { width: number; height: number };
  centreRef: React.RefObject<ScreenPoint>;
  onBeginDrag: (event: React.PointerEvent<Element>, mode: DragMode) => void;
}) {
  function startRotate(event: React.PointerEvent<Element>) {
    event.stopPropagation();

    // The tracked centre is in frame coordinates; the gesture works in client
    // coordinates, so it is converted once here rather than per move.
    const rect = event.currentTarget.closest("svg, div")?.getBoundingClientRect();
    const origin = rect ?? { left: 0, top: 0 };
    const centre = {
      x: origin.left + centreRef.current.x,
      y: origin.top + centreRef.current.y,
    };

    onBeginDrag(event, {
      kind: "rotate",
      centre,
      startAngle: Math.atan2(event.clientY - centre.y, event.clientX - centre.x),
      startRotation: currentTransform(layer).rotationZ,
    });
  }

  const dot = "pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2";

  return (
    <>
      <span
        data-handle="stalk"
        className="pointer-events-none absolute h-px origin-left bg-accent/60"
      />
      <button
        type="button"
        data-handle="rotate"
        aria-label="Rotate text"
        onPointerDown={startRotate}
        className={cn(dot, "h-3 w-3 cursor-grab rounded-full border border-accent bg-surface")}
      />

      {style.boxMode === "fixed"
        ? (["left", "right"] as const).map((edge) => (
            <button
              key={edge}
              type="button"
              data-handle={edge}
              aria-label={`Resize text box ${edge} edge`}
              onPointerDown={(event) => {
                event.stopPropagation();
                onBeginDrag(event, { kind: "width", edge, startWidth: style.boxWidth });
              }}
              className={cn(
                dot,
                "h-5 w-1.5 cursor-ew-resize rounded-xs border border-accent bg-surface",
              )}
            />
          ))
        : null}

      {(
        [
          ["tl", "nwse-resize", "top left"],
          ["tr", "nesw-resize", "top right"],
          ["br", "nwse-resize", "bottom right"],
          ["bl", "nesw-resize", "bottom left"],
        ] as const
      ).map(([name, cursor, label]) => (
        <button
          key={name}
          type="button"
          data-handle={name}
          aria-label={`Scale text from ${label}`}
          onPointerDown={(event) => {
            event.stopPropagation();
            const transform = currentTransform(layer);
            onBeginDrag(event, {
              kind: "scale",
              startScale: { x: transform.scaleX, y: transform.scaleY },
              startDistance: Math.max(frame.width, metrics.pixelWidth) / 8,
            });
          }}
          className={cn(dot, "h-2 w-2 rounded-xs border border-accent bg-surface")}
          style={{ cursor }}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

/**
 * The in-place editor.
 *
 * A real `<textarea>`, so the caret, selection, clipboard, undo inside the
 * field, and every input method the browser supports all work without being
 * reimplemented — which is the only way multilingual typing is ever going to
 * be correct (§5, §46, §52).
 *
 * It is styled to match the rendered text closely enough to edit in place,
 * while the scene plane for this layer is hidden so the two never double up.
 */
function TextEditingField({
  layer,
  frame,
}: {
  layer: Layer;
  frame: { width: number; height: number };
}) {
  const areaRef = React.useRef<HTMLTextAreaElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);

  const setTextContent = useProjectStore((state) => state.setTextContent);
  const endTextEditing = useEditorStore((state) => state.endTextEditing);

  const style = React.useMemo(() => resolveTextMetadata(layer.metadata), [layer.metadata]);
  const metrics = React.useMemo(
    () => textBlockMetrics(style, style.content || TEXT_PLACEHOLDER),
    [style],
  );

  const scale = useProjectedBox(boxRef, layer, metrics, frame);

  React.useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.focus();
    // A brand-new layer is empty, so there is nothing to select; an existing
    // one selects everything, which is what double-clicking text should do.
    area.setSelectionRange(area.value.length, area.value.length);
  }, []);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Escape finishes editing. Every other key belongs to the field —
    // including Space, which would otherwise start playback, and Backspace,
    // which would otherwise delete the layer (§5, §47).
    if (event.key === "Escape") {
      event.preventDefault();
      endTextEditing();
      return;
    }
    event.stopPropagation();
  }

  return (
    <div ref={boxRef} className="pointer-events-none absolute origin-center">
      <textarea
        ref={areaRef}
        aria-label={`Edit ${layer.name}`}
        value={style.content}
        onChange={(event) => setTextContent(layer.id, event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={endTextEditing}
        spellCheck={false}
        dir={style.direction === "auto" ? "auto" : style.direction}
        className="pointer-events-auto h-full w-full resize-none overflow-hidden border border-accent bg-transparent p-0 text-ink outline-none"
        style={{
          fontFamily: `var(--framelo-text-family, inherit)`,
          fontSize: style.fontSize * scale,
          lineHeight: `${style.fontSize * style.lineHeight * scale}px`,
          letterSpacing: style.letterSpacing * scale,
          fontWeight: style.fontWeight,
          fontStyle: style.fontStyle,
          textAlign: style.textAlign,
          color: style.fill.type === "solid" ? style.fill.color : style.fill.gradient.from,
          textTransform: style.textTransform === "none" ? "none" : style.textTransform,
          padding: metrics.padding * scale,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared positioning
// ---------------------------------------------------------------------------

/**
 * Keep a DOM box sitting exactly on top of a text plane.
 *
 * Runs on an animation frame and writes to `style` directly. Doing this in
 * React state would re-render the overlay on every frame of playback and every
 * frame of an orbit — for a box that is only chrome.
 *
 * Returns the screen-pixels-per-composition-pixel ratio, which the editing
 * field needs to size its own type to match.
 */
function useProjectedBox(
  ref: React.RefObject<HTMLDivElement | null>,
  layer: Layer,
  metrics: { pixelWidth: number; pixelHeight: number },
  frame: { width: number; height: number },
): number {
  const scaleRef = React.useRef(1);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    let raf = 0;

    function update() {
      raf = requestAnimationFrame(update);

      const element = ref.current;
      const handle = sceneRegistry.get();
      if (!element || !handle || frame.width <= 0) return;

      const transform = currentTransform(layer);

      const points = projectQuad(
        handle.camera,
        { x: transform.x, y: transform.y, z: transform.z },
        { width: pxToWorld(metrics.pixelWidth), height: pxToWorld(metrics.pixelHeight) },
        {
          x: degToRad(transform.rotationX),
          y: degToRad(transform.rotationY),
          z: degToRad(transform.rotationZ),
        },
        { x: transform.scaleX, y: transform.scaleY },
        frame,
      );

      const bounds = quadBounds(points);

      // The box is placed un-rotated and then rotated by the same angle, so
      // its width and height stay the text's own rather than the larger
      // axis-aligned box a rotated quad would need.
      const width = distance(points[0], points[1]);
      const height = distance(points[1], points[2]);
      const centreX = bounds.left + bounds.width / 2;
      const centreY = bounds.top + bounds.height / 2;

      element.style.left = `${centreX - width / 2}px`;
      element.style.top = `${centreY - height / 2}px`;
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      element.style.transform = `rotate(${-transform.rotationZ}deg)`;

      const next = metrics.pixelHeight > 0 ? height / metrics.pixelHeight : 1;
      if (Math.abs(next - scaleRef.current) > 0.002) {
        scaleRef.current = next;
        setScale(next);
      }
    }

    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [ref, layer, metrics, frame]);

  return scale;
}

function currentTransform(layer: Layer) {
  return evaluateTransform(layer, useEditorStore.getState().currentTime);
}

function distance(a: ScreenPoint, b: ScreenPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function showGuides(container: HTMLDivElement | null, axes: Array<"x" | "y">): void {
  if (!container) return;
  container.hidden = axes.length === 0;
  for (const axis of ["x", "y"] as const) {
    const line = container.querySelector<HTMLElement>(`[data-guide="${axis}"]`);
    if (line) line.hidden = !axes.includes(axis);
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
