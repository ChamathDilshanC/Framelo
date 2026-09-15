export const THEMES = ["dark", "light"] as const;
/** What is actually painted. */
export type Theme = (typeof THEMES)[number];

export const THEME_PREFERENCES = ["system", "dark", "light"] as const;
/**
 * What the user chose.
 *
 * Distinct from `Theme` because "system" is a standing instruction, not a
 * colour: it has to keep resolving as the OS setting changes, so it cannot be
 * collapsed into whichever theme happened to be active when it was picked.
 */
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const THEME_STORAGE_KEY = "framelo:theme";
export const DEFAULT_THEME: Theme = "dark";
export const DEFAULT_PREFERENCE: ThemePreference = "system";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as readonly string[]).includes(value);
}

/**
 * Applies a theme to the document.
 *
 * One attribute on `<html>`; the palette in `globals.css` does the rest. No
 * React re-render, no second stylesheet, no per-component branching.
 */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

/**
 * The OS-level preference.
 *
 * Framelo is a dark-first tool, so this only pulls to light when the
 * preference is explicit — an unknown or unsupported result stays dark rather
 * than guessing.
 */
export function systemTheme(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return DEFAULT_THEME;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : DEFAULT_THEME;
}

export function resolveTheme(preference: ThemePreference): Theme {
  return preference === "system" ? systemTheme() : preference;
}

/**
 * Runs before first paint, from a blocking inline script in the document head.
 *
 * Without this the page paints dark, hydrates, and then snaps to light — a
 * flash that is worse than having no light theme at all. It has to be inline
 * and synchronous: a module import would already be too late.
 *
 * Kept deliberately tiny and defensive. It runs before anything else on the
 * page, so a throw here would be a blank screen; a browser with storage
 * disabled must simply get the default. Anything that is not an explicit
 * "light" or "dark" — including "system", an absent key and a corrupted one —
 * resolves through the OS preference, which is exactly the intended behaviour
 * for each of those cases.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t!=="light"&&t!=="dark"){t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})()`;
