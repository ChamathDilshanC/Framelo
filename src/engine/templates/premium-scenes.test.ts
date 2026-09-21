import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STUDIO_TEMPLATES } from './studio-templates';
import { searchProjectTemplates } from './project-templates';
import { buildTemplateLayers } from './template-builder';
import { evaluateTransform } from '@/engine/animation/evaluate';
import { TRANSFORM_PROPERTIES } from '@/types/animation';
import { templateScreenUrl } from './screen-artwork';

describe('premium device scene acceptance', () => {
  it('contains the expected scenes per requested category', () => {
    expect(searchProjectTemplates('tablet', '')).toHaveLength(2);
    expect(searchProjectTemplates('laptop', '')).toHaveLength(3);
    expect(searchProjectTemplates('multi-device', '')).toHaveLength(2);
    expect(STUDIO_TEMPLATES).toHaveLength(7);
  });

  it.each(STUDIO_TEMPLATES)('$name has portable artwork and meaningful, staggered motion', template => {
    const { layers } = buildTemplateLayers(template, null);
    expect(template.canvas).toEqual({ width: 1080, height: 1350, fps: 60,
      duration: template.category === 'multi-device' ? 8 : 7 });
    expect(new Set(layers.map(layer => layer.name)).size).toBe(layers.length);
    const devices = layers.filter(layer => layer.type === 'device');
    expect(devices).toHaveLength(template.category === 'multi-device' ? 3 : 1);
    if (devices.length === 3) {
      expect(new Set(devices.map(layer => layer.metadata?.deviceId)))
        .toEqual(new Set(['macbook', 'ipad', 'iphone-17-pro']));
    }
    for (const layer of layers) {
      if (layer.type === 'image' || layer.type === 'device') {
        const url = layer.type === 'device' ? templateScreenUrl(layer.metadata?.screenArtwork) : String(layer.metadata?.imageSrc);
        expect(url).toMatch(/^\/templates\/studio\/[a-z-]+\.svg$/);
        expect(existsSync(`public${url}`)).toBe(true);
        const svg = readFileSync(`public${url}`, 'utf8');
        expect(svg).toContain('<svg');
        expect(svg).not.toMatch(/<image|<script|<foreignObject|https?:\/\/(?!www.w3.org)/);
      }
      for (const track of layer.animations) {
        expect(TRANSFORM_PROPERTIES).toContain(track.property);
        expect(new Set(track.keyframes.map(key => key.value)).size, `${layer.name} / ${track.property} has no effect`).toBeGreaterThan(1);
        expect(track.keyframes.every(key => key.time >= 0 && key.time <= template.canvas.duration)).toBe(true);
        expect(track.keyframes.every((key, i, keys) => i === 0 || keys[i - 1].time < key.time)).toBe(true);
        expect(track.keyframes.every(key => !['linear', 'elastic', 'spring', 'back'].includes(key.easing))).toBe(true);
      }
      const end = evaluateTransform(layer, template.canvas.duration);
      expect(Object.values(end).every(Number.isFinite)).toBe(true);
      if (layer.type === 'device' || layer.name.startsWith('UI /')) {
        expect(evaluateTransform(layer, 0).opacity).toBe(0);
        expect(evaluateTransform(layer, 3.5).opacity).toBe(layer.transform.opacity);
        expect(evaluateTransform(layer, 4).y).not.toBe(evaluateTransform(layer, 6).y);
        expect(Math.abs(end.rotationY - layer.transform.rotationY)).toBeLessThan(1);
      }
    }
  });

  it('keeps the commerce explosion as five separately editable and staggered windows', () => {
    const template = STUDIO_TEMPLATES.find(item => item.id === 'floating-commerce-laptop')!;
    const cards = template.imageLayers!.filter(layer => layer.name.startsWith('UI /'));
    expect(cards).toHaveLength(5);
    expect(new Set(cards.map(card => card.entrance.start)).size).toBe(5);
    expect(new Set(cards.map(card => card.transform.z)).size).toBe(5);
  });
});
