import { idb } from "./idb";

/**
 * Binary storage boundary for uploaded media.
 *
 * The editor only ever talks to this interface, so swapping the browser-local
 * implementation for Supabase Storage / R2 / S3 later is a single-file change.
 */
export interface AssetStorage {
  put(key: string, blob: Blob): Promise<void>;
  /** Browser-usable URL. Callers must call `release` when they are done. */
  getUrl(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  release(key: string): void;
  releaseAll(): void;
}

class IndexedDbAssetStorage implements AssetStorage {
  private urls = new Map<string, string>();

  async put(key: string, blob: Blob): Promise<void> {
    await idb.set(key, blob);
    this.release(key);
  }

  async getUrl(key: string): Promise<string | null> {
    const cached = this.urls.get(key);
    if (cached) return cached;

    const blob = await idb.get<Blob>(key);
    if (!blob) return null;

    const url = URL.createObjectURL(blob);
    this.urls.set(key, url);
    return url;
  }

  async delete(key: string): Promise<void> {
    this.release(key);
    await idb.delete(key);
  }

  release(key: string): void {
    const url = this.urls.get(key);
    if (!url) return;
    URL.revokeObjectURL(url);
    this.urls.delete(key);
  }

  releaseAll(): void {
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.urls.clear();
  }
}

export const assetStorage: AssetStorage = new IndexedDbAssetStorage();
