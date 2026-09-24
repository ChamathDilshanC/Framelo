import { describe, expect, it, vi } from "vitest";
import { watchWebGLContext } from "./webgl-context";

describe("viewport context recovery", () => {
  it("opts into restoration and rebuilds once for each interrupted context", () => {
    const canvas = new EventTarget();
    const onLost = vi.fn();
    const onRestored = vi.fn();
    const cleanup = watchWebGLContext(canvas, onLost, onRestored);

    canvas.dispatchEvent(new Event("webglcontextrestored"));
    expect(onRestored).not.toHaveBeenCalled();
    const lost = new Event("webglcontextlost", { cancelable: true });
    canvas.dispatchEvent(lost);
    canvas.dispatchEvent(new Event("webglcontextlost"));
    expect(lost.defaultPrevented).toBe(true);
    expect(onLost).toHaveBeenCalledTimes(1);
    canvas.dispatchEvent(new Event("webglcontextrestored"));
    canvas.dispatchEvent(new Event("webglcontextrestored"));
    expect(onRestored).toHaveBeenCalledTimes(1);

    canvas.dispatchEvent(new Event("webglcontextlost"));
    canvas.dispatchEvent(new Event("webglcontextrestored"));
    expect(onLost).toHaveBeenCalledTimes(2);
    expect(onRestored).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it("ignores late events from an unmounted or replaced canvas", () => {
    const canvas = new EventTarget();
    const onLost = vi.fn();
    const onRestored = vi.fn();
    const cleanup = watchWebGLContext(canvas, onLost, onRestored);
    canvas.dispatchEvent(new Event("webglcontextlost"));
    cleanup();
    canvas.dispatchEvent(new Event("webglcontextrestored"));
    canvas.dispatchEvent(new Event("webglcontextlost"));
    expect(onLost).toHaveBeenCalledTimes(1);
    expect(onRestored).not.toHaveBeenCalled();
  });
});
