import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { getFinish } from "@/engine/devices/device-definitions";
import { DeviceMaterialController } from "@/engine/devices/material-controller";
import { createScreenMaterial, type ScreenSurface } from "@/engine/devices/screen-material";
import {
  DEFAULT_DEVICE_APPEARANCE,
  type DeviceAppearance,
  type DeviceDefinition,
  type DeviceModelConfig,
  type MaterialTweak,
} from "@/types/device";

/**
 * Loading, caching and preparation of the photorealistic device GLBs.
 *
 * A model is downloaded and parsed **once** per URL, no matter how often the
 * device is selected, the timeline scrubs or the screen image changes. Each
 * consumer gets a clone of that cached scene: geometry and imported textures
 * stay shared (one GPU upload), while materials are cloned per instance so one
 * layer's finish or screen can never leak into another's.
 */

interface CachedModel {
  path: string;
  scene: THREE.Group;
  /** Number of live instances cloned from this entry. */
  instances: number;
  /** Monotonic stamp of the last instance created, for eviction order. */
  lastUsed: number;
}

const cache = new Map<string, Promise<CachedModel>>();
/** Entries that have finished loading, so eviction can be decided synchronously. */
const resolved = new Map<string, CachedModel>();
const pending = new Set<string>();

/**
 * How many parsed scenes nobody is rendering are kept.
 *
 * Zero would mean re-parsing tens of megabytes every time the user flicks
 * between two devices; unbounded would mean the whole library sits in memory
 * because it was once clicked. One keeps A-to-B-and-back instant while the
 * budget stays at two models.
 */
const UNUSED_MODEL_BUDGET = 1;

let useCounter = 0;

let loader: GLTFLoader | null = null;

function getLoader(): GLTFLoader {
  if (!loader) loader = new GLTFLoader();
  return loader;
}

export interface PreparedDeviceModel {
  /** Normalised and centred; add this straight to the layer group. */
  root: THREE.Group;
  screen: ScreenSurface;
  /** True when the GLB's display mesh was found and is driven by Framelo. */
  hasScreen: boolean;
  /** Applies a finish to this instance's own cloned materials. */
  setAppearance(appearance: DeviceAppearance | undefined): void;
  /**
   * Switch the model between solid and fading.
   *
   * Fading a solid object with plain alpha blending shows its insides — see
   * `buildDepthPrepass`. This turns the correction on and off.
   */
  setFading(fading: boolean): void;
  /** Releases this instance's cloned materials and the screen material. */
  dispose(): void;
}

export class DeviceModelError extends Error {
  constructor(
    message: string,
    readonly deviceId: string,
  ) {
    super(message);
    this.name = "DeviceModelError";
  }
}

/**
 * Load a device model and prepare an instance of it.
 *
 * Resolves with a ready-to-render group. Throws `DeviceModelError` when the GLB
 * cannot be fetched or parsed, which is the caller's cue to fall back to the
 * procedural device.
 */
export async function loadDeviceModel(device: DeviceDefinition): Promise<PreparedDeviceModel> {
  const model = device.model;
  if (!model) {
    throw new DeviceModelError(`${device.name} has no 3D model configured`, device.id);
  }

  const cached = await acquireScene(model, device);
  cached.instances += 1;
  cached.lastUsed = ++useCounter;

  try {
    return prepareInstance(cached, model, device);
  } catch (error) {
    cached.instances -= 1;
    throw error;
  }
}

function acquireScene(model: DeviceModelConfig, device: DeviceDefinition): Promise<CachedModel> {
  const existing = cache.get(model.path);
  if (existing) return existing;

  pending.add(model.path);

  const promise = new Promise<CachedModel>((resolve, reject) => {
    getLoader().load(
      model.path,
      (gltf) => {
        const entry: CachedModel = {
          path: model.path,
          scene: gltf.scene,
          instances: 0,
          lastUsed: ++useCounter,
        };
        resolved.set(model.path, entry);
        resolve(entry);
      },
      undefined,
      (error) => {
        // A failed load must not be cached, or a retry can never succeed.
        cache.delete(model.path);
        const detail = error instanceof Error ? error.message : "";
        reject(
          new DeviceModelError(
            detail
              ? `${device.name} could not be loaded: ${detail}`
              : `${device.name} could not be loaded`,
            device.id,
          ),
        );
      },
    );
  }).finally(() => {
    pending.delete(model.path);
  });

  cache.set(model.path, promise);
  return promise;
}

/**
 * Clone the cached scene into an independent instance.
 *
 * `clone(true)` shares geometry and textures — exactly what we want — but also
 * shares materials, so every material is cloned here before anything is tuned.
 */
