import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { installStudioEnvironment, setStudioEnvironmentIntensity } from "./studio-environment";

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();
  return { ...actual, PMREMGenerator: vi.fn(class {
    fromScene = vi.fn(() => new actual.WebGLRenderTarget(16, 16));
    dispose = vi.fn();
  }) };
});

afterEach(() => vi.restoreAllMocks());

describe("studio environment GPU lifetime", () => {
  it("releases the framebuffer and regenerates an independent target on remount", () => {
    const scene = new THREE.Scene();
    const previous = new THREE.Texture();
    scene.environment = previous;
    const roomDispose = vi.spyOn(RoomEnvironment.prototype, "dispose");
    const targetDispose = vi.spyOn(THREE.WebGLRenderTarget.prototype, "dispose");
    const gl = {} as THREE.WebGLRenderer;

    const firstCleanup = installStudioEnvironment(gl, scene);
    const first = scene.environment;
    expect(first).not.toBe(previous);
    expect(roomDispose).toHaveBeenCalledTimes(1);
    expect(targetDispose).not.toHaveBeenCalled();
    firstCleanup();
    expect(scene.environment).toBe(previous);
    expect(targetDispose).toHaveBeenCalledTimes(1);

    const secondCleanup = installStudioEnvironment(gl, scene);
    expect(scene.environment).not.toBe(first);
    secondCleanup();
    expect(scene.environment).toBe(previous);
    expect(targetDispose).toHaveBeenCalledTimes(2);
  });

  it("restores environment strength without changing the composition background", () => {
    const scene = new THREE.Scene();
    const background = new THREE.Color("red");
    scene.background = background;
    scene.environmentIntensity = 0.8;
    const cleanup = setStudioEnvironmentIntensity(scene, 0.58);
    expect(scene.environmentIntensity).toBe(0.58);
    expect(scene.background).toBe(background);
    cleanup();
    expect(scene.environmentIntensity).toBe(0.8);
    expect(scene.background).toBe(background);
  });
});
