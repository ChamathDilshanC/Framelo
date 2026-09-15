import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_VIDEO_BYTES,
  LARGE_IMAGE_WARNING_BYTES,
  MAX_IMAGE_BYTES,
} from "@/lib/constants";

export interface UploadValidation {
  ok: boolean;
  /** Non-blocking advisory, shown as a warning toast. */
  warning?: string;
  error?: string;
}

export function validateImageFile(file: File): UploadValidation {
  const type = file.type.toLowerCase();
  if (!ACCEPTED_IMAGE_TYPES.includes(type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
    return { ok: false, error: "Please upload a PNG, JPG, or WebP image." };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: `"${file.name}" is larger than the 25 MB limit.`,
    };
  }

  if (file.size > LARGE_IMAGE_WARNING_BYTES) {
    return {
      ok: true,
      warning: "This file is larger than recommended and may slow the editor down.",
    };
  }

  return { ok: true };
}

export function validateMediaFile(file: File): UploadValidation {
  const type = file.type.toLowerCase();
  if (ACCEPTED_VIDEO_TYPES.includes(type as (typeof ACCEPTED_VIDEO_TYPES)[number])) {
    if (file.size > MAX_VIDEO_BYTES) return { ok: false, error: `"${file.name}" exceeds the 150 MB video limit.` };
    return { ok: true };
  }
  return validateImageFile(file);
}
