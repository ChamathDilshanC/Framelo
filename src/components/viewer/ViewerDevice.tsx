"use client";

import { useFrame } from "@react-three/fiber";
import * as React from "react";
import { DeviceRenderer } from "@/components/devices/DeviceRenderer";
import { ImageLayerObject } from "@/components/canvas/ImageLayerObject";
import { TextLayerObject } from "@/components/text/TextLayerObject";
import type { Project } from "@/types/project";

interface ViewerDeviceProps {
  project: Project;
  screenUrl: string | null;
  playing: boolean;
  onReady: () => void;
}

/** All layers share one playback clock and the editor's model/opacity renderer. */
export function ViewerDevice({ project, screenUrl, playing, onReady }: ViewerDeviceProps) {
  const time = React.useRef(0);
  const getTime = React.useCallback(() => time.current, []);
  const devices = project.layers.filter((layer) => layer.type === "device" && layer.visible);
  const ready = React.useRef(new Set<string>());
  React.useEffect(() => {
    if (devices.length === 0) onReady();
  }, [devices.length, onReady]);
  useFrame((_, delta) => {
    if (playing) time.current = (time.current + delta) % project.canvas.duration;
  });
  return <>{project.layers.map((layer, index) => layer.type === "device"
    ? <DeviceRenderer key={layer.id} layer={layer} getTime={getTime}
        mediaUrl={layer.id === devices[0]?.id ? screenUrl : null}
        onDeviceStatusChange={(status) => {
          if (status.model === "ready" || status.usingFallback) ready.current.add(layer.id);
          if (devices.every((device) => ready.current.has(device.id))) onReady();
        }} />
    : layer.type === "image" ? <ImageLayerObject key={layer.id} layer={layer} getTime={getTime} renderOrder={index + 1} />
    : layer.type === "text"
      ? <TextLayerObject key={layer.id} layer={layer} getTime={getTime} renderOrder={index + 1} />
      : null)}</>;
}
