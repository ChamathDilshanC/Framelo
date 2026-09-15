"use client";

import { create } from "zustand";

import {
  applyTheme,
  DEFAULT_PREFERENCE,
  DEFAULT_THEME,
  isTheme,
  isThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type Theme,
  type ThemePreference,
} from "@/lib/theme";

/**
 * The app's light/dark theme.
 *
 * Separate from the editor and project stores on purpose: this is a preference
 * about the chrome, not part of a project. Changing it must never mark a
 * project unsaved, and it follows the user across projects rather than being
 * stored in project JSON.
 *
 * The DOM is the source of truth at paint time — the inline script in the
 * layout has already set `data-theme` before React exists — so `hydrate()`
 * reads what is on screen rather than imposing a second opinion.
 */

interface ThemeStoreState {
  /** What the user chose, including the standing "follow the system" option. */
  preference: ThemePreference;
  /** What is actually painted. */
  theme: Theme;
  /** False until the client has reconciled with what the inline script chose. */
  hydrated: boolean;

  hydrate: () => void;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
}

/** Live while the preference is "system", torn down when it is not. */
let systemWatcher: (() => void) | null = null;

export const useThemeStore = create<ThemeStoreState>((set, get) => {
  /**
   * "System" is a standing instruction, so it has to keep tracking the OS
   * after it is chosen — someone on an automatic day/night schedule expects
   * the app to follow at dusk without reopening it.
   */
  function watchSystem(active: boolean): void {
    systemWatcher?.();
    systemWatcher = null;

    if (!active || typeof window === "undefined" || !window.matchMedia) return;

    const query = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if (get().preference !== "system") return;
      const theme = resolveTheme("system");
      applyTheme(theme);
      set({ theme });
    };

    query.addEventListener("change", onChange);
    systemWatcher = () => query.removeEventListener("change", onChange);
  }

  return {
    // Matches the server render, so hydration never mismatches; `hydrate()`
    // corrects it on the client if the stored preference differs.
    preference: DEFAULT_PREFERENCE,
    theme: DEFAULT_THEME,
    hydrated: false,

    hydrate() {
      if (get().hydrated) return;

      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem(THEME_STORAGE_KEY);
      } catch {
        /* storage disabled: fall through to the default preference */
      }

      const preference = isThemePreference(stored) ? stored : DEFAULT_PREFERENCE;

      // Prefer what the inline script already painted: re-resolving here could
      // disagree with it for a frame, which is the flash this all exists to
      // avoid.
      const painted = document.documentElement.dataset.theme;
      const theme = isTheme(painted) ? painted : resolveTheme(preference);

      applyTheme(theme);
      watchSystem(preference === "system");
      set({ preference, theme, hydrated: true });
    },

    setPreference(preference) {
      const theme = resolveTheme(preference);

      applyTheme(theme);
      watchSystem(preference === "system");
      set({ preference, theme, hydrated: true });

      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, preference);
      } catch {
        // A private window still gets the theme it asked for, just not next time.
      }
    },

    /** Flips what is on screen, which necessarily leaves "system" behind. */
    toggle() {
      get().setPreference(get().theme === "dark" ? "light" : "dark");
    },
  };
});

export const selectTheme = (state: ThemeStoreState) => state.theme;
export const selectThemePreference = (state: ThemeStoreState) => state.preference;
