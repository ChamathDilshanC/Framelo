import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import type { DeviceDefinition } from "@/types/device";

/**
 * Development utility for adding a device.
 *
 * Every GLB names its parts differently, and the one thing a device definition
 * cannot guess is which mesh is the display. This prints the scene graph so
 * `screenMeshNames` / `screenMaterialNames` can be filled in by reading, rather
 * than by trial and error.
 *
 * Not referenced by the editor — it is reachable from the debug bridge in
 * development only (`__framelo.inspectDevice("iphone-17-pro")`).
 */

export interface MeshReport {
  mesh: string;
  /** Name of the node the mesh hangs off, which is often what GLTFLoader names. */
  parent: string;
  materials: string[];
  /** Bounding-box size in the model's own units — the display is the big flat one. */
  size: [number, number, number];
  uvSets: number;
  /** Actual UV range of the mesh, which is what a screen UV correction has to remap. */
  uvRange: { u: [number, number]; v: [number, number] } | null;
  triangles: number;
}

export interface ModelReport {
  deviceId: string;
  path: string;
  meshes: MeshReport[];
  materials: string[];
}

export async function inspectDeviceModel(device: DeviceDefinition): Promise<ModelReport> {
  if (!device.model) throw new Error(`${device.name} has no 3D model configured`);

  const gltf = await new GLTFLoader().loadAsync(device.model.path);
  const meshes: MeshReport[] = [];
  const materials = new Set<string>();

  gltf.scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;

    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) if (material) materials.add(material.name);

    mesh.geometry.computeBoundingBox();
    const size = mesh.geometry.boundingBox?.getSize(new THREE.Vector3()) ?? new THREE.Vector3();
    const index = mesh.geometry.getIndex();
    const position = mesh.geometry.getAttribute("position");

    meshes.push({
      mesh: mesh.name,
      parent: mesh.parent?.name ?? "",
      materials: list.filter(Boolean).map((material) => material.name),
      size: [round(size.x), round(size.y), round(size.z)],
      uvSets: ["uv", "uv1", "uv2"].filter((name) => mesh.geometry.hasAttribute(name)).length,
      uvRange: readUvRange(mesh.geometry),
      triangles: Math.floor((index ? index.count : position.count) / 3),
    });
  });

  // Biggest first: the display is usually the largest flat panel in the model.
  meshes.sort((a, b) => b.size[0] * b.size[1] - a.size[0] * a.size[1]);

  return {
    deviceId: device.id,
    path: device.model.path,
    meshes,
    materials: [...materials],
  };
}

function readUvRange(geometry: THREE.BufferGeometry): MeshReport["uvRange"] {
  const uv = geometry.getAttribute("uv");
  if (!uv) return null;

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;

  for (let i = 0; i < uv.count; i += 1) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }

  return { u: [round(minU, 4), round(maxU, 4)], v: [round(minV, 4), round(maxV, 4)] };
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Prints the report as a table, which is how it is actually read. */
export async function logDeviceModel(device: DeviceDefinition): Promise<ModelReport> {
  const report = await inspectDeviceModel(device);
  console.group(`${device.name} — ${report.path}`);
  console.log("materials:", report.materials.join(", "));
  console.table(
    report.meshes.map((entry) => ({
      mesh: entry.mesh,
      parent: entry.parent,
      materials: entry.materials.join(", "),
      size: entry.size.join(" × "),
      uv: entry.uvRange ? `u ${entry.uvRange.u.join("..")} / v ${entry.uvRange.v.join("..")}` : "—",
      tris: entry.triangles,
    })),
  );
  console.groupEnd();
  return report;
}
