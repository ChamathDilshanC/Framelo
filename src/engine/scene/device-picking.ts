import * as THREE from "three";
import { sceneRegistry } from "@/engine/scene/capture";
import type { Layer } from "@/types/layer";

/** Raycast through the real transformed models, returning the front visible phone. */
export function pickDeviceAt(clientX: number, clientY: number, canvas: HTMLCanvasElement, layers: Layer[]): string | null {
  const handle = sceneRegistry.get();
  if (!handle) return null;
  const rect = canvas.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, handle.camera);
  const ids = new Set(layers.filter((layer) => layer.type === "device" && layer.visible).map((layer) => layer.id));
  for (const hit of raycaster.intersectObjects(handle.scene.children, true)) {
    let object: THREE.Object3D | null = hit.object;
    while (object) {
      if (ids.has(object.name)) return object.name;
      object = object.parent;
    }
  }
  return null;
}
