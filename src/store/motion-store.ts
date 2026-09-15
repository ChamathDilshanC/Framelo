"use client";

import { create } from "zustand";

import { getMotionPreset } from "@/engine/motion/motion-presets";
import type { MotionPresetDefinition } from "@/engine/motion/preset-types";
import {
  getDeviceMotionTemplate,
  type DeviceMotionTemplate,
} from "@/engine/templates/device-motion-templates";

/**
 * Favourites and recents for the motion library.
 *
 * Local-first and deliberately unauthenticated: a preference about which
 * animations you like is not worth gating behind an account, and the library
 * has to be fully usable signed out. The shape matches the pattern store so a
 * later Supabase sync can follow the same path.
 */

const FAVORITES_KEY = "framelo:motion-favorites";
const RECENT_KEY = "framelo:motion-recent";
/**
 * Device motion templates keep their own lists.
 *
 * They are a different library with its own ids, and mixing them would make
 * "recent" a list of two kinds of thing that cannot be applied to the same
 * selection. The prefix on the ids means a shared list would even *work* —
 * which is exactly why keeping them apart has to be deliberate.
 */
const TEMPLATE_FAVORITES_KEY = "framelo:device-motion-favorites";
const TEMPLATE_RECENT_KEY = "framelo:device-motion-recent";
const RECENT_LIMIT = 5;

interface MotionStoreState {
  favorites: string[];
  recent: string[];
  templateFavorites: string[];
  templateRecent: string[];
  hydrated: boolean;

  hydrate: () => void;
  toggleFavorite: (presetId: string) => void;
  markUsed: (presetId: string) => void;
  toggleTemplateFavorite: (templateId: string) => void;
  markTemplateUsed: (templateId: string) => void;
}

export const useMotionStore = create<MotionStoreState>((set, get) => ({
  favorites: [],
  recent: [],
  templateFavorites: [],
  templateRecent: [],
  hydrated: false,

  hydrate() {
    if (get().hydrated) return;
    set({
      favorites: readJson<string[]>(FAVORITES_KEY) ?? [],
      recent: readJson<string[]>(RECENT_KEY) ?? [],
      templateFavorites: readJson<string[]>(TEMPLATE_FAVORITES_KEY) ?? [],
      templateRecent: readJson<string[]>(TEMPLATE_RECENT_KEY) ?? [],
      hydrated: true,
    });
  },

  toggleFavorite(presetId) {
    const next = get().favorites.includes(presetId)
      ? get().favorites.filter((id) => id !== presetId)
      : [...get().favorites, presetId];

    set({ favorites: next });
    writeJson(FAVORITES_KEY, next);
  },

  markUsed(presetId) {
    // Most recent first, no duplicates: reapplying a preset should move it to
    // the top rather than fill the list with the same name.
    const next = [presetId, ...get().recent.filter((id) => id !== presetId)].slice(0, RECENT_LIMIT);
    set({ recent: next });
    writeJson(RECENT_KEY, next);
  },

  toggleTemplateFavorite(templateId) {
    const current = get().templateFavorites;
    const next = current.includes(templateId)
      ? current.filter((id) => id !== templateId)
      : [...current, templateId];

    set({ templateFavorites: next });
    writeJson(TEMPLATE_FAVORITES_KEY, next);
  },

  markTemplateUsed(templateId) {
    const next = [
      templateId,
      ...get().templateRecent.filter((id) => id !== templateId),
    ].slice(0, RECENT_LIMIT);

    set({ templateRecent: next });
    writeJson(TEMPLATE_RECENT_KEY, next);
  },
}));

/** Resolve stored ids to device motion templates, dropping any that have gone. */
export function resolveDeviceMotionTemplates(ids: string[]): DeviceMotionTemplate[] {
  const resolved: DeviceMotionTemplate[] = [];

  for (const id of ids) {
    const template = getDeviceMotionTemplate(id);
    if (template) resolved.push(template);
  }

  return resolved;
}

/**
 * Resolve stored ids to presets, dropping any that no longer exist.
 *
 * Retired presets are intentionally not resolved here: a favourite pointing at
 * something the library no longer offers should quietly disappear rather than
 * reintroduce it through a side door.
 */
export function resolvePresets(ids: string[]): MotionPresetDefinition[] {
  const resolved: MotionPresetDefinition[] = [];

  for (const id of ids) {
    const preset = getMotionPreset(id);
    if (preset && !preset.tags.includes("legacy")) resolved.push(preset);
  }

  return resolved;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* a full or disabled store must not break the library */
  }
}