function prepareInstance(
  cached: CachedModel,
  model: DeviceModelConfig,
  device: DeviceDefinition,
): PreparedDeviceModel {
  const inner = cached.scene.clone(true);

  const screen = createScreenMaterial(model);
  const clonedMaterials = new Map<string, THREE.Material>();
  const ownedMaterials: THREE.Material[] = [];
  // Only ever handed materials this instance cloned, so a finish here can never
  // reach the cached scene or another layer showing the same device.
  const materials = new DeviceMaterialController();

  const screenMeshNames = new Set(model.screenMeshNames);
  const screenMaterialNames = new Set(model.screenMaterialNames);
  let hasScreen = false;

  inner.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;

    const originals = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    const next = originals.map((original) => {
      if (!original) return original;

      // The display: match on mesh name first — a shared screen material would
      // otherwise take neighbouring parts with it — then on material name.
      const isScreen =
        screenMeshNames.has(mesh.name) ||
        screenMeshNames.has(mesh.parent?.name ?? "") ||
        screenMaterialNames.has(original.name);

      if (isScreen) {
        hasScreen = true;
        mesh.renderOrder = 2;
        return screen.material;
      }

      let clone = clonedMaterials.get(original.uuid);
      if (!clone) {
        clone = original.clone();
        clonedMaterials.set(original.uuid, clone);
        ownedMaterials.push(clone);

        const tweak = model.tweaks?.[original.name];
        if (tweak) applyTweak(clone, tweak);

        // Tweaked materials are final — a bezel deliberately flattened to black
        // must not be lifted back to reflective grey by the finish pass.
        if (!tweak?.keepFinish) {
          materials.register(clone, model.roles?.[original.name]);
        }
      }
      return clone;
    });

    mesh.material = Array.isArray(mesh.material) ? (next as THREE.Material[]) : next[0]!;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });

  normalizeModel(inner, model);

  const prepass = buildDepthPrepass(inner);

  const root = new THREE.Group();
  root.name = `framelo-device:${device.id}`;
  root.add(prepass.group);
  root.add(inner);

  let disposed = false;
  let fading = false;

  return {
    root,
    screen,
    hasScreen,
    setAppearance(appearance) {
      const resolved = appearance ?? DEFAULT_DEVICE_APPEARANCE;
      materials.apply(getFinish(resolved.finish), resolved);
    },
    setFading(next) {
      if (next === fading) return;
      fading = next;
      prepass.setActive(next);
    },
    dispose() {
      if (disposed) return;
      disposed = true;

      // Geometry and imported textures belong to the cached scene, so only the
      // materials cloned above (and the screen material) are ours to release.
      for (const material of ownedMaterials) material.dispose();
      screen.material.dispose();
      prepass.dispose();
      materials.clear();
      root.clear();

      cached.instances -= 1;
    },
  };
}

interface DepthPrepass {
  group: THREE.Group;
  setActive(active: boolean): void;
  dispose(): void;
}

/**
 * A depth-only copy of the model, for fading it without showing its insides.
 *
 * Alpha blending composites *every* surface it draws. On a solid object that
 * means the far rail, the back panel and the camera housing all blend through
 * the front glass the moment opacity drops below 1 — the device stops reading
 * as a solid object and starts reading as a wireframe.
 *
 * The fix is the standard one: write depth for the whole shell first with
 * colour writes off, then draw the real materials with `depthFunc: Equal`, so
 * only the frontmost surface at each pixel is blended. The result is a uniform
 * silhouette fade — the device gets more transparent, not more hollow.
 *
 * The copy shares geometry with the original, and both it and the depth
 * comparison are switched on only while something is actually fading, so a
 * device at full opacity renders exactly as it did before.
 */
function buildDepthPrepass(inner: THREE.Object3D): DepthPrepass {
  const group = new THREE.Group();
  group.name = "framelo-depth-prepass";
  group.visible = false;

  const proxyMaterials: THREE.Material[] = [];
  // Materials that get the Equal-depth treatment: the ones that make up the
  // solid shell. Anything already translucent by design — cover glass, a
  // camera sapphire — is meant to be seen through and is left alone.
  const solid: THREE.MeshStandardMaterial[] = [];

  const clone = inner.clone(true);

  clone.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;

    const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;

    if (!source || source.transparent) {
      // Already translucent by design — cover glass, a camera sapphire, a
      // transmission material. It must not contribute depth: writing depth for
      // something meant to be seen through would punch a hole in what is behind.
      //
      // The display is *not* in this group. It is an opaque emissive surface
      // and the most occluding thing on the device: leaving it out lets the
      // rear cameras show through the screen the moment the device fades.
      mesh.visible = false;
      return;
    }

    const depthMaterial = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: true,
      side: source.side,
      // Carried over so the pre-pass depth matches the colour pass exactly.
      // The Apple logo is offset forward to avoid z-fighting; without the same
      // offset here it would fail the Equal test and vanish mid-fade.
      polygonOffset: source.polygonOffset,
      polygonOffsetFactor: source.polygonOffsetFactor,
      polygonOffsetUnits: source.polygonOffsetUnits,
    });

    proxyMaterials.push(depthMaterial);
    mesh.material = depthMaterial;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });

  group.add(clone);

  inner.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;

    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    if (!material || material.transparent) return;
    if (isStandard(material) && !solid.includes(material)) solid.push(material);
  });

  return {
    group,

    setActive(active) {
      group.visible = active;

      for (const material of solid) {
        // `LessEqual`, not `Equal`. The pre-pass depth is by definition the
        // nearest solid surface, so only the frontmost fragment can match it
        // and everything behind still fails — but unlike `Equal` this survives
        // any depth drift between the pre-pass shader and the real one, which
        // some imported materials (transmission, emissive strength) do produce.
        material.depthFunc = THREE.LessEqualDepth;
        // The pre-pass already owns the depth buffer while fading; writing to
        // it again from a blended pass is what lets surfaces occlude each other.
        material.depthWrite = !active;
        material.needsUpdate = true;
      }
    },

    dispose() {
      for (const material of proxyMaterials) material.dispose();
      proxyMaterials.length = 0;
      group.clear();
    },
  };
}

