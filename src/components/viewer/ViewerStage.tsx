"use client";

import { Canvas } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";

import { BackgroundRenderer } from "@/components/canvas/BackgroundRenderer";
import { DEVICE_TONE_MAPPING_EXPOSURE, DeviceLighting } from "@/components/devices/DeviceLighting";
import { ViewerDevice } from "@/components/viewer/ViewerDevice";
import type { Project } from "@/types/project";

interface ViewerStageProps {
  project: Project;
  /** Object URL for the screen image, resolved by the caller. */
  screenUrl: string | null;
  playing: boolean;
  onReady: () => void;
}

/**
 * The 3D stage of the public viewer.
 *
 * Deliberately not the editor's `Scene`: this imports no store, no timeline, no
 * keyframe UI and no orbit controls. It is code-split behind a dynamic import
 * so a visitor who only ever sees the poster frame never downloads it.
 *
 * Playback runs off a local clock inside the render loop. Nothing here reaches
 * the network once the project JSON has arrived — a shared link plays at full
 * frame rate on a flaky connection.
 */
export function ViewerStage({ project, screenUrl, playing, onReady }: ViewerStageProps) {
  const aspect = project.canvas.width / project.canvas.height;

  return (
    <div className="relative h-full w-full" style={{ aspectRatio: aspect }}>
      <BackgroundRenderer background={project.background} className="absolute inset-0" />

      <Canvas
        className="!absolute inset-0"
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
        camera={{ position: [0, 0.1, 7.6], fov: 32, near: 0.1, far: 100 }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMappingExposure = DEVICE_TONE_MAPPING_EXPOSURE;
        }}
      >
        <React.Suspense fallback={null}>
          <DeviceLighting />
          <ViewerDevice
            project={project}
            screenUrl={screenUrl}
            playing={playing}
            onReady={onReady}
          />
        </React.Suspense>
      </Canvas>
    </div>
  );
}
