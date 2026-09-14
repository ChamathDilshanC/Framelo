import * as THREE from "three";

import type { DeviceModelConfig, ScreenUvTransform } from "@/types/device";
import type { ScreenFit } from "@/types/layer";

/**
 * The display surface of an imported device model.
 *
 * The screen is rendered emissive-only — base colour black, `emissiveMap` the
 * user's image, tone mapping off — so the screenshot shows at exactly its own
 * brightness regardless of the light rig, which is how a real OLED reads.
 *
 * Everything that varies per project (fit, brightness, contrast, saturation,
 * the drawn bezel) is a shader uniform rather than a redraw of the image, so
 * changing any of it costs one uniform write. The image itself is never
 * modified — no canvas re-composition, no destructive processing.
 *
 * UV pipeline, outermost first:
 *   mesh UV --[texture matrix: per-model correction]--> canvas space (0..1,
 *   portrait, top-left origin) --[inset border]--> display rect --[fit]-->
 *   image UV.
 */

const FIT_MODES: Record<ScreenFit, number> = { cover: 0, contain: 1, fill: 2 };

export interface ScreenUniforms {
  uFit: THREE.IUniform<number>;
  uImageAspect: THREE.IUniform<number>;
  uCanvasAspect: THREE.IUniform<number>;
  uBrightness: THREE.IUniform<number>;
  uContrast: THREE.IUniform<number>;
  uSaturation: THREE.IUniform<number>;
  /** Border thickness in canvas-space UV units, per axis. */
  uInset: THREE.IUniform<THREE.Vector2>;
  /** Corner radius of the inset border, in canvas-space UV units, per axis. */
  uInsetRadius: THREE.IUniform<THREE.Vector2>;
  uHasImage: THREE.IUniform<number>;
}

export interface ScreenSurface {
  material: THREE.MeshStandardMaterial;
  uniforms: ScreenUniforms;
  /** Native screen aspect (width / height) of this device. */
  canvasAspect: number;
}

export interface ScreenAppearance {
  fit: ScreenFit;
  brightness: number;
  contrast: number;
  saturation: number;
  /** Aspect of the currently assigned image, or undefined while none is set. */
  imageAspect: number | undefined;
}

const PREAMBLE = /* glsl */ `
uniform int   uFit;
uniform float uImageAspect;
uniform float uCanvasAspect;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform vec2  uInset;
uniform vec2  uInsetRadius;
uniform float uHasImage;

vec3 fl_toSrgb(vec3 c) {
  c = max(c, vec3(0.0));
  return mix(c * 12.92, 1.055 * pow(c, vec3(0.41666667)) - 0.055, step(vec3(0.0031308), c));
}

vec3 fl_toLinear(vec3 c) {
  c = max(c, vec3(0.0));
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}

/** Signed distance to a rounded box, used for the drawn bezel's inner corners. */
float fl_roundedBox(vec2 p, vec2 half_, vec2 radius) {
  vec2 r = min(radius, half_);
  vec2 q = abs(p) - half_ + r;
  // Radii differ per axis (UV space is not square), so normalise before the
  // length, then scale back — an exact ellipse-cornered box.
  vec2 outside = max(q, vec2(0.0)) / max(r, vec2(1e-6));
  return min(max(q.x, q.y), 0.0) + (length(outside) - 1.0) * min(r.x, r.y);
}
`;

/**
 * Replaces three's emissive-map lookup with the screen pipeline. Everything
 * outside the display rect resolves to black, which is what makes the drawn
 * bezel and "contain" letterboxing read as real screen-off glass.
 */
