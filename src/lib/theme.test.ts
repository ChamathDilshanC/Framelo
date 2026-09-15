import { describe, expect, it } from "vitest";

import {
  DEFAULT_PREFERENCE,
  DEFAULT_THEME,
  isTheme,
  isThemePreference,
  resolveTheme,
  THEME_INIT_SCRIPT,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  THEMES,
} from "@/lib/theme";

describe("theme", () => {
  it("defaults to dark", () => {
    // Framelo is a tool for looking at artwork; dark is the considered default,
    // not an accident of ordering.
    expect(DEFAULT_THEME).toBe("dark");
    expect(THEMES).toEqual(["dark", "light"]);
  });

  it.each(["dark", "light"])("accepts %s", (value) => {
    expect(isTheme(value)).toBe(true);
  });

  it.each([["sepia"], [""], [null], [undefined], [1], [{}]])("rejects %s", (value) => {
    expect(isTheme(value)).toBe(false);
  });
});

describe("theme preference", () => {
  it("defaults to following the system", () => {
    expect(DEFAULT_PREFERENCE).toBe("system");
    expect(THEME_PREFERENCES).toEqual(["system", "dark", "light"]);
  });

  it("is a wider set than the themes that can be painted", () => {
    // "system" is a standing instruction, not a colour — collapsing the two
    // would lose the ability to keep following the OS after it changes.
    expect(isThemePreference("system")).toBe(true);
    expect(isTheme("system")).toBe(false);
  });

  it("resolves an explicit preference to itself", () => {
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
  });

  it("resolves system to a paintable theme", () => {
    // jsdom reports no preference, which must still produce a real theme.
    expect(isTheme(resolveTheme("system"))).toBe(true);
  });
});

describe("the no-flash script", () => {
  /**
   * The script is inlined into the document head and runs before anything else
   * on the page, so a throw in it is a blank screen. These tests run it for
   * real against stubbed globals rather than trusting the string.
   */
  function run(options: {
    stored?: string | null;
    prefersLight?: boolean;
    throwOnStorage?: boolean;
    noMatchMedia?: boolean;
  }) {
    const root = { dataset: {} as Record<string, string> };

    const context = {
      localStorage: {
        getItem(key: string) {
          if (options.throwOnStorage) throw new Error("storage disabled");
          return key === THEME_STORAGE_KEY ? (options.stored ?? null) : null;
        },
      },
      matchMedia: options.noMatchMedia
        ? undefined
        : (query: string) => ({ matches: Boolean(options.prefersLight) && query.includes("light") }),
      document: { documentElement: root },
    };

    // `window` and the bare globals both resolve to the same object, which is
    // how the script sees them in a browser.
    const fn = new Function(
      "window",
      "localStorage",
      "document",
      `var matchMedia = window.matchMedia; ${THEME_INIT_SCRIPT}`,
    );
    fn(context, context.localStorage, context.document);

    return root.dataset.theme;
  }

  it("uses the stored preference when there is one", () => {
    expect(run({ stored: "light" })).toBe("light");
    expect(run({ stored: "dark", prefersLight: true })).toBe("dark");
  });

  it("falls back to the system preference when nothing is stored", () => {
    expect(run({ stored: null, prefersLight: true })).toBe("light");
    expect(run({ stored: null, prefersLight: false })).toBe("dark");
  });

  it("ignores a stored value that is not a theme", () => {
    // A corrupted or hand-edited entry must not leave the page unstyled.
    expect(run({ stored: "neon", prefersLight: false })).toBe("dark");
  });

  it("treats a stored \"system\" as the system preference", () => {
    // The script only knows two paintable values, so "system" falls through
    // the same branch as a missing key — which is exactly right for it.
    expect(run({ stored: "system", prefersLight: true })).toBe("light");
    expect(run({ stored: "system", prefersLight: false })).toBe("dark");
  });

  it("still sets a theme when storage throws", () => {
    // Private windows and blocked site data are normal, not exceptional.
    expect(run({ throwOnStorage: true })).toBe("dark");
  });

  it("still sets a theme without matchMedia", () => {
    expect(run({ stored: null, noMatchMedia: true })).toBe("dark");
  });

  it("always leaves the document with a theme", () => {
    for (const result of [
      run({ stored: "light" }),
      run({ stored: null }),
      run({ throwOnStorage: true }),
      run({ stored: "nonsense" }),
    ]) {
      expect(isTheme(result)).toBe(true);
    }
  });
});
