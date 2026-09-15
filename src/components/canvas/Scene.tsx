"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import * as React from "react";

import { DeviceLighting } from "@/components/devices/DeviceLighting";
import { DeviceRenderer, type DeviceLayerStatus } from "@/components/devices/DeviceRenderer";
import { ImageLayerObject } from "./ImageLayerObject";
import { TextLayerObject } from "@/components/text/TextLayerObject";
import { evaluateTransform, evaluateTransformWith } from "@/engine/animation/evaluate";
import { presetPreview } from "@/engine/motion/preset-preview";
import { getCameraView } from "@/engine/devices/device-presets";
import { sceneRegistry } from "@/engine/scene/capture";
import { getSoftShadowTexture } from "@/engine/scene/generated-textures";
import { getDevice } from "@/devices/registry";
import { useAssetStore } from "@/store/asset-store";
import { useEditorStore } from "@/store/editor-store";
import type { DeviceLayerMetadata, Layer } from "@/types/layer";

/** Name used to find the layer root when framing the camera. */
const LAYER_ROOT_NAME = "framelo-layers";

interface SceneProps {
  layers: Layer[];
  onScreenError?: (message: string | null) => void;
  onDeviceStatusChange?: (status: DeviceLayerStatus) => void;
  onDropTargetChange?: (layerId: string | null) => void;
  dropTargetId?: string | null;
}

/**
 * The 3D scene.
 *
 * It knows nothing about the background: that is a DOM layer behind the canvas,
 * so the canvas always clears to transparent and never re-renders when a colour
 * or pattern changes.
 */
export function Scene({ layers, onScreenError, onDeviceStatusChange, onDropTargetChange, dropTargetId }: SceneProps) {
  const deviceLayer = layers.find((layer) => layer.type === "device");
  const fov = getDevice(
    ((deviceLayer?.metadata ?? {}) as Partial<DeviceLayerMetadata>).deviceId ?? "",
  ).defaultCamera.fov;

  return (
    <>
      <SceneBridge />
      <CameraRig fov={fov} />
      <DeviceLighting />
      <LayerRenderer
        layers={layers}
        onScreenError={onScreenError}
        onDeviceStatusChange={onDeviceStatusChange}
        onDropTargetChange={onDropTargetChange}
        dropTargetId={dropTargetId}
      />
      <DeviceShadow layers={layers} />
    </>
  );
}

/** Publishes the renderer to the export service. */
function SceneBridge() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const setDpr = useThree((state) => state.setDpr);
  const viewportDpr = useThree((state) => state.viewport.dpr);

  React.useEffect(() => {
    sceneRegistry.register({
      gl,
      scene,
      camera,
      invalidate: () => {
        gl.setPixelRatio(viewportDpr);
        gl.setSize(size.width, size.height, false);
        if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
          const perspective = camera as THREE.PerspectiveCamera;
          perspective.aspect = size.width / size.height;
          perspective.updateProjectionMatrix();
        }
        setDpr(viewportDpr);
      },
    });
    return () => sceneRegistry.clear();
  }, [gl, scene, camera, size.width, size.height, setDpr, viewportDpr]);

  return null;
}

const FIT_MARGIN = 1.22;

/** Where the camera starts, and where "reset view" returns it to. */
const DEFAULT_VIEW = getCameraView("front");
const DEFAULT_POSITION: [number, number, number] = DEFAULT_VIEW.position ?? [0, 0.1, 7.6];

/**
 * The product-shot camera.
 *
 * Views are camera state only — they never write to a layer. The device's own
 * rotation is animated data owned by the timeline, so "turn the phone" and
 * "walk around the phone" stay separate things, and an exported frame always
 * matches what the keyframes say.
 */
function CameraRig({ fov }: { fov: number }) {
  const controlsRef = React.useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const view = useEditorStore((state) => state.cameraView);
  const setCameraView = useEditorStore((state) => state.setCameraView);
  const resetToken = useEditorStore((state) => state.cameraResetToken);
  const fitToken = useEditorStore((state) => state.cameraFitToken);
  const orbitEnabled = useEditorStore((state) => state.orbitEnabled);
  const scene = useThree((state) => state.scene);

  // Moving to a named view keeps the current distance where the user put it —
  // only the angle changes, which is what makes switching views feel like
  // turning a turntable rather than a jump cut.
  React.useEffect(() => {
    const controls = controlsRef.current;
    const preset = getCameraView(view);
    if (!controls || !preset.position) return;

    const camera = controls.object as THREE.PerspectiveCamera;
    const target = new THREE.Vector3(...preset.target);
    const distance = camera.position.distanceTo(controls.target);

    const direction = new THREE.Vector3(...preset.position).sub(target);
    const presetDistance = direction.length() || 1;
    direction.divideScalar(presetDistance);

    controls.target.copy(target);
    camera.position.copy(target).addScaledVector(direction, distance || presetDistance);
    controls.update();
  }, [view]);

  React.useEffect(() => {
    if (resetToken === 0) return;
    const controls = controlsRef.current;
    if (!controls) return;

    controls.object.position.set(...DEFAULT_POSITION);
    controls.target.set(...DEFAULT_VIEW.target);
    controls.update();
  }, [resetToken]);

  // Frame the visible layers: keep the current viewing direction, but dolly so
  // the whole device fits with a comfortable margin.
  React.useEffect(() => {
    if (fitToken === 0) return;
    const controls = controlsRef.current;
    const layerRoot = scene.getObjectByName(LAYER_ROOT_NAME);
    if (!controls || !layerRoot) return;

    const box = new THREE.Box3().setFromObject(layerRoot);
    if (box.isEmpty()) return;

    const sphere = box.getBoundingSphere(new THREE.Sphere());
    if (sphere.radius <= 0) return;

    const camera = controls.object as THREE.PerspectiveCamera;
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const distance = (sphere.radius / Math.sin(halfFov)) * FIT_MARGIN;

    const direction = camera.position.clone().sub(controls.target).normalize();
    if (direction.lengthSq() === 0) direction.set(0, 0, 1);

    controls.target.copy(sphere.center);
    camera.position.copy(sphere.center).add(direction.multiplyScalar(distance));
    controls.update();
  }, [fitToken, scene]);

  // Orbiting by hand leaves the named views behind; say so rather than keeping
  // a highlighted preset the camera no longer matches.
  const handleOrbitStart = React.useCallback(() => {
    setCameraView("custom");
  }, [setCameraView]);

  return (
    <>
      <PerspectiveCamera
        makeDefault
        position={DEFAULT_POSITION}
        fov={fov}
        near={0.1}
        far={100}
      />
      <OrbitControls
        ref={controlsRef}
        enabled={orbitEnabled}
        enablePan
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        panSpeed={0.6}
        zoomSpeed={0.7}
        minDistance={2.5}
        maxDistance={24}
        target={DEFAULT_VIEW.target}
        onStart={handleOrbitStart}
        makeDefault
      />
    </>
  );
}

