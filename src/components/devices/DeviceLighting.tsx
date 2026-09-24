"use client";

import { useThree } from "@react-three/fiber";
import * as React from "react";
import { installStudioEnvironment, setStudioEnvironmentIntensity } from "@/engine/scene/studio-environment";

/**
 * The studio light rig.
 *
 * A product render is mostly its environment: titanium rails, camera glass and
 * anodised edges get their shape from what they reflect, not from direct light.
 * So the base is an image-based environment, and the discrete lights only shape
 * it — a key to set the form, a fill to keep the shadow side readable, and a
 * rim to separate the device from the background.
 *
 * Lives in one component rather than spread through the canvas so a scene's
 * lighting can be reasoned about, and reused, as a single thing.
 *
 * **The rig has an exposure budget.** Every light here adds to the same
 * irradiance, and once the total pushes a mid-tone past 1.0 the tone mapper
 * clips it to white — at which point the body colour a user picked stops
 * being visible at all. An earlier, much hotter rig did exactly that: it was
 * tuned against near-black imported materials, where more light only ever
 * helped, so nothing revealed the ceiling until finishes began landing real
 * colours. Treat the totals below as a budget, not as independent dials.
 *
 * The values were set by sweeping the whole rig against a measured render and
 * picking the point where a dark finish reads dark while a natural one still
 * reads like brushed metal. Brightness is deliberately spent here rather than
 * on `toneMappingExposure`, because exposure would dim the device *and* the
 * screen content the user uploaded; lights leave the screen alone.
 */

interface DeviceLightingProps {
  /** Overall strength of the environment — the main driver of PBR brightness. */
  intensity?: number;
  /** Adds a surround of dim lights so the body is never black at any angle. */
  surround?: boolean;
}

/**
 * Tone-mapping exposure for any surface showing a device.
 *
 * Shared rather than set per canvas: the editor and the public viewer must
 * agree, or a published project does not look like what its author designed.
 * It pairs with the rig below — changing one without the other moves every
 * device's brightness.
 */
export const DEVICE_TONE_MAPPING_EXPOSURE = 1;

export const DeviceLighting = React.memo(function DeviceLighting({
  intensity = 0.58,
  surround = true,
}: DeviceLightingProps) {
  return (
    <>
      <StudioEnvironment intensity={intensity} />

      {/* Key: high and slightly camera-left, the angle a product shot is lit from. */}
      <directionalLight position={[4.5, 6, 6]} intensity={0.52} color="#ffffff" />

      {/* Fill: cool, opposite the key, so the shadow side keeps its colour. */}
      <directionalLight position={[-6, 1.5, 4]} intensity={0.2} color="#c9d4ff" />

      {/* Rim: behind and above, drawing a bright edge along the rail. */}
      <directionalLight position={[-2.5, 4, -6]} intensity={0.3} color="#e8ecff" />

      {/* Sky/ground ambient so nothing bottoms out to pure black. */}
      <hemisphereLight args={["#ffffff", "#cdd3e8", 0.13]} />
      <ambientLight intensity={0.05} />

      {surround ? <SurroundLights /> : null}
    </>
  );
});

/**
 * A soft box-room environment.
 *
 * `RoomEnvironment` is generated on the GPU once and pre-filtered into a
 * mipmapped cube map, so it gives real roughness-aware reflections at a
 * fraction of the cost of an HDRI download — and with no binary asset.
 */
function StudioEnvironment({ intensity }: { intensity: number }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  // Effects give Strict Mode and viewport recovery a matched create/dispose
  // cycle. useMemo would leak targets from discarded renders.
  React.useLayoutEffect(() => installStudioEnvironment(gl, scene), [gl, scene]);
  React.useLayoutEffect(() => setStudioEnvironmentIntensity(scene, intensity), [scene, intensity]);

  return null;
}

/**
 * Ten dim directional lights on the cardinal and diagonal axes.
 *
 * The device is animated: it can face any direction at any frame, and a
 * three-point rig alone leaves whole sides unlit when it turns away. These sit
 * low enough not to flatten the key light, but keep every face readable.
 *
 * Ten of them, so their intensity is multiplied by ten in the rig's exposure
 * budget — the single easiest value here to raise without noticing.
 */
const SURROUND_DIRECTIONS: Array<[number, number, number]> = [
  [0, 0, 1],
  [0, 0, -1],
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [1, 1, 1],
  [-1, 1, 1],
  [1, 1, -1],
  [-1, 1, -1],
];

function SurroundLights() {
  return (
    <group name="framelo-surround-lights">
      {SURROUND_DIRECTIONS.map(([x, y, z]) => (
        <directionalLight
          key={`${x}:${y}:${z}`}
          position={[x * 6, y * 6, z * 6]}
          intensity={0.06}
          color="#ffffff"
        />
      ))}
    </group>
  );
}
