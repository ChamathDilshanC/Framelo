"use client";

import { create } from "zustand";

import { validatePatternCss } from "@/engine/background/css-safety";
import { createId } from "@/lib/id";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { UserPatternRow } from "@/lib/supabase/types";
import { useAuthStore } from "@/store/auth-store";
import type { SafePatternCss, SavedPattern } from "@/types/pattern";

/**
 * "My patterns" — saved backgrounds.
 *
 * Local-first, like everything else: a guest's patterns live in
 * `localStorage` and keep working with no account. Signing in syncs them up and
 * pulls the rest down, so the same library follows the user between machines.
 */

const FAVORITES_KEY = "framelo:pattern-favorites";
const SAVED_KEY = "framelo:saved-patterns";

interface PatternStoreState {
  favorites: string[];
  saved: SavedPattern[];
  hydrated: boolean;

  hydrate: () => Promise<void>;
  toggleFavorite: (patternId: string) => void;
  savePattern: (input: { name: string; css: SafePatternCss; opacity: number }) => Promise<SavedPattern>;
  removeSaved: (id: string) => Promise<void>;
}

export const usePatternStore = create<PatternStoreState>((set, get) => ({
  favorites: [],
  saved: [],
  hydrated: false,

  async hydrate() {
    if (get().hydrated) return;

    const favorites = readJson<string[]>(FAVORITES_KEY) ?? [];
    const local = readJson<SavedPattern[]>(SAVED_KEY) ?? [];
    set({ favorites, saved: local, hydrated: true });

    const supabase = getSupabaseClient();
    const userId = useAuthStore.getState().user?.id;
    if (!supabase || !userId) return;

    const { data } = await supabase
      .from("user_patterns")
      .select("id,name,category,background_color,background_image,background_size,background_position,opacity,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (!data) return;

    const remote = (data as UserPatternRow[]).map(fromRow);
    // Remote wins on id; local-only entries stay so an offline save is not lost.
    const remoteIds = new Set(remote.map((entry) => entry.id));
    const merged = [...remote, ...get().saved.filter((entry) => !remoteIds.has(entry.id))];

    set({ saved: merged });
    writeJson(SAVED_KEY, merged);
  },

  toggleFavorite(patternId) {
    const next = get().favorites.includes(patternId)
      ? get().favorites.filter((id) => id !== patternId)
      : [...get().favorites, patternId];

    set({ favorites: next });
    writeJson(FAVORITES_KEY, next);
  },

  async savePattern({ name, css, opacity }) {
    // Validated again here: this is the boundary where a value becomes durable
    // and might be re-rendered by a future version of the app.
    const { css: safe } = validatePatternCss(css);

    const pattern: SavedPattern = {
      id: createId("pat"),
      name: name.trim() || "Custom pattern",
      category: "custom",
      css: safe,
      opacity,
      createdAt: new Date().toISOString(),
      local: true,
    };

    const next = [pattern, ...get().saved];
    set({ saved: next });
    writeJson(SAVED_KEY, next);

    const supabase = getSupabaseClient();
    const userId = useAuthStore.getState().user?.id;
    if (!supabase || !userId) return pattern;

    const { data, error } = await supabase
      .from("user_patterns")
      .insert({
        user_id: userId,
        name: pattern.name,
        category: pattern.category,
        background_color: safe.backgroundColor ?? null,
        background_image: safe.backgroundImage ?? null,
        background_size: safe.backgroundSize ?? null,
        background_position: safe.backgroundPosition ?? null,
        opacity,
      })
      .select("id,name,category,background_color,background_image,background_size,background_position,opacity,created_at")
      .single();

    // A failed sync is not a failed save: the pattern is already in the local
    // library and will be pushed again on the next hydrate.
    if (error || !data) return pattern;

    const stored = fromRow(data as UserPatternRow);
    const replaced = get().saved.map((entry) => (entry.id === pattern.id ? stored : entry));
    set({ saved: replaced });
    writeJson(SAVED_KEY, replaced);
    return stored;
  },

  async removeSaved(id) {
    const next = get().saved.filter((entry) => entry.id !== id);
    set({ saved: next });
    writeJson(SAVED_KEY, next);

    const supabase = getSupabaseClient();
    if (!supabase || id.startsWith("pat_")) return;
    await supabase.from("user_patterns").delete().eq("id", id);
  },
}));

function fromRow(row: UserPatternRow): SavedPattern {
  return {
    id: row.id,
    name: row.name,
    category: "custom",
    css: {
      backgroundColor: row.background_color ?? undefined,
      backgroundImage: row.background_image ?? undefined,
      backgroundSize: row.background_size ?? undefined,
      backgroundPosition: row.background_position ?? undefined,
    },
    opacity: row.opacity,
    createdAt: row.created_at,
  };
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
    /* a full or disabled store must not break the editor */
  }
}
