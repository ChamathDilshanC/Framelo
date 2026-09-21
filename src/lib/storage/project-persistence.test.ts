import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { idb } from './idb';
import { projectStorage } from './project-storage';
import { assetStorage } from './asset-storage';
import { PROJECT_TEMPLATES } from '@/engine/templates/project-templates';
import { STUDIO_TEMPLATES } from '@/engine/templates/studio-templates';
import { buildTemplateLayers } from '@/engine/templates/template-builder';
import { evaluateTransform } from '@/engine/animation/evaluate';
import { createProject } from '@/lib/project-factory';
import { useProjectStore } from '@/store/project-store';
import { useEditorStore } from '@/store/editor-store';
import { useAssetStore } from '@/store/asset-store';
import { saveProjectNow } from '@/lib/hooks/use-autosave';
import { loadProject, saveProject, pendingSyncCount, projectUuid } from '@/lib/projects/project-service';
import { resolveProjectView } from '@/lib/project-view';
import type { Asset } from '@/types/asset';

const cloudMock = vi.hoisted(() => ({ client: vi.fn<() => unknown>(() => null), user: null as { id: string } | null }));
vi.mock('@/lib/supabase/client', () => ({ getSupabaseClient: cloudMock.client }));
vi.mock('@/store/auth-store', () => ({ useAuthStore: { getState: () => ({ user: cloudMock.user }) } }));
vi.mock('@/lib/toast', () => ({ notify: { warning: vi.fn(), error: vi.fn(), success: vi.fn() } }));

const store = () => useProjectStore.getState();
beforeEach(async () => {
  cloudMock.client.mockReturnValue(null);
  cloudMock.user = null;
  const entries = new Map<string, string>();
  vi.stubGlobal('window', { localStorage: {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  } });
  for (const key of await idb.keys()) await idb.delete(key);
  store().closeProject();
  assetStorage.releaseAll();
  useAssetStore.setState({ hydrated: false, assets: [], error: null });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); assetStorage.releaseAll(); });

