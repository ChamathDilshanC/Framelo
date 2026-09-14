import * as THREE from "three";

import type { DeviceAppearance, DeviceFinish, MaterialRole } from "@/types/device";

/**
 * `DeviceMaterialController` — device appearance, applied to real PBR materials.
 *
 * Two rules shape this whole file:
 *
 * 1. **Never mutate a shared material.** Imported GLB materials are shared
 *    across every instance cloned from the cached scene. The controller is
 *    handed materials that were already cloned per instance, and it records
 *    each one's original values so a finish can always be re-derived from the
 *    import rather than compounded on the last finish.
 *
 * 2. **Never recolour what isn't the body.** Screens, camera glass, lenses and
 *    sensors are classified out by role. A gold finish should reach the rail
 *    and the back panel and stop there — recolouring a lens is the difference
 *    between a product render and a toy.
 */

/**
 * Materials whose look must survive every finish.
 *
 * The logo is deliberately *not* here. It was, and on a model that ships in a
 * strong colour that left a cosmic-orange Apple mark sitting on a graphite
 * body. On real hardware the logo is an inlay of the same finish as the back —
 * what separates it is its polish, which lives in roughness and metalness and
 * survives recolouring untouched.
 */
const PROTECTED_ROLES: ReadonlySet<MaterialRole> = new Set<MaterialRole>([
  "screen",
  "glass",
  "lens",
  "sensor",
]);

/**
 * Name fragments that identify a material's role.
 *
 * Checked longest-context-first: "camera glass" must classify as glass before
 * "camera" alone reaches the lens rule.
 */
const ROLE_HINTS: Array<[MaterialRole, RegExp]> = [
  ["screen", /screen|oled|display|lcd/i],
  ["glass", /glass|sapphire|cover|crystal|lens\s*in|lensin/i],
  ["lens", /lens|camera|optic|telephoto|ultrawide/i],
  ["sensor", /sensor|flash|led|mic|speaker|antenna|antena|port|mesh|grill/i],
  ["logo", /logo|brand|apple/i],
  ["button", /button|switch|key|crown|volume|power/i],
  ["frame", /frame|rail|edge|chamfer|band|side|metal|aluminium|aluminum|titanium|steel/i],
  ["body", /body|back|panel|base|shell|case|cover|basecolor|material/i],
];

export interface ManagedMaterial {
  material: THREE.MeshStandardMaterial;
  role: MaterialRole;
  /** The import's own values, never overwritten. */
  baseColor: THREE.Color;
  baseRoughness: number;
  baseMetalness: number;
}

/**
 * Classify a material by name.
 *
 * Name-based, because that is the only signal these GLBs carry — they have no
 * roles, tags or extras. Anything unrecognised is treated as body, which is the
 * safe default: a body material that should have been a frame still looks
 * right, whereas guessing "glass" would silently exclude it from every finish.
 */
export function classifyMaterial(name: string): MaterialRole {
  for (const [role, pattern] of ROLE_HINTS) {
    if (pattern.test(name)) return role;
  }
  return "body";
}

export class DeviceMaterialController {
  private readonly managed: ManagedMaterial[] = [];

  /**
   * Register a cloned material.
   *
   * `role` may be forced by a device definition when a name is misleading —
   * several of these models call the display bezel "Camera".
   */
  register(material: THREE.Material, forcedRole?: MaterialRole): void {
    if (!isStandard(material)) return;

    this.managed.push({
      material,
      role: forcedRole ?? classifyMaterial(material.name),
      baseColor: material.color.clone(),
      baseRoughness: material.roughness,
      baseMetalness: material.metalness,
    });
  }

  /** Roles present on this device, so the UI can say what a finish will touch. */
  roles(): MaterialRole[] {
    return [...new Set(this.managed.map((entry) => entry.role))];
  }