const EMISSIVE_FRAGMENT = /* glsl */ `
#ifdef USE_EMISSIVEMAP
vec2 fl_canvasUv = vEmissiveMapUv;
vec3 fl_screen = vec3(0.0);

if (uHasImage > 0.5 &&
    fl_canvasUv.x >= 0.0 && fl_canvasUv.x <= 1.0 &&
    fl_canvasUv.y >= 0.0 && fl_canvasUv.y <= 1.0) {

  vec2 fl_span = max(vec2(1e-4), vec2(1.0) - 2.0 * uInset);
  vec2 fl_inner = (fl_canvasUv - uInset) / fl_span;

  float fl_mask = 1.0;
  if (uInset.x > 0.0 || uInset.y > 0.0) {
    float fl_d = fl_roundedBox(fl_inner - 0.5, vec2(0.5), uInsetRadius / fl_span);
    // One-pixel feather so the drawn corners are not aliased.
    fl_mask = 1.0 - smoothstep(-0.0015, 0.0015, fl_d);
  }

  if (fl_mask > 0.0) {
    float fl_ratio = uImageAspect / max(1e-4, uCanvasAspect);
    vec2 fl_scale = vec2(1.0);
    if (uFit == 0) {
      fl_scale = fl_ratio > 1.0 ? vec2(1.0 / fl_ratio, 1.0) : vec2(1.0, fl_ratio);
    } else if (uFit == 1) {
      fl_scale = fl_ratio > 1.0 ? vec2(1.0, fl_ratio) : vec2(1.0 / fl_ratio, 1.0);
    }

    vec2 fl_imageUv = (fl_inner - 0.5) * fl_scale + 0.5;

    // "contain" samples beyond the image; those pixels are the letterbox.
    if (fl_imageUv.x >= 0.0 && fl_imageUv.x <= 1.0 &&
        fl_imageUv.y >= 0.0 && fl_imageUv.y <= 1.0) {
      vec3 fl_c = fl_toSrgb(texture2D(emissiveMap, fl_imageUv).rgb);

      // Brightness -> contrast -> saturation, matching how these read as photo
      // adjustments, applied per fragment so nothing is baked into the image.
      fl_c *= uBrightness;
      fl_c = (fl_c - 0.5) * uContrast + 0.5;
      float fl_luma = dot(fl_c, vec3(0.2126, 0.7152, 0.0722));
      fl_c = mix(vec3(fl_luma), fl_c, uSaturation);

      fl_screen = fl_toLinear(clamp(fl_c, 0.0, 1.0)) * fl_mask;
    }
  }
}

totalEmissiveRadiance *= fl_screen;
#else
// No image assigned: the display is simply off.
totalEmissiveRadiance *= vec3(0.0);
#endif
`;

/**
 * Build the display material for a device model.
 *
 * A fresh material rather than a patched import: the original screen material
 * carries a baked wallpaper, a metalness/roughness map and a mirror finish,
 * all of which have to be undone before a screenshot reads correctly.
 */