describe('real project storage pipeline', () => {
  it.each(STUDIO_TEMPLATES)('$name keeps every screen independent across all five media formats and reload', async template => {
    store().loadProject(createProject());
    store().applyProjectTemplate(template, buildTemplateLayers(template, null).layers);
    const devices = store().project!.layers.filter(layer => layer.type === 'device');
    const composition = structuredClone(store().project!);
    const media: Asset[] = [];
    // This verifies byte storage and assignment, not browser image/video decoding.
    for (const [extension, mimeType, type] of [
      ['png', 'image/png', 'image'], ['jpg', 'image/jpeg', 'image'],
      ['webp', 'image/webp', 'image'], ['mp4', 'video/mp4', 'video'], ['webm', 'video/webm', 'video'],
    ] as const) {
      for (const [index, device] of devices.entries()) {
        const id = `${template.id}-${index}-${extension}`;
        const blob = new Blob([id], { type: mimeType });
        const asset: Asset = { id, storageKey: `asset/${id}`, type, mimeType,
          originalName: `${id}.${extension}`, size: blob.size, createdAt: new Date().toISOString() };
        await assetStorage.put(asset.storageKey, blob);
        media.push(asset);
        store().updateDeviceMetadata(device.id, { screenAssetId: id, screenFit: 'contain' });
        const current = store().project!;
        expect(current.background).toEqual(composition.background);
        expect(current.canvas).toEqual(composition.canvas);
        for (const layer of current.layers) {
          const original = composition.layers.find(item => item.id === layer.id)!;
          expect(layer.transform).toEqual(original.transform);
          expect(layer.animations).toEqual(original.animations);
          if (layer.type !== 'device') expect(layer).toEqual(original);
        }
        // A replacement must not modify the identity of any companion screen.
        expect(new Set(current.layers.filter(item => item.type === 'device' && item.metadata?.screenAssetId)
          .map(item => item.metadata?.screenAssetId)).size).toBe(index + 1 === devices.length || extension !== 'png' ? devices.length : index + 1);
      }
      await projectStorage.saveAssets(media);
      expect(await saveProjectNow(store().project!)).toBe(true);
      const saved = structuredClone(store().project!);
      store().closeProject(); assetStorage.releaseAll();
      useAssetStore.setState({ hydrated: false, assets: [] });
      await useAssetStore.getState().hydrate();
      const reopened = await loadProject(saved.id);
      expect(reopened).toEqual(saved);
      store().loadProject(reopened!);
      for (const [index, device] of devices.entries()) {
        const id = `${template.id}-${index}-${extension}`;
        expect(reopened!.layers.find(item => item.id === device.id)?.metadata?.screenAssetId).toBe(id);
        const resolved = useAssetStore.getState().getAsset(id)!;
        expect(resolved.type).toBe(type);
        expect(await (await fetch(resolved.url)).text()).toBe(id);
      }
    }
  });

  it.each(PROJECT_TEMPLATES)('$name survives edits, media hydration, close and reopen', async template => {
    const original = createProject();
    store().loadProject(original);
    store().applyProjectTemplate(template, buildTemplateLayers(template, original.layers[0]).layers);
    const layers = store().project!.layers;
    const text = layers.find(layer => layer.type === 'text')!;
    const device = layers.find(layer => layer.type === 'device')!;
    store().setTextContent(text.id, 'Saved editorial headline');
    store().updateTextMetadata(text.id, { fontWeight: 500, letterSpacing: -1.2 });
    store().setTransformValue(device.id, 'x', 0.42);
    store().addKeyframe(device.id, 'rotationY', 3, -18, 'easeInOut');
    store().updateDeviceMetadata(device.id, { screenAssetId: 'saved-media', screenFit: 'contain', screenContrast: 1.2 });
    store().moveLayer(text.id, store().project!.layers.length - 1);
    const binary = new Blob(['persisted media bytes'], { type: 'image/png' });
    const asset: Asset = { id: 'saved-media', storageKey: 'asset/test', type: 'image', originalName: 'screen.png',
      mimeType: 'image/png', size: binary.size, createdAt: new Date().toISOString() };
    await assetStorage.put(asset.storageKey, binary);
    await projectStorage.saveAssets([asset]);
    const editor = useEditorStore.getState();
    editor.setDuration(6); editor.setCurrentTime(3.2); editor.setCameraView('custom');
    editor.recordCameraPose({ position: [1.1, 0.6, 8.2], target: [0.2, -0.1, 0] });
    editor.selectLayer(device.id);
    expect(await saveProjectNow(store().project!)).toBe(true);
    const saved = structuredClone(store().project!);
    const before = saved.layers.map(layer => evaluateTransform(layer, 3.2));
    store().closeProject(); assetStorage.releaseAll();
    useEditorStore.getState().setCurrentTime(0);
    await useAssetStore.getState().hydrate();
    const reopened = await loadProject(saved.id);
    expect(reopened).toEqual(saved);
    store().loadProject(reopened!);
    expect(useEditorStore.getState().currentTime).toBe(3.2);
    expect(useEditorStore.getState().cameraPose).toEqual(saved.editorState!.camera);
    expect(useEditorStore.getState().isPlaying).toBe(false);
    expect(store().project!.layers.map(layer => evaluateTransform(layer, 3.2))).toEqual(before);
    const resolved = useAssetStore.getState().getAsset('saved-media')!;
    expect(resolved.url).toMatch(/^blob:/);
    expect(await (await fetch(resolved.url)).text()).toBe('persisted media bytes');
    expect(store().project!.layers.filter(layer => layer.type === 'image')).toEqual(saved.layers.filter(layer => layer.type === 'image'));
  });

  it.each(['ipad', 'macbook'])('adds a blank %s with no inherited template media or animation', async deviceId => {
    store().loadProject(createProject());
    const id = store().addDeviceLayer(deviceId)!;
    const layer = store().project!.layers.find(item => item.id === id)!;
    expect(layer.animations).toEqual([]);
    expect(layer.metadata?.screenAssetId).toBeNull();
    expect(layer.metadata?.screenArtwork).toBeUndefined();
    expect(Math.abs(layer.transform.rotationY)).toBeLessThan(45);
    store().updateDeviceMetadata(id, { screenAssetId: 'video-test', screenFit: 'fill' });
    await saveProjectNow(store().project!);
    const reopened = await loadProject(store().project!.id);
    expect(reopened?.layers.find(item => item.id === id)).toEqual(store().project!.layers.find(item => item.id === id));
  });

  it('opens legacy entrance templates at a visible poster but preserves an explicitly saved zero', () => {
    const project = { ...createProject(), templateId: 'nebula-music-experience' };
    expect(resolveProjectView(project).currentTime).toBe(3);
    project.editorState = { ...resolveProjectView(project), currentTime: 0 };
    expect(resolveProjectView(project).currentTime).toBe(0);
  });

  it('does not acknowledge a write whose transaction aborts after request success', async () => {
    const original = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args) {
      const request = original.apply(this, args);
      request.addEventListener('success', () => this.transaction.abort());
      return request;
    });
    await expect(idb.set('aborted', { keep: false })).rejects.toThrow();
    expect(await idb.get('aborted')).toBeUndefined();
  });

  it('preserves corrupt saved data instead of silently creating an empty document', async () => {
    await idb.set('project:broken', { layers: 'damaged' });
    await expect(loadProject('broken')).rejects.toThrow();
    expect(await idb.get('project:broken')).toEqual({ layers: 'damaged' });
  });

  it('keeps a newer edit unsaved when an older asynchronous save completes', async () => {
    store().loadProject(createProject());
    const original = projectStorage.save.bind(projectStorage);
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    vi.spyOn(projectStorage, 'save').mockImplementation(async project => { await gate; await original(project); });
    const pending = saveProjectNow(store().project!);
    store().renameProject('Newer edit');
    release(); await pending;
    expect(store().saveStatus).toBe('unsaved');
    await saveProjectNow(store().project!);
    expect(store().saveStatus).toBe('offline');
    expect((await loadProject(store().project!.id))?.name).toBe('Newer edit');
  });

  it('serializes rapid saves and waits for pending writes before reopening', async () => {
    const project = createProject();
    const first = saveProject({ ...project, name: 'First' });
    const second = saveProject({ ...project, name: 'Second' });
    const reopened = await loadProject(project.id);
    await Promise.all([first, second]);
    expect(reopened?.name).toBe('Second');
  });

  it.each(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'])('restores %s asset bytes and metadata independently of object URLs', async mimeType => {
    const bytes = new Blob([new Uint8Array([1, 2, 3, 4])], { type: mimeType });
    await assetStorage.put('asset/binary', bytes);
    const asset: Asset = { id: 'binary', storageKey: 'asset/binary', type: mimeType.startsWith('video') ? 'video' : 'image',
      mimeType, originalName: 'uploaded-screen', size: bytes.size, createdAt: new Date().toISOString() };
    await projectStorage.saveAssets([asset]);
    await useAssetStore.getState().hydrate();
    const first = useAssetStore.getState().getAsset('binary')!.url;
    assetStorage.releaseAll();
    useAssetStore.setState({ hydrated: false, assets: [] });
    await useAssetStore.getState().hydrate();
    const second = useAssetStore.getState().getAsset('binary')!;
    expect(second.url).not.toBe(first);
    expect(second.mimeType).toBe(mimeType);
    expect(second.type).toBe(asset.type);
    expect(new Uint8Array(await (await fetch(second.url)).arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('writes the latest local revision while an earlier cloud upload is still pending', async () => {
    let release!: () => void;
    let began!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const started = new Promise<void>(resolve => { began = resolve; });
    const sent: string[] = [];
    cloudMock.user = { id: 'test-user' };
    cloudMock.client.mockReturnValue({ from: () => ({ upsert: async (row: { name: string }) => {
      sent.push(row.name);
      if (sent.length === 1) { began(); await gate; }
      return { error: null };
    } }) });
    const project = createProject();
    const first = saveProject({ ...project, name: 'First' });
    await started;
    const second = saveProject({ ...project, name: 'Newest' });
    expect((await loadProject(project.id))?.name).toBe('Newest');
    expect(sent).toEqual(['First']);
    release();
    await Promise.all([first, second]);
    expect(sent).toEqual(['First', 'Newest']);
    expect(pendingSyncCount()).toBe(0);
  });

  it('reports a durable local save even when the cloud request throws', async () => {
    cloudMock.user = { id: 'test-user' };
    cloudMock.client.mockReturnValue({ from: () => ({ upsert: async () => { throw new Error('Offline'); } }) });
    const project = createProject();
    expect(await saveProject(project)).toEqual({ saved: true, synced: false, error: 'Offline' });
    expect((await projectStorage.load(project.id))?.layers).toEqual(project.layers);
    expect(pendingSyncCount()).toBe(1);
  });
});


describe('cloud project IDs', () => {
  it('generates valid stable UUIDs even when XOR sets the sign bit', () => {
    for (let index = 0; index < 1000; index++) {
      const id = `proj_${index}`;
      expect(projectUuid(id)).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-8[a-f0-9]{3}-[a-f0-9]{12}$/);
      expect(projectUuid(id)).toBe(projectUuid(id));
    }
    const uuid = 'aabbeeff-1122-4333-8444-123456789abc';
    expect(projectUuid(uuid)).toBe(uuid);
  });
  it('reports guest saves as local and explains how to enable sync', async () => {
    const result = await saveProject(createProject());
    expect(result.saved).toBe(true);
    expect(result.synced).toBe(false);
    expect(result.error).toContain('not configured');
  });
  it('sends a valid UUID to the cloud and clears the failed-sync queue after success', async () => {
    const upsert = vi.fn().mockResolvedValueOnce({ error: { message: 'Network unavailable' } }).mockResolvedValue({ error: null });
    cloudMock.client.mockReturnValue({ from: () => ({ upsert }) });
    cloudMock.user = { id: 'account' };
    const project = { ...createProject(), id: 'proj_7f4bae03e511' };
    expect((await saveProject(project)).synced).toBe(false);
    expect(pendingSyncCount()).toBe(1);
    expect((await saveProject(project)).synced).toBe(true);
    expect(pendingSyncCount()).toBe(0);
    expect(upsert.mock.calls[1][0].id).toMatch(/^[a-f0-9-]{36}$/);
  });
});
