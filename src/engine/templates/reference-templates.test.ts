import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluateTransform } from '@/engine/animation/evaluate';
import { createProject } from '@/lib/project-factory';
import { parseProject } from '@/lib/validation/project-schema';
import { useProjectStore } from '@/store/project-store';
import { REFERENCE_TEMPLATES } from './reference-templates';
import { buildTemplateLayers } from './template-builder';
import { templateScreenUrl } from './screen-artwork';

describe('reference posters', () => {
  it('draws the trading platform and glass CTA behind their foreground label', () => {
    const { layers } = buildTemplateLayers(REFERENCE_TEMPLATES[3], null);
    const index = (name: string) => layers.findIndex(layer => layer.name === name);
    expect(index('Set / black angular platform')).toBeLessThan(index('CTA / glass button'));
    expect(index('CTA / glass button')).toBeLessThan(index('CTA / swipe'));
  });
  it.each(REFERENCE_TEMPLATES)('$name remains editable and portable after applying, saving and undoing', template => {
    const original = createProject();
    const store = () => useProjectStore.getState();
    store().loadProject(original);
    const built = buildTemplateLayers(template, original.layers[0]);
    store().applyProjectTemplate(template, built.layers);
    expect(built.layers.filter(layer => layer.type === 'device')).toHaveLength(1);
    expect(built.layers.filter(layer => layer.type === 'text').length).toBeGreaterThan(5);
    for (const layer of built.layers) {
      const url = layer.type === 'device' ? templateScreenUrl(layer.metadata?.screenArtwork)
        : layer.type === 'image' ? String(layer.metadata?.imageSrc) : null;
      if (url) expect(existsSync(`public${url}`), url).toBe(true);
      expect(evaluateTransform(layer, 0).opacity).toBe(0);
      expect(evaluateTransform(layer, template.posterTime!)).toEqual(layer.transform);
    }
    store().updateDeviceMetadata(built.deviceLayerId, { screenAssetId: 'uploaded-screen', screenFit: 'contain' });
    const saved = parseProject(JSON.parse(JSON.stringify(store().project)));
    expect(saved.ok, saved.error).toBe(true);
    expect(saved.project?.layers).toEqual(store().project?.layers);
    store().undo();
    store().redo();
    expect(store().project?.layers).toEqual(saved.project?.layers);
  });
});