/**
 * Soft drop shadow behind the device.
 *
 * A camera-facing sprite rather than a ground plane: the default framing is
 * close to eye level, where a horizontal shadow plane would be seen edge-on and
 * wash out the lower half of the frame.
 */
function DeviceShadow({ layers }: { layers: Layer[] }) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const materialRef = React.useRef<THREE.MeshBasicMaterial>(null);
  const texture = React.useMemo(() => getSoftShadowTexture(), []);

  const deviceLayer = layers.find((layer) => layer.type === "device" && layer.visible);

  const intensity =
    ((deviceLayer?.metadata ?? {}) as Partial<DeviceLayerMetadata>).shadowIntensity ?? 0.55;

  useFrame(() => {
    const mesh = meshRef.current;
    const material = materialRef.current;
    if (!mesh || !material || !deviceLayer) return;

    // The shadow follows a preview as well, or it detaches from the device
    // for the whole preview and reattaches when it ends.
    const preview = presetPreview.tracksFor(deviceLayer.id);
    const transform = preview
      ? evaluateTransformWith(
          deviceLayer.transform,
          preview,
          presetPreview.timeAt(performance.now()),
        )
      : evaluateTransform(deviceLayer, useEditorStore.getState().currentTime);

    // The shadow reads as contact, so it has to answer to height: a device
    // that lifts should cast a larger, fainter shadow and a settling one
    // should regain a tight, dark contact patch. Derived from the transform
    // that was already computed, so it costs nothing per frame.
    const lift = transform.y - deviceLayer.transform.y;
    const spread = clamp(1 + lift * 0.16, 0.8, 1.6);
    const fade = clamp(1 - lift * 0.2, 0.3, 1.15);

    // Stays on the ground plane rather than tracking the device up.
    mesh.position.set(transform.x, deviceLayer.transform.y - 1.15, transform.z - 0.75);
    mesh.scale.set(
      4.2 * Math.abs(transform.scaleX) * spread,
      2.6 * Math.abs(transform.scaleY) * spread,
      1,
    );
    material.opacity = intensity * transform.opacity * fade;
  });

  if (!deviceLayer || intensity <= 0 || !texture) return null;

  return (
    <mesh ref={meshRef} renderOrder={-1}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        depthWrite={false}
        color="#000000"
        toneMapped={false}
      />
    </mesh>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function LayerRenderer({
  layers,
  onScreenError,
  onDeviceStatusChange,
  onDropTargetChange,
  dropTargetId,
}: {
  layers: Layer[];
  onScreenError?: (message: string | null) => void;
  onDeviceStatusChange?: (status: DeviceLayerStatus) => void;
  onDropTargetChange?: (layerId: string | null) => void;
  dropTargetId?: string | null;
}) {
  const assets = useAssetStore((state) => state.assets);
  const editingLayerId = useEditorStore((state) => state.editingLayerId);

  return (
    <group name={LAYER_ROOT_NAME}>
      {layers.map((layer, index) => {
        if (layer.type === "text") {
          return (
            <TextLayerObject
              key={layer.id}
              layer={layer}
              getTime={getEditorTime}
              editing={editingLayerId === layer.id}
              // Later layers draw in front of earlier ones at equal depth, so
              // the layer list's order is the order on screen (§26, §62).
              renderOrder={index + 1}
              usePreview
            />
          );
        }

        if (layer.type === "image") return <ImageLayerObject key={layer.id} layer={layer} getTime={getEditorTime} renderOrder={index + 1} mediaUrl={assets.find((asset) => asset.id === layer.metadata?.imageAssetId)?.url} />;
        if (layer.type !== "device") return null;
        const metadata = (layer.metadata ?? {}) as Partial<DeviceLayerMetadata>;
        const asset = assets.find((entry) => entry.id === metadata.screenAssetId);

        return (
          <DeviceRenderer
            key={layer.id}
            layer={layer}
            mediaUrl={asset?.url ?? null}
            mediaType={asset?.type ?? "image"}
            onDropTargetChange={onDropTargetChange}
            dropTargetId={dropTargetId}
            onScreenError={onScreenError}
            onDeviceStatusChange={onDeviceStatusChange}
          />
        );
      })}
    </group>
  );
}

/**
 * The playhead, read at call time.
 *
 * Passing `currentTime` as a prop would re-render every text layer on every
 * frame of playback. Reading it from the store inside the render loop keeps
 * playback out of React entirely.
 */
function getEditorTime(): number {
  return useEditorStore.getState().currentTime;
}
