import type { Transform } from '@/types/layer';
import type { ProjectTemplate, TemplateDeviceSpec, TemplateEntrance, TemplateTextSpec } from './project-templates';

// Poster coordinates converted to the existing front camera, including depth compensation.
// Every helper returns ordinary serializable project layers, never renderer-only state.
const UNIT = 2 * 7.6 * Math.tan(16 * Math.PI / 180) / 1350;
const depth = (z: number) => (7.6 - z) / 7.6;
const pose = (x: number, y: number, z: number): Partial<Transform> => ({
  x: (x - 540) * UNIT * depth(z), y: (675 - y) * UNIT * depth(z), z,
});
const white = '#f2f0e9', muted = '#9b9d9f', red = '#ff4638', lime = '#c8f54a';
const amber = '#ffb45e', orange = '#ff783e', blue = '#a4d9ef';

function reveal(t: Partial<Transform>, start: number, end: number, moving = false): TemplateEntrance {
  return {
    start, end, easing: 'quint',
    from: { opacity: 0, y: (t.y ?? 0) - (moving ? 0.26 : 0.09),
      ...(moving ? { z: (t.z ?? 0) - 0.45, rotationX: (t.rotationX ?? 0) + 6,
        rotationY: (t.rotationY ?? 0) - 9,
        scaleX: (t.scaleX ?? 1) * 0.93, scaleY: (t.scaleY ?? 1) * 0.93, scaleZ: (t.scaleZ ?? 1) * 0.93 } : {}) },
    ...(moving ? { drift: { start: 3.5, easing: 'smoother' as const,
      to: { y: (t.y ?? 0) + 0.013, rotationY: (t.rotationY ?? 0) + 0.65, x: (t.x ?? 0) + 0.009 } } } : {}),
  };
}

function copy(name: string, content: string, x: number, y: number, width: number, size: number,
  color = white, start = 0.3, options: { weight?: number; align?: 'left' | 'center' | 'right'; mono?: boolean; z?: number } = {}): TemplateTextSpec {
  const z = options.z ?? 1.5, factor = UNIT * 248 * depth(z);
  const transform = pose(x + width / 2, y + content.split('\n').length * size * 1.07 / 2, z);
  return { name: `Text / ${name}`, content, transform,
    style: { fontId: options.mono ? 'jetbrains-mono' : 'inter', fontSize: size * factor,
      fontWeight: options.weight ?? (size > 60 ? 600 : 400), lineHeight: 1.07,
      letterSpacing: (size > 60 ? -size * 0.055 : options.mono ? 1.4 : 0) * factor,
      boxMode: 'fixed', boxWidth: width * factor, textAlign: options.align ?? 'left',
      fill: { type: 'solid', color, gradient: { from: color, to: color, angle: 0 } } },
    entrance: reveal(transform, start, start + 1.25),
  };
}

function device(name: string, deviceId: string, artwork: TemplateDeviceSpec['screenArtwork'],
  x: number, y: number, z: number, width: number, rx: number, ry: number, rz: number, start = 0.65): TemplateDeviceSpec {
  const modelWidth = deviceId === 'macbook' ? 4.4 : deviceId === 'ipad' ? 2.16 : 1.48;
  const scale = width * UNIT * depth(z) / modelWidth;
  const transform = { ...pose(x, y, z), rotationX: rx, rotationY: ry, rotationZ: rz, scaleX: scale, scaleY: scale, scaleZ: scale };
  return { name, deviceId, screenArtwork: artwork, shadowIntensity: 0, transform,
    entrance: reveal(transform, start, start + 1.65, true) };
}

function panel(name: string, asset: string, x: number, y: number, width: number, height: number,
  z: number, start: number, rotationY = 0, rotationZ = 0, opacity = 1): NonNullable<ProjectTemplate['imageLayers']>[number] {
  const transform = { ...pose(x, y, z), rotationY, rotationZ, opacity };
  const entrance = reveal(transform, start, start + 1.45, true);
  // A plane has no thickness: a scaleZ track adds no visible motion.
  delete entrance.from.scaleZ;
  return { name, src: `/templates/studio/${asset}.svg`, width: width * UNIT * depth(z), height: height * UNIT * depth(z),
    transform, entrance };
}

