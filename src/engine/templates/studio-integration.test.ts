import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import { getDevice } from '@/devices/registry';
import { STUDIO_TEMPLATES } from './studio-templates';
import { buildTemplateLayers } from './template-builder';
import { templateScreenUrl } from './screen-artwork';
import { evaluateTransform } from '@/engine/animation/evaluate';
import { createProject } from '@/lib/project-factory';
import { parseProject } from '@/lib/validation/project-schema';
import { useProjectStore } from '@/store/project-store';
import { applyScreenAppearance, createScreenMaterial, setScreenTexture } from '@/engine/devices/screen-material';

describe('studio device assets', () => {
  it.each(['ipad', 'macbook'])('%s GLB has a real body and a correctly oriented independent display', async (id) => {
    const definition = getDevice(id);
    const bytes = readFileSync(`public${definition.model!.path}`);
    const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const screen = gltf.scene.getObjectByName('Screen') as THREE.Mesh;
    expect(screen?.isMesh).toBe(true);
    expect((screen.material as THREE.Material).name).toBe('Display');
    gltf.scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
    expect(bounds.z).toBeGreaterThan(id === 'macbook' ? 2 : 0.08);
    const positions = screen.geometry.getAttribute('position');
    const uv = screen.geometry.getAttribute('uv');
    screen.geometry.computeBoundingBox();
    const displaySize = screen.geometry.boundingBox!.getSize(new THREE.Vector3());
    expect(displaySize.x / displaySize.y).toBeCloseTo(definition.screenAspect, 4);
    for (let i = 0; i < positions.count; i++) {
      expect(uv.getX(i)).toBeCloseTo(positions.getX(i) / displaySize.x + 0.5, 5);
      expect(uv.getY(i)).toBeCloseTo(0.5 - positions.getY(i) / displaySize.y, 5);
    }
    const center = screen.getWorldPosition(new THREE.Vector3());
    const ray = new THREE.Raycaster(center.clone().add(new THREE.Vector3(0, 0, 10)), new THREE.Vector3(0, 0, -1));
    expect(ray.intersectObject(gltf.scene, true)[0]?.object.name).toBe('Screen');
    expect(screen.getWorldDirection(new THREE.Vector3()).z).toBeGreaterThan(0.9);
    const display = createScreenMaterial(definition.model!);
    const other = createScreenMaterial(definition.model!);
    const texture = new THREE.Texture();
    setScreenTexture(display, texture, 1.5);
    for (const [fit, mode] of [['cover', 0], ['contain', 1], ['fill', 2]] as const) {
      applyScreenAppearance(display, { fit, brightness: 1, contrast: 1, saturation: 1, imageAspect: 1.5 });
      expect(display.uniforms.uFit.value).toBe(mode);
    }
    expect(display.material.emissiveMap).toBe(texture);
    expect(other.material.emissiveMap).toBeNull();
    display.material.dispose(); other.material.dispose(); texture.dispose();
  });
});

describe('studio template integration', () => {
  it.each(STUDIO_TEMPLATES)('$name persists editable models, independent media and keyframes through undo/redo', (template) => {
    const store = () => useProjectStore.getState();
    const original = createProject();
    store().loadProject(original);
    const built = buildTemplateLayers(template, original.layers[0]);
    store().applyProjectTemplate(template, built.layers);
    const devices = built.layers.filter(layer => layer.type === 'device');
    expect(devices.map(layer => layer.metadata?.deviceId)).toEqual(template.deviceLayers!.map(spec => spec.deviceId));
    devices.forEach((layer, index) => {
      const url = templateScreenUrl(layer.metadata?.screenArtwork);
      expect(url && existsSync(`public${url}`)).toBe(true);
      expect(evaluateTransform(layer, 0).opacity).toBe(0);
      expect(evaluateTransform(layer, 3).opacity).toBe(1);
      store().updateDeviceMetadata(layer.id, { screenAssetId: `independent-${index}`, screenFit: 'contain' });
      expect(store().project!.layers.find(item => item.id === layer.id)?.animations).toEqual(layer.animations);
    });
    const parsed = parseProject(JSON.parse(JSON.stringify(store().project)));
    expect(parsed.ok, parsed.error).toBe(true);
    expect(parsed.project?.layers).toEqual(store().project?.layers);
    const final = structuredClone(store().project);
    store().undo(); store().redo();
    expect(store().project?.layers).toEqual(final?.layers);
    devices.forEach((layer, index) => expect(store().project!.layers.find(item => item.id === layer.id)?.metadata?.screenAssetId).toBe(`independent-${index}`));
  });
});
