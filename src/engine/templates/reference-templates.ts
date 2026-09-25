import type { Transform } from '@/types/layer';
import type { ProjectTemplate, TemplateDeviceSpec, TemplateTextSpec } from './project-templates';

// All four reference posters share a 4:5 artboard. Keep their design coordinates
// in pixels, compensating for depth so editing a layer never changes its layout.
const UNIT = 2 * 7.6 * Math.tan(16 * Math.PI / 180) / 1350;
const depth = (z: number) => (7.6 - z) / 7.6;
const pose = (x: number, y: number, z: number): Partial<Transform> => ({
  x: (x - 540) * UNIT * depth(z), y: (675 - y) * UNIT * depth(z), z,
});
const white = '#f4eee9', orange = '#ff591c';
const base = {
  canvas: { width: 1080, height: 1350, fps: 60, duration: 7 },
  finish: 'dark' as const, cameraView: 'front' as const, posterTime: 3.4,
  motionPresetIds: [], background: { type: 'solid' as const, value: '#090707' },
};

function text(name: string, content: string, x: number, y: number, width: number, size: number,
  options: { color?: string; weight?: number; align?: 'left' | 'center'; font?: string;
    spacing?: number; lineHeight?: number; z?: number; start?: number; italic?: boolean;
    gradient?: string } = {}): TemplateTextSpec {
  const z = options.z ?? 1.6, factor = UNIT * 248 * depth(z);
  const lineHeight = options.lineHeight ?? 1.04;
  const transform = pose(x + width / 2, y + content.split('\n').length * size * lineHeight / 2, z);
  const color = options.color ?? white;
  return { name, content, transform, style: {
    fontId: options.font ?? 'inter', fontSize: size * factor,
    // Match the editor's persisted 100-step weights before the first preview.
    fontWeight: Math.round((options.weight ?? 400) / 100) * 100,
    fontStyle: options.italic ? 'italic' : 'normal', lineHeight,
    letterSpacing: (options.spacing ?? -size * 0.045) * factor,
    boxMode: 'fixed', boxWidth: width * factor, textAlign: options.align ?? 'left',
    fill: { type: options.gradient ? 'gradient' : 'solid', color,
      gradient: { from: color, to: options.gradient ?? color, angle: 90 } },
  }, entrance: { start: options.start ?? 0.2, end: (options.start ?? 0.2) + 1.1,
    easing: 'quint', from: { y: (transform.y ?? 0) - 0.065, opacity: 0 } } };
}

function image(name: string, file: string, x: number, y: number, width: number, height: number,
  z = -2, start = 0, opacity = 1): NonNullable<ProjectTemplate['imageLayers']>[number] {
  return { name, src: `/templates/reference/${file}`, width: width * UNIT * depth(z),
    height: height * UNIT * depth(z), transform: { ...pose(x, y, z), opacity },
    entrance: { start, end: start + 1.4, easing: 'quint', from: { opacity: 0 } } };
}

function device(name: string, deviceId: string, screenArtwork: TemplateDeviceSpec['screenArtwork'],
  x: number, y: number, width: number, rx: number, ry: number, rz: number): TemplateDeviceSpec {
  const z = 0.2, scale = width * UNIT * depth(z) / (deviceId === 'macbook' ? 4.4 : 1.48);
  const transform = { ...pose(x, y, z), rotationX: rx, rotationY: ry, rotationZ: rz,
    scaleX: scale, scaleY: scale, scaleZ: scale };
  return { name, deviceId, screenArtwork, shadowIntensity: 0, transform,
    entrance: { start: 0.55, end: 2.2, easing: 'quint', from: {
      opacity: 0, y: (transform.y ?? 0) - 0.18, rotationY: ry - 6,
    } } };
}

function trivxFooter(y: number) {
  return [text('Brand / TRIVX', 'TRIVX', 288, y, 225, 45, { weight: 600, spacing: 0 }),
    text('Brand / SOLUTIONS', 'S O L U T I O N S', 304, y + 47, 200, 10, { spacing: 1.1 }),
    text('Footer / divider', '/', 514, y - 5, 70, 65, { weight: 200 }),
    text('CTA / Visit Website', 'Visit Website', 608, y + 1, 340, 26, { weight: 500, spacing: -0.3 }),
    text('CTA / website', 'trivxsolutions.com', 608, y + 34, 350, 26, { color: '#66615f', spacing: -0.5 })];
}

