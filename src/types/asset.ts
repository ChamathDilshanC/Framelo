export type AssetType = "image" | "video";

export interface Asset {
  id: string;
  type: AssetType;
  originalName: string;
  mimeType: string;
  /** Key used by the AssetStorage implementation to retrieve the binary. */
  storageKey: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  posterStorageKey?: string;
  createdAt: string;
}

/** An asset plus a browser-usable URL, resolved at runtime. */
export interface ResolvedAsset extends Asset {
  url: string;
  posterUrl?: string;
}