function atmosphere(color: string, structure: string) {
  return [
    panel('FX / Softbox spill', `glow-${color}`, 490, 700, 1390, 1530, -3.8, 0, 0, 0, 0.75),
    panel('FX / Studio floor', `floor-${color}`, 550, 1160, 1200, 430, -3.3, 0.1, 0, 0, 0.7),
    panel('FX / Architectural lines', structure, 540, 660, 990, 1120, -3, 0.18, 0, 0, 0.38),
  ].map((layer) => ({ ...layer, entrance: {
    start: layer.entrance.start, end: 0.9, easing: 'smoother' as const,
    from: { opacity: 0 },
    drift: { start: 3.5, easing: 'smoother' as const,
      to: { x: (layer.transform.x ?? 0) + 0.018, opacity: (layer.transform.opacity ?? 1) * 0.96 } },
  } }));
}
function masthead(index: string, title: string, color: string) {
  return [copy('Studio signature', 'FRM / STUDIO', 72, 61, 440, 22, white, 0.15, { weight: 600 }),
    copy('Edition', `${index}   /   ${title}`, 530, 64, 478, 12, color, 1.55, { align: 'right', mono: true })];
}
function footer(index: string, title: string, color: string) {
  return [copy('Project index', `FRAMELO®   /   ${title}`, 72, 1235, 690, 15, white, 1.7, { mono: true }),
    copy('Edition number', `2026 — ${index}`, 800, 1235, 208, 13, color, 1.85, { align: 'right', mono: true }),
    copy('Production note', 'DESIGN IN MOTION.    EVERY DETAIL, CONSIDERED.', 72, 1270, 930, 10, muted, 2.1, { mono: true })];
}
const base = {
  canvas: { width: 1080, height: 1350, fps: 60, duration: 7 }, finish: 'dark' as const,
  cameraView: 'front' as const, posterTime: 3.5, motionPresetIds: [],
  background: { type: 'solid' as const, value: '#050607' },
};

