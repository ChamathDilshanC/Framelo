export const APP_NAME = "Framelo";
export const APP_TAGLINE = "Create. Animate. Showcase.";

/** Upload limits. Mirrors architecture.md §38 (images 25 MB). */
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const LARGE_IMAGE_WARNING_BYTES = 8 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const ACCEPTED_IMAGE_EXTENSIONS = ".png,.jpg,.jpeg,.webp";
export const ACCEPTED_MEDIA_EXTENSIONS = ".png,.jpg,.jpeg,.webp,.mp4,.webm";
export const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm"] as const;
export const MAX_VIDEO_BYTES = 150 * 1024 * 1024;

export const AUTOSAVE_DEBOUNCE_MS = 1200;
/** Consecutive edits to the same control merge into one history entry. */
export const HISTORY_COALESCE_MS = 700;
export const HISTORY_LIMIT = 100;

export const MIN_DURATION = 0.5;
export const MAX_DURATION = 60;

export const FPS_OPTIONS = [24, 30, 60] as const;

export const CANVAS_PRESETS = [
  { id: "youtube", name: "Landscape", detail: "1920 × 1080", width: 1920, height: 1080 },
  { id: "square", name: "Square", detail: "1080 × 1080", width: 1080, height: 1080 },
  { id: "story", name: "Story", detail: "1080 × 1920", width: 1080, height: 1920 },
  { id: "portrait", name: "Portrait", detail: "1080 × 1350", width: 1080, height: 1350 },
] as const;

export const EXPORT_RESOLUTIONS = [
  { id: "720p", label: "720p", scale: 0.6667 },
  { id: "1080p", label: "1080p", scale: 1 },
  { id: "1440p", label: "1440p", scale: 1.3333 },
  { id: "2160p", label: "4K", scale: 2 },
] as const;

export type ExportResolutionId = (typeof EXPORT_RESOLUTIONS)[number]["id"];

/** Transform control ranges, shared by sliders and numeric inputs. */
export const TRANSFORM_RANGES = {
  position: { min: -10, max: 10, step: 0.01 },
  rotation: { min: -360, max: 360, step: 1 },
  scale: { min: 0.05, max: 3, step: 0.01 },
  opacity: { min: 0, max: 1, step: 0.01 },
} as const;
