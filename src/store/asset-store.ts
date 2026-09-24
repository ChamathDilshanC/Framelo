"use client";

import { create } from "zustand";

import { createId } from "@/lib/id";
import { assetStorage } from "@/lib/storage/asset-storage";
import { projectStorage } from "@/lib/storage/project-storage";
import { notify } from "@/lib/toast";
import { validateMediaFile } from "@/lib/validation/upload";
import type { Asset, ResolvedAsset } from "@/types/asset";

/** Ships with the app so a new project has something to place immediately. */
const SAMPLE_ASSET: ResolvedAsset = {
  id: "asset_sample_reference",
  type: "image",
  originalName: "Studio reference",
  mimeType: "image/png",
  storageKey: "builtin:studio-reference",
  size: 0,
  width: 1862,
  height: 1032,
  createdAt: new Date(0).toISOString(),
  url: "/reference/studio-reference.png",
};

function isBuiltin(asset: Asset): boolean {
  return asset.storageKey.startsWith("builtin:");
}

interface AssetStoreState {
  assets: ResolvedAsset[];
  hydrated: boolean;
  uploading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  uploadFiles: (files: FileList | File[]) => Promise<ResolvedAsset[]>;
  removeAsset: (assetId: string) => Promise<void>;
  removeAllAssets: () => Promise<void>;
  getAsset: (assetId: string | null | undefined) => ResolvedAsset | null;
}

let hydration: Promise<void> | null = null;

export const useAssetStore = create<AssetStoreState>((set, get) => ({
  assets: [SAMPLE_ASSET],
  hydrated: false,
  uploading: false,
  error: null,

  async hydrate() {
    if (get().hydrated) return;
    if (hydration) return hydration;
    hydration = (async () => {
    try {
      const stored = await projectStorage.listAssets();
      const resolved = await Promise.all(
        stored.map(async (asset) => {
          const url = await assetStorage.getUrl(asset.storageKey).catch(() => null);
          if (!url) return null;
          const posterUrl = asset.posterStorageKey ? await assetStorage.getUrl(asset.posterStorageKey).catch(() => null) : null;
          return { ...asset, url, posterUrl: posterUrl ?? undefined } as ResolvedAsset;
        }),
      );

      set({
        assets: [SAMPLE_ASSET, ...resolved.filter((asset): asset is ResolvedAsset => asset !== null)],
        hydrated: true,
        error: resolved.some(asset => asset === null) ? "Some saved media files are unavailable on this device." : null,
      });
      if (resolved.some(asset => asset === null)) notify.warning("Some saved media is unavailable", "Layer assignments are preserved. Replace missing files to restore their screens.");
    } catch (error) {
      set({ hydrated: false, error: toMessage(error) });
      notify.warning(
        "Saved media could not be restored",
        "Your project is intact. Try reopening when local storage is available.",
      );
      throw error;
    }
    })().finally(() => { hydration = null; });
    return hydration;
  },

  async uploadFiles(files) {
    const list = Array.from(files);
    if (list.length === 0) return [];

    set({ uploading: true });
    const added: ResolvedAsset[] = [];

    try {
      for (const file of list) {
        const validation = validateMediaFile(file);

        if (!validation.ok) {
          notify.error("Could not upload media", validation.error);
          continue;
        }
        if (validation.warning) {
          notify.warning("Large file", validation.warning);
        }

        try {
          const storageKey = `asset/${createId("file")}`;
          await assetStorage.put(storageKey, file);
          const url = await assetStorage.getUrl(storageKey);
          if (!url) throw new Error("Stored file could not be read back");

          const isVideo = file.type.startsWith("video/");
          const videoMetadata = isVideo ? await readVideoMetadata(url) : null;
          const dimensions = isVideo ? videoMetadata : await readImageDimensions(url);
          const posterStorageKey = isVideo && videoMetadata?.poster ? `${storageKey}:poster` : undefined;
          if (posterStorageKey && videoMetadata?.poster) await assetStorage.put(posterStorageKey, videoMetadata.poster);
          const posterUrl = posterStorageKey ? await assetStorage.getUrl(posterStorageKey) : null;
          const asset: ResolvedAsset = {
            id: createId("asset"),
            type: isVideo ? "video" : "image",
            originalName: file.name,
            mimeType: file.type,
            storageKey,
            posterStorageKey,
            size: file.size,
            width: dimensions?.width,
            height: dimensions?.height,
            duration: isVideo ? videoMetadata?.duration : undefined,
            createdAt: new Date().toISOString(),
            url,
            posterUrl: posterUrl ?? undefined,
          };

          added.push(asset);
        } catch (error) {
          notify.error("Could not upload media", `${file.name}: ${toMessage(error)}`);
        }
      }

      if (added.length > 0) {
        const next = [...get().assets, ...added];
        await persist(next);
        set({ assets: next });
        notify.success(
          added.length === 1 ? "Media uploaded successfully" : `${added.length} files uploaded`,
          added.length === 1 ? added[0].originalName : undefined,
        );
      }

      return added;
    } finally {
      set({ uploading: false });
    }
  },

  async removeAsset(assetId) {
    const asset = get().assets.find((entry) => entry.id === assetId);
    if (!asset) return;

    const next = get().assets.filter((entry) => entry.id !== assetId);
    set({ assets: next });

    if (!isBuiltin(asset)) {
      try {
        await assetStorage.delete(asset.storageKey);
        if (asset.posterStorageKey) await assetStorage.delete(asset.posterStorageKey);
        await persist(next);
      } catch (error) {
        notify.error("Could not delete asset", toMessage(error));
      }
    }
  },

  async removeAllAssets() {
    const removable = get().assets.filter((asset) => !isBuiltin(asset));
    if (removable.length === 0) return;

    const previous = get().assets;
    const next = previous.filter((asset) => isBuiltin(asset));
    set({ assets: next });

    try {
      await Promise.all(
        removable.map(async (asset) => {
          await assetStorage.delete(asset.storageKey);
          if (asset.posterStorageKey) await assetStorage.delete(asset.posterStorageKey);
        }),
      );
      await persist(next);
      notify.info("All media removed", `${removable.length} file${removable.length === 1 ? "" : "s"} deleted`);
    } catch (error) {
      set({ assets: previous });
      notify.error("Could not delete media", toMessage(error));
    }
  },

  getAsset(assetId) {
    if (!assetId) return null;
    return get().assets.find((asset) => asset.id === assetId) ?? null;
  },
}));

