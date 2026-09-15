"use client";

import { useFrame } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";

import { evaluateTextProperties, evaluateTransform, evaluateTransformWith } from "@/engine/animation/evaluate";
import { presetPreview } from "@/engine/motion/preset-preview";
import { loadFontsFor, fontsReadyFor } from "@/engine/text/text-fonts";
import { rasterizeText, releaseText, type RasterizedText } from "@/engine/text/text-renderer";
import { visibleContent } from "@/engine/text/text-layout";
import {
  resolveTextMetadata,
  TEXT_PLACEHOLDER,
  type TextLayerMetadata,
} from "@/engine/text/text-types";
import { degToRad } from "@/lib/utils";
import type { Layer } from "@/types/layer";

export interface TextLayerObjectProps {
  layer: Layer;
  /**
   * Time source, as a getter rather than a value.
   *
   * A prop would re-render this component on every frame of playback. A getter
   * is read inside `useFrame`, so the editor can supply its playhead and the
   * viewer its own clock without either re-rendering React to animate.
   */
  getTime: () => number;
  /** Hidden while its HTML editing overlay is open, so they never double up. */
  editing?: boolean;
  /** Drawn in list order when layers sit at the same depth. */
  renderOrder?: number;
  /** Lets the editor reuse the preview system without the viewer importing it. */
  usePreview?: boolean;
}

/**
 * One text layer, as an object in the 3D scene.
 *
 * The words are rasterised to a texture (see `text-renderer`) and mapped onto a
 * plane. Being a real scene object is what makes text export, share and sit at
 * a real depth against the device without a second code path.
 *
 * Memoised, because every project commit produces a new layers array: without
 * it, moving one text layer would re-render all fifty. Layer objects keep their
 * identity when they are not the one that changed, so the comparison is exact.
 *
 * The split that matters is between what changes the *texture* and what changes
 * the *matrix*. Content, typeface and colour redraw the texture and go through
 * React. Position, rotation, scale, opacity and reveal progress are read every
 * frame inside `useFrame` and never re-render React at all — so an animating
 * text layer costs a matrix update per frame, not a React tree.
 */
