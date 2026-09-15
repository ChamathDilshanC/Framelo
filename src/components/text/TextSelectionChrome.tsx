"use client";

import * as React from "react";

import { evaluateTransform } from "@/engine/animation/evaluate";
import { sceneRegistry } from "@/engine/scene/capture";
import { pxToWorld } from "@/engine/text/text-types";
import { projectQuad, type ScreenPoint } from "@/engine/text/text-viewport";
import { degToRad } from "@/lib/utils";
import { useEditorStore } from "@/store/editor-store";
import type { Layer } from "@/types/layer";

/**
 * The outline and handles of a selected text layer.
 *
 * Drawn as an SVG polygon through the four projected corners rather than as a
 * CSS box, because a text layer can be rotated in three dimensions. Under
 * perspective its outline is a general quadrilateral — the near edge longer
 * than the far one — and no combination of `width`, `height` and `rotate` can
 * describe that. A CSS box could only ever show the axis-aligned bounds, which
 * on a layer pitched 50° becomes a band across the whole viewport and makes a
 * perfectly good rotation look broken.
 *
 * The polygon is also the hit target, so clicking the text means clicking the
 * text, at any angle.
 *
 * Corners are recomputed on an animation frame and written straight to the DOM.
 * Nothing here re-renders React, so the camera can be orbited while text is
 * selected and the outline tracks it exactly.
 */

export interface QuadHandles {
  /** Corner order: top-left, top-right, bottom-right, bottom-left. */
  corners: ScreenPoint[];
  /** Midpoints of the left and right edges. */
  left: ScreenPoint;
  right: ScreenPoint;
  /** Above the top edge, along its outward normal. */
  rotate: ScreenPoint;
  centre: ScreenPoint;
}

const ROTATE_OFFSET_PX = 28;

export function quadHandles(corners: ScreenPoint[]): QuadHandles {
  const [tl, tr, br, bl] = corners;
  const mid = (a: ScreenPoint, b: ScreenPoint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  const top = mid(tl, tr);
  const bottom = mid(bl, br);

  // Outward normal of the top edge, found by pointing away from the far edge
  // so the handle stays above the text however the layer is turned.
  const away = { x: top.x - bottom.x, y: top.y - bottom.y };
  const length = Math.hypot(away.x, away.y) || 1;

  return {
    corners,
    left: mid(tl, bl),
    right: mid(tr, br),
    rotate: {
      x: top.x + (away.x / length) * ROTATE_OFFSET_PX,
      y: top.y + (away.y / length) * ROTATE_OFFSET_PX,
    },
    centre: mid(top, bottom),
  };
}

/** The projected corners of a layer's text plane, right now. */
export function cornersFor(
  layer: Layer,
  metrics: { pixelWidth: number; pixelHeight: number },
  frame: { width: number; height: number },
): ScreenPoint[] | null {
  const handle = sceneRegistry.get();
  if (!handle || frame.width <= 0) return null;

  const transform = evaluateTransform(layer, useEditorStore.getState().currentTime);

  return projectQuad(
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
}

/**
 * Keep an element's corners in sync with the layer, every frame.
 *
 * `onUpdate` receives the projected handles and is expected to write to the
 * DOM directly.
 */
export function useQuadTracking(
  layer: Layer,
  metrics: { pixelWidth: number; pixelHeight: number },
  frame: { width: number; height: number },
  onUpdate: (handles: QuadHandles) => void,
): void {
  const callback = React.useRef(onUpdate);
  React.useEffect(() => {
    callback.current = onUpdate;
  });

  React.useEffect(() => {
    let raf = 0;

    function tick() {
      raf = requestAnimationFrame(tick);
      const corners = cornersFor(layer, metrics, frame);
      if (corners) callback.current(quadHandles(corners));
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [layer, metrics, frame]);
}

export function pointsAttribute(corners: ScreenPoint[]): string {
  return corners.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
}