/** Strips the runtime-only object URL before writing the asset index. */
function toStoredAsset(asset: ResolvedAsset): Asset {
  return {
    id: asset.id,
    type: asset.type,
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    storageKey: asset.storageKey,
    size: asset.size,
    width: asset.width,
    height: asset.height,
    duration: asset.duration,
    posterStorageKey: asset.posterStorageKey,
    createdAt: asset.createdAt,
  };
}

async function persist(assets: ResolvedAsset[]): Promise<void> {
  await projectStorage.saveAssets(assets.filter((asset) => !isBuiltin(asset)).map(toStoredAsset));
}

function readImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") {
      resolve(null);
      return;
    }
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export const selectAssets = (state: AssetStoreState) => state.assets;
export const selectUploading = (state: AssetStoreState) => state.uploading;

function readVideoMetadata(url: string): Promise<{ width: number; height: number; duration: number; poster?: Blob } | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    let settled = false;
    const done = (poster?: Blob) => {
      if (settled) return;
      settled = true;
      const result = video.videoWidth && video.videoHeight
        ? { width: video.videoWidth, height: video.videoHeight, duration: Number.isFinite(video.duration) ? video.duration : 0, poster }
        : null;
      video.removeAttribute("src"); video.load();
      resolve(result);
    };
    video.onerror = () => done();
    video.onloadeddata = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 240 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => done(blob ?? undefined), "image/jpeg", 0.75);
    };
    video.onloadedmetadata = () => {
      // Some browsers defer decoding until playback; seek to the first frame.
      video.currentTime = Math.min(0.001, video.duration || 0);
    };
    video.src = url;
    video.load();
    setTimeout(() => done(), 12000);
  });
}