export const TextLayerObject = React.memo(function TextLayerObject({
  layer,
  getTime,
  editing = false,
  renderOrder = 0,
  usePreview = false,
}: TextLayerObjectProps) {
  const groupRef = React.useRef<THREE.Group>(null);
  const meshRef = React.useRef<THREE.Mesh>(null);
  const materialRef = React.useRef<THREE.MeshBasicMaterial>(null);
  /** Last colour written to the material, so it is only set when it moves. */
  const tintRef = React.useRef<string | null>(null);

  const style = React.useMemo(() => resolveTextMetadata(layer.metadata), [layer.metadata]);

  // Re-rasterise once the needed faces arrive. Without this the first draw of
  // a newly chosen typeface silently bakes the fallback into the texture (§15).
  const [fontEpoch, setFontEpoch] = React.useState(0);

  React.useEffect(() => {
    const text = style.content || TEXT_PLACEHOLDER;
    if (fontsReadyFor(style.fontId, text, style.fontWeight, style.fontStyle === "italic")) return;

    let cancelled = false;
    void loadFontsFor(style.fontId, text, style.fontWeight, style.fontStyle === "italic").then(() => {
      if (!cancelled) setFontEpoch((value) => value + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [style.fontId, style.content, style.fontWeight, style.fontStyle]);

  /**
   * The reveal frames this layer can show.
   *
   * A reveal animation walks through a bounded set of strings, so they are
   * rasterised once up front and then swapped per frame. Rasterising inside
   * `useFrame` instead would redraw text on a canvas 60 times a second.
   */
  const frameSet = useTextFrames(layer, style, fontEpoch);

  useFrame(() => {
    const group = groupRef.current;
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!group || !mesh || !material) return;

    const time = resolveTime(layer, getTime, usePreview);
    const preview = usePreview ? presetPreview.tracksFor(layer.id) : null;
    const tracks = preview ?? layer.animations;

    const transform = preview
      ? evaluateTransformWith(layer.transform, preview, time)
      : evaluateTransform(layer, time);

    group.position.set(transform.x, transform.y, transform.z);
    group.rotation.set(
      degToRad(transform.rotationX),
      degToRad(transform.rotationY),
      degToRad(transform.rotationZ),
    );

    const animated = evaluateTextProperties(tracks, time);

    // Font size animates by scaling the plane rather than redrawing the text.
    // A redraw per frame would rasterise a canvas 60 times a second; scaling
    // is a matrix write, and the supersampled texture holds up to it (§54).
    const sizeScale = animated.fontSize !== undefined ? animated.fontSize / style.fontSize : 1;

    group.scale.set(
      transform.scaleX * sizeScale,
      transform.scaleY * sizeScale,
      transform.scaleZ,
    );

    material.opacity = transform.opacity;
    // A fully transparent plane still costs a draw call and still writes depth
    // in some configurations; skipping it outright is cheaper and safer.
    group.visible = layer.visible && !editing && transform.opacity > 0.001;

    const frame = pickFrame(frameSet, time);
    if (frame && material.map !== frame.texture) {
      material.map = frame.texture;
      material.needsUpdate = true;
      mesh.scale.set(frame.worldWidth, frame.worldHeight, 1);
    }

    // A tintable layer is drawn white and coloured here, so changing the
    // colour costs one material write instead of redrawing the glyphs.
    const wanted = frame?.tinted ? style.fill.color : "#ffffff";
    if (tintRef.current !== wanted) {
      material.color.set(wanted);
      tintRef.current = wanted;
    }
  });

  const first = frameSet.frames[0];
  if (!first) return null;

  return (
    <group ref={groupRef} name={`framelo-text-${layer.id}`}>
      <mesh ref={meshRef} renderOrder={renderOrder} scale={[first.worldWidth, first.worldHeight, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={materialRef}
          color={first.tinted ? style.fill.color : "#ffffff"}
          map={first.texture}
          transparent
          // Text is a designed colour, not a lit surface: tone mapping would
          // push pure white to grey and shift every brand colour.
          toneMapped={false}
          // Never writes depth. Anti-aliased glyph edges are partly
          // transparent, and a depth write there punches holes in whatever is
          // behind them — visible as a halo around every letter.
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
});

/**
 * How many textures a rasterised animation is sampled into.
 *
 * Bounded on purpose. A typewriter over 200 characters must not become 200
 * textures, and a blur ramp must not redraw a canvas every frame (§54).
 */
const RASTER_FRAMES = 48;

/** Properties that change the picture rather than the matrix. */
const RASTER_PROPERTIES = ["reveal", "blur"] as const;

interface FrameSet {
  frames: RasterizedText[];
  /** Times the frames were sampled at, so playback can find its own frame. */
  from: number;
  to: number;
}

/**
 * Rasterise every picture this layer can show.
 *
 * Reveal and blur cannot be applied to an existing texture — they change what
 * has to be drawn — so they are pre-rendered across the span they animate over
 * and then swapped per frame. Sampling by *time* rather than by value means one
 * pass covers both properties at once, and any rasterised property added later
 * comes along without new machinery.
 */
function useTextFrames(layer: Layer, style: TextLayerMetadata, fontEpoch: number): FrameSet {
  const content = style.content || TEXT_PLACEHOLDER;

  const span = React.useMemo(() => rasterSpan(layer), [layer]);

  const frames = React.useMemo(() => {
    if (!span) {
      const single = rasterizeText(style, visibleContent(style, content, undefined));
      return single ? [single] : [];
    }

    // De-duplicated by what is actually drawn: a word reveal over eight words
    // produces eight distinct pictures however finely the curve is sampled.
    const byKey = new Map<string, RasterizedText>();
    const result: RasterizedText[] = [];

    for (let step = 0; step < RASTER_FRAMES; step += 1) {
      const time = span.from + ((span.to - span.from) * step) / (RASTER_FRAMES - 1);
      const animated = evaluateTextProperties(layer.animations, time);

      const text = visibleContent(style, content, animated.reveal);
      // Quantised so near-identical blur levels share one texture rather than
      // generating 48 imperceptibly different ones.
      const blur = Math.round((animated.blur ?? 0) * 2) / 2;

      const key = `${text}\u0000${blur}`;
      const cached = byKey.get(key);
      if (cached) {
        result.push(cached);
        continue;
      }

      const frame = rasterizeText(style, text, blur);
      if (!frame) continue;
      byKey.set(key, frame);
      result.push(frame);
    }

    return result;
    // `fontEpoch` is the signal that a newly loaded face needs a redraw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, content, span, fontEpoch]);

  React.useEffect(() => {
    return () => {
      for (const frame of new Set(frames)) releaseText(frame);
    };
  }, [frames]);

  return { frames, from: span?.from ?? 0, to: span?.to ?? 0 };
}

/**
 * The window of time over which this layer's picture changes.
 *
 * Null when nothing rasterised is animated, which is the common case and the
 * one that costs a single texture.
 */
function rasterSpan(layer: Layer): { from: number; to: number } | null {
  let from = Infinity;
  let to = -Infinity;

  for (const track of layer.animations) {
    if (!(RASTER_PROPERTIES as readonly string[]).includes(track.property)) continue;
    for (const keyframe of track.keyframes) {
      from = Math.min(from, keyframe.time);
      to = Math.max(to, keyframe.time);
    }
  }

  if (!Number.isFinite(from) || to <= from) return null;
  return { from, to };
}

function pickFrame(set: FrameSet, time: number): RasterizedText | null {
  const { frames, from, to } = set;
  if (frames.length === 0) return null;
  if (frames.length === 1 || to <= from) return frames[0];

  const progress = Math.min(1, Math.max(0, (time - from) / (to - from)));
  return frames[Math.round(progress * (frames.length - 1))] ?? frames[frames.length - 1];
}


/**
 * The time to evaluate at.
 *
 * A preview runs on its own clock so it plays whether or not the timeline is
 * playing, without moving the playhead the user left in place.
 */
function resolveTime(layer: Layer, getTime: () => number, usePreview: boolean): number {
  if (usePreview && presetPreview.tracksFor(layer.id)) {
    return presetPreview.timeAt(performance.now());
  }
  return getTime();
}
