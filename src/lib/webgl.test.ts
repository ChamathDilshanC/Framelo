import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("WebGL availability", () => {
  it("probes once across repeated render checks and releases the probe context", async () => {
    const loseContext = vi.fn();
    const getExtension = vi.fn(() => ({ loseContext }));
    const getContext = vi.fn(() => ({ getExtension }));
    const createElement = vi.fn(() => ({ getContext }));
    vi.stubGlobal("document", { createElement });
    const { canCreateWebGL } = await import("./webgl");

    for (let i = 0; i < 100; i++) expect(canCreateWebGL()).toBe(true);

    expect(createElement).toHaveBeenCalledTimes(1);
    expect(getContext).toHaveBeenCalledExactlyOnceWith("webgl2");
    expect(getExtension).toHaveBeenCalledExactlyOnceWith("WEBGL_lose_context");
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  it("does not treat WebGL 1 as support for the WebGL 2 renderer", async () => {
    const getContext = vi.fn((type: string) => type === "webgl" ? {} : null);
    vi.stubGlobal("document", { createElement: () => ({ getContext }) });
    const { canCreateWebGL } = await import("./webgl");

    expect(canCreateWebGL()).toBe(false);
    expect(canCreateWebGL()).toBe(false);
    expect(getContext).toHaveBeenCalledExactlyOnceWith("webgl2");
  });

  it("caches a failed probe instead of repeatedly allocating canvases", async () => {
    const createElement = vi.fn(() => { throw new Error("Context unavailable"); });
    vi.stubGlobal("document", { createElement });
    const { canCreateWebGL } = await import("./webgl");

    expect(canCreateWebGL()).toBe(false);
    expect(canCreateWebGL()).toBe(false);
    expect(createElement).toHaveBeenCalledTimes(1);
  });

  it("supports browsers without the optional context release extension", async () => {
    vi.stubGlobal("document", { createElement: () => ({
      getContext: () => ({ getExtension: () => null }),
    }) });
    const { canCreateWebGL } = await import("./webgl");
    expect(canCreateWebGL()).toBe(true);
  });

  it("does not cache the server snapshot as browser support", async () => {
    vi.stubGlobal("document", undefined);
    const { canCreateWebGL } = await import("./webgl");
    expect(canCreateWebGL()).toBe(true);

    vi.stubGlobal("document", { createElement: () => ({ getContext: () => null }) });
    expect(canCreateWebGL()).toBe(false);
  });
});
