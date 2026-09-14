import * as THREE from "three";

interface CacheEntry {
  refCount: number;
  promise: Promise<THREE.Texture>;
}

const cache = new Map<string, CacheEntry>();
const loader = new THREE.TextureLoader();

export interface TextureOptions {
  /**
   * Orientation of the loaded image.
   *
   * Plain three.js geometry expects the default (`true`); glTF UVs put the
   * origin top-left and need `false`. Textures with different orientations are
   * cached separately, because clones share one GPU upload and so cannot
   * disagree about it.
   */
  flipY?: boolean;
}

function cacheKey(url: string, flipY: boolean): string {
  return `${flipY ? "y" : "n"}:${url}`;
}

/**
 * Reference-counted texture cache.
 *
 * Two layers pointing at the same asset share one GPU upload, and the texture
 * is only disposed when the last consumer releases it.
 */
export function acquireTexture(url: string, options: TextureOptions = {}): Promise<THREE.Texture> {
  const flipY = options.flipY ?? true;
  const key = cacheKey(url, flipY);

  const existing = cache.get(key);
  if (existing) {
    existing.refCount += 1;
    return existing.promise;
  }

  const promise = new Promise<THREE.Texture>((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = flipY;
        texture.anisotropy = 8;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      () => {
        cache.delete(key);
        reject(new Error("The image could not be loaded"));
      },
    );
  });

  cache.set(key, { refCount: 1, promise });
  return promise;
}

export function releaseTexture(url: string, options: TextureOptions = {}): void {
  const key = cacheKey(url, options.flipY ?? true);
  const entry = cache.get(key);
  if (!entry) return;

  entry.refCount -= 1;
  if (entry.refCount > 0) return;

  cache.delete(key);
  entry.promise
    .then((texture) => texture.dispose())
    .catch(() => {
      /* the load already failed, so there is nothing to dispose */
    });
}

/** Test/teardown helper. */
export function clearTextureCache(): void {
  for (const [, entry] of cache) {
    entry.promise.then((texture) => texture.dispose()).catch(() => {});
  }
  cache.clear();
}

/** A capture must include image overlays even when requested during loading. */
export async function waitForSceneTextures(): Promise<void> {
  await Promise.all([...cache.values()].map((entry) => entry.promise));
}