export const REFERENCE_TEMPLATES: ProjectTemplate[] = [
  {
    ...base, id: 'creative-agency-purple', name: 'Creative Agency — Purple', category: 'laptop', deviceId: 'macbook',
    description: 'Oversized lavender Creative Agency typography, violet satin lighting and a laptop on a woven studio plinth.',
    tags: ['reference', 'purple', 'creative', 'agency', 'Devziner', 'MacBook'],
    deviceLayers: [device('Laptop / agency website', 'macbook', 'reference-creative', 520, 838, 875, -6, -11, -2)],
    textLayers: [
      text('Brand / Devziner', 'Devziner', 173, 75, 260, 35, { weight: 650, spacing: -1.5 }),
      text('Brand / Studio', 'Studio', 173, 110, 240, 34, { weight: 600, color: '#a247ff' }),
      text('Eyebrow / Award-Winning', 'Award-Winning', 325, 244, 460, 42, { weight: 600, spacing: -2, start: 0.3 }),
      text('Headline / Creative', 'Creative', 158, 249, 895, 218, { font: 'plus-jakarta-sans', weight: 750, color: '#f0ddff', spacing: -13, z: -0.7, start: 0.4 }),
      text('Headline / Agency!', 'Agency!', 88, 403, 990, 255, { font: 'plus-jakarta-sans', weight: 750, color: '#f0ddff', gradient: '#8952c5', spacing: -14, z: -0.65, start: 0.6 }),
      text('Background / script accent', 'stand out', -80, 941, 970, 170, { font: 'playfair-display', italic: true, color: '#dfbbff', spacing: -9, z: -1.2, start: 0.8 }),
      text('CTA / agency website', '↗  devzinerstudio.com', 87, 1253, 710, 26, { weight: 650, spacing: -0.6, start: 1 }),
    ],
    imageLayers: [
      image('Backdrop / violet folds', 'purple-atmosphere.svg', 540, 675, 1080, 1350, -4),
      image('Set / woven platform', 'purple-platform.svg', 540, 1003, 1080, 695, -1.4),
      image('Brand / Devziner monogram', 'devziner-mark.svg', 123, 107, 83, 70, 1.7, 0.1),
    ],
  },
  {
    ...base, id: 'digital-stress-orange', name: 'Digital Stress — Orange', category: 'mobile', deviceId: 'iphone-17-pro',
    description: 'The orange and black digital-services poster, with a hand-held phone, floating glass icons and architectural ribs.',
    tags: ['reference', 'orange', 'Trivx', 'digital', 'services', 'hand', 'phone'],
    deviceLayers: [device('Phone / digital services', 'iphone-17-pro', 'reference-services', 708, 944, 315, 14, -17, 27)],
    textLayers: [
      ...trivxFooter(74),
      text('Headline / setup', 'Run your Brand Online Without', 222, 382, 680, 42, { spacing: -2.2, weight: 300, align: 'center', start: 0.3 }),
      text('Headline / Digital Stress', 'Digital Stress', 212, 430, 815, 115, { color: orange, gradient: '#bf3b0c', weight: 600, spacing: -5.8, start: 0.5 }),
      text('Description / services', 'With Trivx, your website, AI,\nbranding and marketing all live\nin one place handled by one\nexpert team, secure, consistent\nand easy to understand', 132, 1020, 405, 28, { color: '#d4cbc5', lineHeight: 1.12, spacing: -0.7, weight: 300, start: 0.8 }),
    ],
    imageLayers: [
      image('Backdrop / orange architecture', 'orange-atmosphere.svg', 540, 675, 1080, 1350, -4),
      image('Brand / TRIVX symbol', 'trivx-mark.svg', 272, 100, 46, 49, 1.7, 0.1),
      image('Hand / orange studio photograph', 'hand.png', 782, 1073, 718, 897, -0.45, 0.55),
      image('Glass / security', 'glass-security.svg', 391, 821, 272, 209, -0.6, 0.9),
      image('Glass / growth', 'glass-growth.svg', 819, 742, 241, 199, -0.65, 1.1),
      image('Glass / global', 'glass-global.svg', 1000, 945, 225, 201, 1.1, 1.3),
      image('Accent / orange dash', 'orange-dash.svg', 163, 997, 63, 17, 1.7, 0.7),
    ],
  },
  {
    ...base, id: 'sales-person-orange', name: 'Sales Person — Orange', category: 'laptop', deviceId: 'macbook',
    description: 'A website that works like a sales person: huge orange type, shadowed portfolio panels and a laptop on dark concrete.',
    tags: ['reference', 'Trivx', 'orange', 'sales', 'website', 'MacBook'],
    deviceLayers: [device('Laptop / sales website', 'macbook', 'reference-sales', 570, 795, 870, -18, -14, 6)],
    textLayers: [
      text('Headline / setup', 'A Website That\nWorks Likes a', 242, 207, 307, 41, { lineHeight: 0.94, spacing: -2.2, start: 0.25 }),
      text('Headline / Sales Person', 'Sales\nPerson', 518, 170, 480, 104, { color: '#ff945f', gradient: '#ec460e', weight: 550, lineHeight: 0.8, spacing: -5.5, start: 0.45 }),
      text('Description / conversion', 'Built to attract, guide, and convert\nwithout saying a word', 261, 386, 608, 31, { color: '#d4cbc6', align: 'center', lineHeight: 0.97, weight: 300, spacing: -1.2, start: 0.7 }),
      ...trivxFooter(1225),
    ],
    imageLayers: [
      image('Backdrop / orange light ribbons', 'sales-atmosphere.svg', 540, 675, 1080, 1350, -4),
      image('Portfolio / receding websites', 'portfolio-ghosts.svg', 345, 752, 620, 617, -2.2, 0.8, 0.25),
      image('Set / concrete plinth', 'concrete-platform.svg', 540, 1210, 1080, 285, -1.4),
      image('Headline / fine frame and brush', 'sales-flourish.svg', 367, 262, 301, 159, -0.6, 0.3),
      image('Brand / TRIVX symbol', 'trivx-mark.svg', 272, 1251, 46, 49, 1.7, 1),
    ],
  },
  {
    ...base, id: 'bestrade-red-portfolio', name: 'Bestrade — Red Portfolio', category: 'laptop', deviceId: 'macbook',
    description: 'A black and scarlet trading portfolio: luminous candlesticks, Portuguese editorial typography and a dramatic laptop.',
    tags: ['reference', 'red', 'trading', 'Bestrade', 'portfolio', 'social media', 'MacBook'],
    deviceLayers: [device('Laptop / trading platform', 'macbook', 'reference-trading', 605, 925, 960, -8, 27, -7)],
    textLayers: [
      text('Masthead / discipline', 'DESIGN', 80, 22, 210, 14, { spacing: 2.2 }),
      text('Masthead / designer', 'LUCAS COELHO', 447, 22, 295, 14, { spacing: 2, align: 'center' }),
      text('Masthead / year', '2026', 948, 22, 115, 14, { spacing: 2 }),
      text('Brand / BESTRADE', 'BESTRADE', 338, 208, 299, 29, { weight: 600, spacing: -0.5, start: 0.2 }),
      text('Eyebrow / PORTFÓLIO', 'P O R T F Ó L I O', 104, 382, 870, 43, { spacing: 9, weight: 300, start: 0.3 }),
      text('Headline / SOCIAL MEDIA', 'SOCIAL MEDIA', 103, 442, 574, 55, { spacing: -1.7, weight: 300, start: 0.5 }),
      text('Headline / POST', 'POST', 486, 442, 280, 55, { weight: 750, spacing: -1.8, start: 0.6 }),
      text('Subheading / PROP FIRM', 'PROP FIRM', 106, 513, 280, 37, { weight: 600, spacing: -0.8, start: 0.7 }),
      text('Subheading / TRADING', 'TRADING', 323, 514, 300, 36, { italic: true, weight: 300, spacing: -1.4, start: 0.75 }),
      text('CTA / swipe', 'ARRASTA PARA O LADO', 348, 1214, 400, 25, { spacing: 1, weight: 300, start: 1.2 }),
    ],
    imageLayers: [
      image('Backdrop / red trading atmosphere', 'trading-atmosphere.svg', 540, 675, 1080, 1350, -4),
      image('Brand / glowing trading banner', 'trading-banner.svg', 541, 223, 666, 168, -0.6, 0.1),
      image('Brand / Bestrade symbol', 'bestrade-mark.svg', 315, 223, 29, 36, 1.7, 0.2),
      image('Set / black angular platform', 'trading-platform.svg', 540, 1230, 1080, 365, 1, 0.2),
      image('Details / toolbar and seal', 'trading-details.svg', 810, 586, 297, 399, 1.3, 1),
      image('CTA / glass button', 'trading-cta.svg', 540, 1230, 477, 88, 1.2, 1.1),
    ],
  },
];
