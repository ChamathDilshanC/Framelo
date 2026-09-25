"use client";

import * as React from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useScreenTexture } from "./use-screen-texture";
import { evaluateTransform } from "@/engine/animation/evaluate";
import type { Layer } from "@/types/layer";

/** Transparent image planes share the scene, keyframes, persistence and export. */
export function ImageLayerObject({ layer, getTime, renderOrder = 0, mediaUrl }: {
  layer: Layer; getTime: () => number; renderOrder?: number; mediaUrl?: string | null;
}) {
  const source = layer.metadata?.imageSrc;
  // Bundled paths are portable; uploaded images are resolved through the asset store.
  const url = mediaUrl ?? (typeof source === "string" && /^\/templates\/[a-z0-9/_-]+\.(?:svg|png|webp)$/.test(source) ? source : null);
  const { texture } = useScreenTexture(url, { flipY: true });
  const mesh = React.useRef<THREE.Mesh>(null);
  const material = React.useRef<THREE.MeshBasicMaterial>(null);
  const width = Number(layer.metadata?.imageWidth) || 1;
  const height = Number(layer.metadata?.imageHeight) || 1;
  useFrame(() => {
    if (!mesh.current || !material.current) return;
    const t = evaluateTransform(layer, getTime());
    mesh.current.position.set(t.x, t.y, t.z);
    mesh.current.rotation.set(...[t.rotationX, t.rotationY, t.rotationZ].map(THREE.MathUtils.degToRad) as [number, number, number]);
    mesh.current.scale.set(t.scaleX, t.scaleY, t.scaleZ);
    mesh.current.visible = layer.visible && t.opacity > 0.001;
    material.current.opacity = t.opacity;
  });
  if (!texture) return null;
  return <mesh ref={mesh} name={`framelo-image-${layer.id}`} renderOrder={renderOrder}>
    <planeGeometry args={[width, height]} />
    <meshBasicMaterial ref={material} map={texture} transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
  </mesh>;
}