  /**
   * Apply an appearance.
   *
   * Always recomputed from the recorded originals, so finishes can be switched
   * back and forth indefinitely without drifting, and every map the model
   * ships with — brushed-metal normals, roughness variation — keeps working.
   */
  apply(finish: DeviceFinish, appearance: DeviceAppearance): void {
    const custom = appearance.finish === "custom" ? parseColor(appearance.bodyColor) : null;
    const tint = custom ?? new THREE.Color(finish.tint);
    const mix = custom ? 0.82 : finish.mix;

    for (const entry of this.managed) {
      if (PROTECTED_ROLES.has(entry.role)) continue;

      const target = this.targetFor(entry, tint, finish, custom !== null);
      const weight = mix * this.weightFor(entry, custom !== null, finish);

      blendSrgb(entry.material.color, entry.baseColor, target, clamp01(weight));
      entry.material.roughness = clamp01(entry.baseRoughness * finish.roughness);
      entry.material.metalness = clamp01(entry.baseMetalness * finish.metalness);
      entry.material.needsUpdate = true;
    }
  }

  /**
   * Buttons and rails read as slightly darker, harder metal than the back
   * panel on real hardware; matching that keeps a custom colour from flattening
   * the device into a single painted block.
   */
  private targetFor(
    entry: ManagedMaterial,
    tint: THREE.Color,
    finish: DeviceFinish,
    isCustom: boolean,
  ): THREE.Color {
    if (!isCustom && !finish.shadeParts) return tint;

    const shaded = tint.clone();
    if (entry.role === "button") shaded.multiplyScalar(0.82);
    else if (entry.role === "frame") shaded.multiplyScalar(0.94);
    return shaded;
  }

  /**
   * How hard a given material is pulled towards the finish.
   *
   * A finish the user picked by name — Dark, Gold, a custom colour — is a
   * request, so it lands in full. It has to work the same on a model that
   * shipped white as on one that shipped near-black; weighting it by the
   * material's existing colour made "Dark" a 2% change on a white phone.
   *
   * Only "Natural" adapts, because that finish means something different:
   * keep the model's own colour and merely lift it out of silhouette. There,
   * near-black parts are pulled up hardest and bright ones left alone.
   */
  private weightFor(entry: ManagedMaterial, isCustom: boolean, finish: DeviceFinish): number {
    if (isCustom || !finish.adaptive) return 1;

    const { baseColor } = entry;
    const luminance = 0.2126 * baseColor.r + 0.7152 * baseColor.g + 0.0722 * baseColor.b;
    return luminance < 0.6 ? 1 - luminance / 0.6 : 0.12;
  }

  /** Restore every material to exactly how it was imported. */
  reset(): void {
    for (const entry of this.managed) {
      entry.material.color.copy(entry.baseColor);
      entry.material.roughness = entry.baseRoughness;
      entry.material.metalness = entry.baseMetalness;
      entry.material.needsUpdate = true;
    }
  }

  /** Materials are owned by the instance that cloned them, not by this class. */
  clear(): void {
    this.managed.length = 0;
  }
}

const BLEND_FROM = new THREE.Color();
const BLEND_TO = new THREE.Color();

/**
 * Blend two colours the way they look, not the way light adds up.
 *
 * Three.js keeps colours linear, and `Color.lerp` blends there. That is right
 * for mixing light, but wrong for mixing a *choice*: linear-blending 85% from
 * white towards near-black lands on a mid grey, so "Dark" on a white phone came
 * out visibly grey. Interpolating in sRGB makes the weight mean what someone
 * picking a finish expects it to mean.
 */
function blendSrgb(out: THREE.Color, from: THREE.Color, to: THREE.Color, alpha: number): void {
  BLEND_FROM.copy(from).convertLinearToSRGB();
  BLEND_TO.copy(to).convertLinearToSRGB();
  out.setRGB(
    BLEND_FROM.r + (BLEND_TO.r - BLEND_FROM.r) * alpha,
    BLEND_FROM.g + (BLEND_TO.g - BLEND_FROM.g) * alpha,
    BLEND_FROM.b + (BLEND_TO.b - BLEND_FROM.b) * alpha,
  );
  out.convertSRGBToLinear();
}

function isStandard(material: THREE.Material): material is THREE.MeshStandardMaterial {
  return (material as THREE.MeshStandardMaterial).isMeshStandardMaterial === true;
}

function parseColor(value: string | undefined): THREE.Color | null {
  if (!value || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return null;
  return new THREE.Color(value);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
