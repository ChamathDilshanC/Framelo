"use client";

import { Canvas } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";
import { DeviceRenderer } from "@/components/devices/DeviceRenderer";
import { DeviceLighting, DEVICE_TONE_MAPPING_EXPOSURE } from "@/components/devices/DeviceLighting";
import { ImageLayerObject } from "@/components/canvas/ImageLayerObject";
import { TextLayerObject } from "@/components/text/TextLayerObject";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { resolveBackgroundStyle } from "@/engine/background/resolve";
import { buildTemplateLayers } from "@/engine/templates/template-builder";
import type { ProjectTemplate } from "@/engine/templates/project-templates";
import { templateScreenUrl } from "@/engine/templates/screen-artwork";

function canCreateWebGL(): boolean {
  if (typeof document === "undefined") return true;
  const canvas = document.createElement("canvas");
  return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
}

function StaticTemplatePreview({ template }: { template: ProjectTemplate }) {
  const artwork = template.deviceLayers?.[0]?.screenArtwork;
  const artworkUrl = templateScreenUrl(artwork);
  const headline = template.textLayers?.find((layer) => layer.style.fontSize && layer.style.fontSize > 20)?.content
    ?? template.name;

  return (
    <div
      className="relative flex aspect-[1080/1350] min-h-0 w-full items-end overflow-hidden bg-[#111116] p-5"
      style={{
        backgroundImage: artworkUrl
          ? `linear-gradient(180deg, rgb(8 8 10 / 0.1), rgb(8 8 10 / 0.88)), url("${artworkUrl}")`
          : undefined,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
      role="img"
      aria-label={`${template.name} preview`}
    >
      <div className="relative z-10 max-w-[85%]">
        <p className="text-[9px] tracking-[0.18em] text-white/65 uppercase">
          {template.category.replace("-", " ")} · static preview
        </p>
        <p className="mt-2 whitespace-pre-line text-[clamp(18px,3vw,34px)] font-semibold leading-[0.95] tracking-tight text-white">
          {headline}
        </p>
        <p className="mt-3 text-[10px] text-white/65">
          WebGL preview unavailable. The template remains fully editable in a WebGL-enabled browser.
        </p>
      </div>
    </div>
  );
}

/** The actual model, screen assets, typography and camera used in the editor. */
export function TemplatePreview({ template }: { template: ProjectTemplate }) {
  const webglAvailable = React.useSyncExternalStore(
    () => () => undefined,
    canCreateWebGL,
    () => true,
  );
  const layers = React.useMemo(() => buildTemplateLayers(template, null).layers, [template]);
  const started = React.useRef<number | null>(null);
  const getTime = React.useCallback(() => started.current === null
    ? template.posterTime ?? 3
    : Math.min(template.canvas.duration, (performance.now() - started.current) / 1000), [template]);
  const { style } = resolveBackgroundStyle(template.background);
  if (!webglAvailable) return <StaticTemplatePreview template={template} />;

  return (
    <div className="relative w-full overflow-hidden" style={{ ...style, aspectRatio: `${template.canvas.width} / ${template.canvas.height}` }}
      role="img" aria-label={`${template.name} — live composition preview`}
      onPointerEnter={() => { if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) started.current = performance.now(); }}
      onPointerLeave={() => { started.current = null; }}>
      <ErrorBoundary fallback={<p className="p-5 text-xs text-white/60">3D preview unavailable</p>}>
        <Canvas className="!absolute inset-0" dpr={[1, 1.5]}
          camera={{ position: [0, 0.1, 7.6], fov: 32, near: 0.1, far: 100 }}
          gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
          onCreated={({ gl, camera }) => { gl.setClearColor(0, 0); gl.toneMappingExposure = DEVICE_TONE_MAPPING_EXPOSURE; camera.lookAt(0, 0, 0); }}>
          <React.Suspense fallback={null}>
            <DeviceLighting />
            {layers.map((layer, index) => layer.type === "device"
              ? <DeviceRenderer key={layer.id} layer={layer} mediaUrl={null} getTime={getTime} />
              : layer.type === "image" ? <ImageLayerObject key={layer.id} layer={layer} getTime={getTime} renderOrder={index + 1} />
              : <TextLayerObject key={layer.id} layer={layer} getTime={getTime} renderOrder={index + 1} />)}
          </React.Suspense>
        </Canvas>
      </ErrorBoundary>
    </div>
  );
}
