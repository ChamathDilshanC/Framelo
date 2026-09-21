import type { ProjectTemplate, TemplateTextSpec } from "./project-templates";

// Poster coordinates make the editorial spacing explicit. The standard front
// camera sees 4.36 world units vertically at z=0; type uses 248 pixels/unit.
const unit = 4.36 / 1350;
function label(name: string, content: string, x: number, y: number, width: number, size: number,
  options: { weight?: number; color?: string; lineHeight?: number; start?: number; end?: number; opacity?: number; z?: number } = {}): TemplateTextSpec {
  const z = options.z ?? 0.05;
  const depth = (7.6 - z) / 7.6;
  const fontSize = size * unit * 248 * depth;
  const lineHeight = options.lineHeight ?? 1.35;
  const transform = { x: (x + width / 2 - 540) * unit * depth,
    y: (675 - y - content.split("\n").length * size * lineHeight / 2) * unit * depth,
    z, opacity: options.opacity ?? 1 };
  const color = options.color ?? "#f3ddc9";
  return { name, content, transform,
    style: { fontId: "inter", fontWeight: options.weight ?? 400, fontSize, lineHeight,
      letterSpacing: size > 45 ? -fontSize * 0.045 : -fontSize * 0.025,
      textAlign: "left", boxMode: "fixed", boxWidth: Math.max(40, width * unit * 248 * depth),
      fill: { type: "solid", color, gradient: { from: color, to: color, angle: 0 } } },
    entrance: { start: options.start ?? 1.5, end: options.end ?? 2.8,
      from: { y: transform.y - 0.055, opacity: 0 } } };
}

export const NEBULA_TEMPLATE: ProjectTemplate = {
  id: "nebula-music-experience", name: "Nebula Music Experience",
  description: "Editorial music-app showcase with bold typography and cinematic device presentation.",
  category: "mobile", canvas: { width: 1080, height: 1350, fps: 60, duration: 6 },
  deviceId: "iphone-17-pro", finish: "black", cameraView: "front", posterTime: 3,
  motionPresetIds: [], tags: ["music", "editorial", "cinematic", "portrait"],
  background: { type: "pattern", patternId: null, name: "Nebula / molten orange", opacity: 1,
    css: { backgroundColor: "#f24705", backgroundImage: "radial-gradient(ellipse at 0% 0%, #210100 0%, transparent 48%), radial-gradient(ellipse at 100% 0%, #8f0905 0%, transparent 40%), radial-gradient(ellipse at 62% 37%, #ff650b 0%, transparent 57%), radial-gradient(ellipse at 28% 110%, #f4d18c 0%, #edc78b 24%, transparent 64%), linear-gradient(165deg, #8f0905 0%, #f24705 41%, #ff650b 72%, #edc78b 100%)" } },
  deviceLayers: [{ name: "Nebula / iPhone 17 Pro", screenArtwork: "nebula", shadowIntensity: 0,
    transform: { x: 0, y: -0.025, z: 0, scaleX: 0.64, scaleY: 0.64, scaleZ: 0.64 },
    entrance: { start: 0.8, end: 2, from: { y: -0.23, scaleX: 0.5888, scaleY: 0.5888, scaleZ: 0.5888, opacity: 0 } } }],
  imageLayers: [
    { name: "Background / breathing glow", src: "/templates/nebula/glow.svg", width: 4, height: 5,
      transform: { z: -0.6, opacity: 0.08 },
      entrance: { start: 0.3, end: 1.2, from: { opacity: 0, scaleX: 1.08, scaleY: 1.08 },
        drift: { start: 3, to: { opacity: 0.095, scaleX: 1.015, scaleY: 1.015 } } } },
    { name: "Hand / warm silhouette", src: "/templates/nebula/hand.svg", width: 3.6, height: 4.5,
      transform: { x: 0, y: 0, z: -0.24 }, entrance: { start: 1, end: 2.2, from: { x: -0.13, y: -0.2, opacity: 0 } } },
    ...["previous", "pause", "next"].map((icon, index) => ({ name: `Control / ${icon}`,
      src: `/templates/nebula/${icon}.svg`, width: 0.20, height: 0.20,
      transform: { x: 1.46, y: -1.43 - index * 0.22, z: 0.05 },
      entrance: { start: 1.8 + index * 0.15, end: 2.7 + index * 0.15, from: { x: 1.5, opacity: 0 } } })),
  ],
  textLayers: [
    label("NEBULA / background", "NEBULA", -15, 706, 1110, 268, { weight: 700, opacity: 0.23, z: -0.4, lineHeight: 1, start: 1.3, end: 2.5 }),
    label("Headline", "The future of\nmusic listening\nexperience", 50, 141, 625, 74, { weight: 700, lineHeight: 0.98, start: 0.4, end: 1.5 }),
    label("Description", "Redefines what a\nmusic app can be—\ntransforming passive\nlistening into an\nimmersive, interactive\nexperience.", 723, 151, 310, 28, { lineHeight: 1.16, start: 0.6, end: 1.7 }),
    label("Discipline", "UI/UX\nMobile App", 52, 23, 180, 11, { opacity: 0.65 }),
    label("Category", "Category\nMusic App", 357, 23, 190, 11, { opacity: 0.65, start: 1.6 }),
    label("Project duration", "Project Duration\n4 Weeks", 658, 23, 200, 11, { opacity: 0.65, start: 1.7 }),
    label("Framelo monogram", "F/\n/M", 989, 22, 45, 18, { lineHeight: 0.85, weight: 500 }),
    label("Project name", "Nebula\nMusic App", 52, 460, 190, 12),
    label("Date", "Jun 17\n2025", 994, 460, 70, 12, { start: 1.7 }),
    label("Project type", "Project Type:\nExperimental", 220, 597, 170, 12, { color: "#311707", start: 1.8 }),
    label("Process", "Research\nWireframing\nDesigning\nPrototyping", 723, 1080, 180, 12, { color: "#271708", lineHeight: 1.8, start: 1.9 }),
    label("Location", "Location:\nKerala, India", 723, 1250, 200, 12, { color: "#271708", start: 2 }),
  ],
};