export const STUDIO_TEMPLATES: ProjectTemplate[] = [
  {
    ...base, id: 'crimson-editorial-tablet', name: 'Crimson Editorial Tablet', category: 'tablet', deviceId: 'ipad',
    description: 'A scarlet editorial study. Sculpted glass, offset folios and precise typography suspended in a black studio.',
    tags: ['iPad', 'crimson', 'red', 'editorial', 'cinematic', 'portrait'],
    deviceLayers: [device('Tablet / Hero', 'ipad', 'crimson-editorial', 615, 723, 0, 470, 9, -18, 9)],
    textLayers: [ ...masthead('01', 'EDITORIAL SYSTEM', red),
      copy('Eyebrow', 'FORM FOLLOWS FEELING.', 74, 204, 820, 16, muted, 0.32, { mono: true }),
      copy('Headline', 'Ideas with', 67, 244, 940, 124, white, 0.4),
      copy('Hero word', 'presence.', 67, 366, 940, 124, red, 0.58),
      copy('Project metadata', 'PROJECT / 026\nDIGITAL DESIGN\nEXPERIMENT 01\n\n35 MM / STUDIO\nFRAME 210', 76, 696, 245, 11, muted, 1.6, { mono: true }),
      copy('Side index', '01\n—\n06', 943, 621, 65, 19, red, 1.8, { mono: true }),
      ...footer('01', 'PRECISION HAS A PRESENCE', red) ],
    imageLayers: [...atmosphere('red', 'editorial-lines'),
      panel('UI / Editorial folio', 'crimson-folio', 300, 884, 302, 185, -0.4, 1.13, -18, 9),
      panel('UI / Material study', 'crimson-detail', 809, 976, 240, 176, 1.1, 1.45, -13, 9)],
  },
  {
    ...base, id: 'neon-portfolio-tablet', name: 'Neon Portfolio Tablet', category: 'tablet', deviceId: 'ipad',
    description: 'Acid-lime typography meets an oblique portfolio tablet, orbiting project cards and a quiet geometric grid.',
    tags: ['iPad', 'lime', 'green', 'portfolio', 'website', 'neon'],
    deviceLayers: [device('Tablet / Hero', 'ipad', 'neon-portfolio', 574, 780, -0.1, 439, 8, 18, -10)],
    textLayers: [...masthead('02', 'SELECTED WORK', lime),
      copy('Question', '?', 715, 158, 300, 344, '#253017', 0.12, { weight: 500, z: -2 }),
      copy('Headline first line', 'Make something', 70, 223, 940, 85, white, 0.32),
      copy('Headline second line', 'unforgettable.', 65, 314, 955, 106, lime, 0.52),
      copy('Deck', 'A portfolio with a point of view.', 74, 447, 800, 24, muted, 0.77),
      ...footer('02', 'YOUR WORK. IN ITS BEST LIGHT.', lime)],
    imageLayers: [...atmosphere('lime', 'grid'),
      panel('UI / Selected project', 'portfolio-card', 232, 700, 302, 206, 0.65, 1.12, 18, -10),
      panel('UI / Availability', 'availability', 810, 1020, 317, 130, 1.2, 1.4, 15, -10),
      panel('UI / Project index', 'project-index', 892, 637, 187, 188, -0.5, 1.65, 18, -10)],
  },
  {
    ...base, id: 'midnight-sales-laptop', name: 'Midnight Sales Laptop', category: 'laptop', deviceId: 'macbook',
    description: 'Burnt-orange type, a dramatically angled laptop and receding web panels in a midnight product studio.',
    tags: ['MacBook', 'orange', 'sales', 'website', 'midnight', 'cinematic'],
    deviceLayers: [device('Laptop / Hero', 'macbook', 'midnight-sales', 659, 832, 0, 864, 17, -20, 5)],
    textLayers: [...masthead('03', 'BUILT TO CONVERT', orange),
      copy('Headline setup', 'More than\na website.', 76, 237, 405, 57, white, 0.3),
      copy('Hero line one', 'A growth', 460, 207, 563, 103, orange, 0.46),
      copy('Hero line two', 'engine.', 457, 314, 566, 128, orange, 0.66),
      copy('Deck', 'Designed to move people. Built to move business.', 78, 494, 932, 22, muted, 0.85),
      copy('Margin note', 'STRATEGY\nDESIGN\nDEVELOPMENT\n\n01 — 03', 74, 984, 220, 11, orange, 1.6, { mono: true }),
      ...footer('03', 'MAKE YOUR NEXT MOVE', orange)],
    imageLayers: [...atmosphere('orange', 'light-streak'),
      panel('UI / Strategy archive', 'sales-archive', 216, 734, 285, 363, -1.8, 0.95, -20, 5, 0.25),
      panel('UI / Results archive', 'sales-results', 433, 698, 252, 307, -1.2, 1.14, -20, 5, 0.32)],
  },
  {
    ...base, id: 'floating-commerce-laptop', name: 'Floating Commerce Laptop', category: 'laptop', deviceId: 'macbook',
    description: 'An exploded commerce experience: five independently animated windows rise above a floating graphite laptop.',
    tags: ['MacBook', 'ecommerce', 'commerce', 'floating', 'blue', 'product', 'windows'],
    deviceLayers: [device('Laptop / Hero', 'macbook', 'floating-commerce', 548, 836, -0.2, 802, 16, -17, 7)],
    textLayers: [...masthead('04', 'COMMERCE IN DEPTH', blue),
      copy('Headline', 'Beyond the storefront.', 73, 187, 960, 65, white, 0.3, { weight: 500 }),
      copy('Deck', 'One experience. Every dimension.', 77, 271, 840, 20, muted, 0.52),
      ...footer('04', 'FORM / OBJECTS FOR EVERYDAY', blue)],
    imageLayers: [...atmosphere('blue', 'commerce-lines'),
      panel('UI / Navigation window', 'commerce-nav', 420, 493, 574, 83, -0.7, 1.0, -17, 7),
      panel('UI / Campaign window', 'commerce-campaign', 470, 589, 587, 305, 0.6, 1.2, -17, 7),
      panel('UI / Sale card', 'commerce-sale', 820, 436, 283, 232, 1.0, 1.44, -17, 7),
      panel('UI / Product card', 'commerce-product', 831, 769, 251, 280, 1.55, 1.68, -17, 7),
      panel('UI / Checkout card', 'commerce-checkout', 195, 856, 239, 166, 0.4, 1.86, -17, 7)],
  },
  {
    ...base, canvas: { ...base.canvas, duration: 8 }, id: 'amber-agency-ecosystem', name: 'Amber Agency Ecosystem', category: 'multi-device', deviceId: 'macbook',
    description: 'A three-screen agency launch framed by amber architectural lines, staggered depth and oversized editorial type.',
    tags: ['MacBook', 'iPad', 'iPhone', 'amber', 'orange', 'agency', 'ecosystem'],
    deviceLayers: [device('Laptop / Hero', 'macbook', 'amber-agency', 526, 524, -0.65, 758, 13, -16, -5, 0.6),
      device('Tablet / Companion', 'ipad', 'amber-tablet', 830, 648, 0.45, 259, 5, -19, -8, 0.86),
      device('Phone / Foreground', 'iphone-17-pro', 'amber-mobile', 245, 708, 1.1, 169, 9, -14, 15, 1.1)],
    textLayers: [...masthead('05', 'CONNECTED BY DESIGN', amber),
      copy('Service label', 'INDEPENDENT DIGITAL STUDIO', 78, 926, 875, 16, amber, 0.3, { mono: true }),
      copy('Headline first line', 'Build your', 73, 967, 950, 91, white, 0.44),
      copy('Headline second line', 'next chapter.', 70, 1060, 970, 101, amber, 0.62),
      copy('Services', 'UI/UX     E-COMMERCE     BRANDING     WEB DESIGN', 77, 1207, 935, 12, white, 1.7, { mono: true }),
      copy('Studio footer', 'FRAMELO® / DIGITAL EXPERIENCES', 77, 1280, 820, 11, muted, 1.9, { mono: true })],
    imageLayers: [...atmosphere('amber', 'architecture'),
      panel('UI / Capabilities', 'agency-services', 222, 402, 276, 164, 0.8, 1.34, -16, -5),
      panel('UI / Project status', 'agency-status', 788, 309, 263, 92, 0.1, 1.61, -16, -5)],
  },
  {
    ...base, canvas: { ...base.canvas, duration: 8 }, id: 'lime-digital-campaign', name: 'Lime Digital Campaign', category: 'multi-device', deviceId: 'macbook',
    description: 'A bold lime campaign with an expansive laptop, diagonal foreground phone and an independent companion tablet.',
    tags: ['MacBook', 'iPad', 'iPhone', 'lime', 'green', 'campaign', 'digital'],
    deviceLayers: [device('Laptop / Hero', 'macbook', 'lime-campaign', 478, 734, -0.65, 731, 13, 13, -5, 0.64),
      device('Tablet / Companion', 'ipad', 'neon-portfolio', 866, 800, 0.2, 228, 8, -19, -10, 0.9),
      device('Phone / Foreground', 'iphone-17-pro', 'lime-mobile', 430, 991, 1.4, 207, 14, -14, 29, 1.16)],
    textLayers: [...masthead('06', 'THE VISIBILITY ISSUE', lime),
      copy('Headline setup', 'Make your brand', 75, 194, 947, 62, white, 0.3),
      copy('Headline first line', 'Impossible', 67, 264, 971, 123, white, 0.46),
      copy('Headline second line', 'to ignore.', 67, 385, 970, 124, lime, 0.64),
      ...footer('06', 'BE SEEN. BE REMEMBERED.', lime)],
    imageLayers: [...atmosphere('lime', 'grid'),
      panel('UI / Campaign signal', 'campaign-signal', 813, 584, 226, 145, 0.75, 1.38, 13, -5),
      panel('UI / Conversion metric', 'campaign-metric', 171, 968, 220, 167, 0.55, 1.65, 13, -5)],
  },
];