export function createScreenMaterial(model: DeviceModelConfig): ScreenSurface {
  const [pixelWidth, pixelHeight] = model.screenPixels;
  const canvasAspect = pixelWidth / pixelHeight;

  const inset = model.inset
    ? new THREE.Vector2(model.inset.border / pixelWidth, model.inset.border / pixelHeight)
    : new THREE.Vector2(0, 0);
  const insetRadius = model.inset
    ? new THREE.Vector2(model.inset.radius / pixelWidth, model.inset.radius / pixelHeight)
    : new THREE.Vector2(0, 0);

  const uniforms: ScreenUniforms = {
    uFit: { value: FIT_MODES.cover },
    uImageAspect: { value: canvasAspect },
    uCanvasAspect: { value: canvasAspect },
    uBrightness: { value: 1 },
    uContrast: { value: 1 },
    uSaturation: { value: 1 },
    uInset: { value: inset },
    uInsetRadius: { value: insetRadius },
    uHasImage: { value: 0 },
  };

  const material = new THREE.MeshStandardMaterial({
    name: "framelo-screen",
    color: 0x000000,
    emissive: 0xffffff,
    emissiveIntensity: 1,
    metalness: 0,
    roughness: 1,
    envMapIntensity: 0,
    // The screenshot must survive tone mapping unchanged, or a bright UI is
    // pulled grey by the filmic curve.
    toneMapped: false,
    // Several of these display meshes are authored double-sided; their inner
    // face sits inside the body, so this only matches the import.
    side: THREE.DoubleSide,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace("void main() {", `${PREAMBLE}\nvoid main() {`)
      .replace("#include <emissivemap_fragment>", EMISSIVE_FRAGMENT);
  };
  // Every screen material injects the same code, so they may share a program;
  // the uniforms above stay per-material either way.
  material.customProgramCacheKey = () => "framelo-screen";

  material.userData.uvCorrection = resolveScreenUvCorrection(model.uv);

  return { material, uniforms, canvasAspect };
}

/** The per-model UV correction, as the four fields a texture matrix is built from. */
interface ScreenUvCorrection {
  center: THREE.Vector2;
  rotation: number;
  repeat: THREE.Vector2;
  offset: THREE.Vector2;
}

/**
 * Resolve the per-model UV correction.
 *
 * It rides on the texture matrix rather than the shader, so it costs nothing
 * per fragment and is re-stamped onto whatever texture arrives.
 */
function resolveScreenUvCorrection(uv: ScreenUvTransform | undefined): ScreenUvCorrection {
  if (uv?.repeat) {
    // An exact affine remap for meshes whose visible face does not span 0..1.
    // `center` must stay at the origin: setUvTransform folds a non-zero centre
    // into the matrix even at rotation 0.
    return {
      center: new THREE.Vector2(0, 0),
      rotation: 0,
      repeat: new THREE.Vector2(uv.repeat[0], uv.repeat[1]),
      offset: new THREE.Vector2(uv.offset?.[0] ?? 0, uv.offset?.[1] ?? 0),
    };
  }

  return {
    center: new THREE.Vector2(0.5, 0.5),
    rotation: uv?.rotation ?? 0,
    repeat: new THREE.Vector2(uv?.mirrorX ? -1 : 1, 1),
    offset: new THREE.Vector2(uv?.offset?.[0] ?? 0, uv?.offset?.[1] ?? 0),
  };
}

/**
 * Point the screen at a texture.
 *
 * The model is never reloaded for this: only `emissiveMap` changes, and the
 * caller keeps owning the texture's lifetime. The per-model UV correction is
 * re-stamped onto whatever texture arrives.
 */
export function setScreenTexture(
  surface: ScreenSurface,
  texture: THREE.Texture | null,
  imageAspect: number | undefined,
): void {
  const { material, uniforms } = surface;

  if (material.emissiveMap === texture) {
    uniforms.uImageAspect.value = imageAspect ?? surface.canvasAspect;
    return;
  }

  material.emissiveMap = texture;
  uniforms.uHasImage.value = texture ? 1 : 0;
  uniforms.uImageAspect.value = imageAspect ?? surface.canvasAspect;

  if (texture) {
    const correction = material.userData.uvCorrection as ScreenUvCorrection;
    // glTF UVs put the origin top-left, the opposite of three's image default.
    // The loader hands these textures over already flipped to match.
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.center.copy(correction.center);
    texture.rotation = correction.rotation;
    texture.repeat.copy(correction.repeat);
    texture.offset.copy(correction.offset);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
  }

  // Toggling the map on or off changes the shader's defines.
  material.needsUpdate = true;
}

/** Push the project's screen settings into the shader. One write each. */
export function applyScreenAppearance(
  surface: ScreenSurface,
  appearance: ScreenAppearance,
): void {
  const { uniforms } = surface;
  uniforms.uFit.value = FIT_MODES[appearance.fit] ?? FIT_MODES.cover;
  uniforms.uBrightness.value = clampFilter(appearance.brightness, 0, 3);
  uniforms.uContrast.value = clampFilter(appearance.contrast, 0, 3);
  uniforms.uSaturation.value = clampFilter(appearance.saturation, 0, 3);
  uniforms.uImageAspect.value = appearance.imageAspect ?? surface.canvasAspect;
}

function clampFilter(value: number | undefined, min: number, max: number): number {
  if (value === undefined || !Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(min, value));
}