/**
 * Orient, scale and centre a model.
 *
 * Each GLB has its own axes, so orientation comes first; height is then
 * normalised to a shared scene size and the body centred on the origin. That
 * makes one camera framing, one set of transform presets and one shadow work
 * across the whole library.
 */
function normalizeModel(root: THREE.Object3D, model: DeviceModelConfig): void {
  root.rotation.set(model.rotation[0], model.rotation[1], model.rotation[2]);
  root.position.set(0, 0, 0);
  root.scale.setScalar(1);
  root.updateMatrixWorld(true);

  const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  if (size.y > 0) {
    root.scale.setScalar(model.normalizeHeight / size.y);
    root.updateMatrixWorld(true);
  }

  const center = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
  root.position.sub(center);
}

function isStandard(material: THREE.Material): material is THREE.MeshStandardMaterial {
  return (material as THREE.MeshStandardMaterial).isMeshStandardMaterial === true;
}

function applyTweak(material: THREE.Material, tweak: MaterialTweak): void {
  const standard = isStandard(material) ? material : null;

  if (tweak.stripMaps && standard) {
    standard.normalMap = null;
    standard.roughnessMap = null;
    standard.metalnessMap = null;
  }
  if (tweak.emissiveFromMap && standard?.map) {
    // Promote a photographic detail (a lens flare, say) to a fixed glow, so it
    // reads the same at every angle instead of depending on the light rig.
    standard.emissiveMap = standard.map;
    standard.emissive = new THREE.Color(0xffffff);
    standard.toneMapped = false;
  }

  if (standard) {
    if (tweak.color !== undefined) standard.color.setHex(tweak.color);
    if (tweak.emissive !== undefined) standard.emissive.setHex(tweak.emissive);
    if (tweak.emissiveIntensity !== undefined) standard.emissiveIntensity = tweak.emissiveIntensity;
    if (tweak.metalness !== undefined) standard.metalness = tweak.metalness;
    if (tweak.roughness !== undefined) standard.roughness = tweak.roughness;
    if (tweak.envMapIntensity !== undefined) standard.envMapIntensity = tweak.envMapIntensity;
  }

  const physical = material as THREE.MeshPhysicalMaterial;
  if (tweak.clearcoat !== undefined && physical.isMeshPhysicalMaterial) {
    physical.clearcoat = tweak.clearcoat;
    physical.clearcoatRoughness = 1;
  }

  if (tweak.toneMapped !== undefined) material.toneMapped = tweak.toneMapped;
  if (tweak.transparent !== undefined) material.transparent = tweak.transparent;
  if (tweak.opacity !== undefined) material.opacity = tweak.opacity;
  if (tweak.polygonOffset !== undefined) material.polygonOffset = tweak.polygonOffset;
  if (tweak.polygonOffsetFactor !== undefined) {
    material.polygonOffsetFactor = tweak.polygonOffsetFactor;
  }
  if (tweak.polygonOffsetUnits !== undefined) {
    material.polygonOffsetUnits = tweak.polygonOffsetUnits;
  }

  material.needsUpdate = true;
}

/** True while any device GLB is still downloading. */
export function hasPendingModelLoads(): boolean {
  return pending.size > 0;
}

/** Resolves once every in-flight device load has settled. Used before export. */
export async function waitForDeviceModels(): Promise<void> {
  const inFlight = [...cache.values()];
  await Promise.allSettled(inFlight);
}

/**
 * Drop cached scenes beyond the unused budget.
 *
 * Called when a device is deselected. The most recently used idle model is
 * kept so switching back is instant; anything older is disposed, because a
 * 24 MB scene graph should not sit in memory for a device the project stopped
 * referencing several choices ago.
 */
export function releaseUnusedModels(): void {
  const idle = [...resolved.values()]
    .filter((entry) => entry.instances <= 0)
    .sort((a, b) => b.lastUsed - a.lastUsed);

  for (const entry of idle.slice(UNUSED_MODEL_BUDGET)) {
    resolved.delete(entry.path);
    cache.delete(entry.path);
    disposeScene(entry.scene);
  }
}

function disposeScene(scene: THREE.Object3D): void {
  const textures = new Set<THREE.Texture>();

  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;

    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        if (value && (value as THREE.Texture).isTexture) textures.add(value as THREE.Texture);
      }
      material.dispose();
    }
  });

  for (const texture of textures) texture.dispose();
}

/** Test/teardown helper. */
export function clearDeviceModelCache(): void {
  for (const entry of resolved.values()) disposeScene(entry.scene);
  resolved.clear();
  cache.clear();
}
