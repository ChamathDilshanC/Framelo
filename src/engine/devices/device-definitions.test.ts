import { describe, expect, it } from "vitest";

import { DEVICES, DEFAULT_DEVICE_ID, getAvailableDevices, getDevice } from "@/devices/registry";
import {
  DEVICE_FINISHES,
  DEFAULT_FINISH_ID,
  getFinish,
  MODELLED_DEVICES,
} from "@/engine/devices/device-definitions";
import {
  CAMERA_VIEWS,
  DEVICE_TRANSFORM_PRESETS,
  getCameraView,
  getTransformPreset,
  matchesTransformPreset,
} from "@/engine/devices/device-presets";
import { IDENTITY_TRANSFORM } from "@/types/layer";

describe("device registry", () => {
  it("exposes unique device ids", () => {
    const ids = DEVICES.map((device) => device.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("defaults to a device that actually exists and is available", () => {
    const device = getDevice(DEFAULT_DEVICE_ID);
    expect(device.id).toBe(DEFAULT_DEVICE_ID);
    expect(device.available).toBe(true);
  });

  it("falls back to the default device for an unknown id", () => {
    // Projects saved against a renamed device must still open.
    expect(getDevice("nope-not-a-device").id).toBe(DEFAULT_DEVICE_ID);
  });

  it("ships phones, a tablet and a laptop", () => {
    expect(getAvailableDevices().map((device) => device.id)).toEqual([
      "iphone-15-pro-max",
      "iphone-17-pro-max",
      "iphone-17-pro",
      "iphone-duo",
      "iphone-18-pro-max",
      "iphone-13-pro-max",
      "ipad",
      "macbook",
      "macbook-neo-2026",
    ]);
  });

  it("targets the actual front display materials", () => {
    const iPhone18 = MODELLED_DEVICES.find((entry) => entry.id === "iphone-18-pro-max");
    const iPhone13 = MODELLED_DEVICES.find((entry) => entry.id === "iphone-13-pro-max");
    expect(iPhone18?.model?.screenMaterialNames).toEqual(["Material.001"]);
    expect(iPhone13?.model?.screenMaterialNames).toEqual(["Screen_Glass"]);
  });
});

describe("device definitions", () => {
  it("uses the imported MacBook and resolves saved M4 scenes to it", () => {
    const device = getDevice("macbook");
    expect(device.name).toBe("MacBook Pro 2020");
    expect(device.model?.path).toBe("/devices/macbook-pro-2020.glb");
    expect(device.model?.screenPixels).toEqual([2560, 1600]);
    expect(DEVICES.some(entry => entry.id === "macbook-pro-m4")).toBe(false);
    expect(getDevice("macbook-pro-m4")).toBe(device);
  });
});

describe("modelled device definitions", () => {
  it.each(MODELLED_DEVICES)("$id is fully configured", (device) => {
    const model = device.model;
    expect(model).toBeDefined();
    if (!model) return;

    expect(model.path).toMatch(/^\/devices\/.+\.glb$/);
    // A device with no screen candidates would load, then silently show the
    // model's own baked wallpaper instead of the user's image.
    expect(model.screenMeshNames.length + model.screenMaterialNames.length).toBeGreaterThan(0);
    expect(model.screenPixels[0]).toBeGreaterThan(0);
    expect(model.screenPixels[1]).toBeGreaterThan(0);
    expect(model.rotation).toHaveLength(3);
  });

  it("normalises every model to the same height", () => {
    const heights = new Set(MODELLED_DEVICES.map((device) => device.model?.normalizeHeight));
    // One shared size is what lets one camera framing and one set of presets
    // work across the whole library.
    expect(heights.size).toBe(1);
  });

  it("keeps the declared screen aspect in step with the model's pixels", () => {
    for (const device of MODELLED_DEVICES) {
      const [width, height] = device.model!.screenPixels;
      expect(device.screenAspect).toBeCloseTo(width / height, 5);
    }
  });

  it("gives the inset border room inside the screen", () => {
    for (const device of MODELLED_DEVICES) {
      const inset = device.model?.inset;
      if (!inset) continue;
      const [width, height] = device.model!.screenPixels;
      expect(inset.border * 2).toBeLessThan(Math.min(width, height));
      expect(inset.radius).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("device finishes", () => {
  it("has a valid default", () => {
    expect(getFinish(DEFAULT_FINISH_ID).id).toBe(DEFAULT_FINISH_ID);
  });

  it("falls back rather than returning undefined for an unknown finish", () => {
    expect(getFinish("chartreuse").id).toBe(DEVICE_FINISHES[0].id);
  });

  it.each(DEVICE_FINISHES)("$id stays within a sane blend range", (finish) => {
    expect(finish.tint).toMatch(/^#[0-9a-f]{6}$/i);
    expect(finish.mix).toBeGreaterThanOrEqual(0);
    expect(finish.mix).toBeLessThanOrEqual(1);
  });
});

describe("presets", () => {
  it("offers every product-shot camera view", () => {
    expect(CAMERA_VIEWS.map((view) => view.id)).toEqual([
      "front",
      "back",
      "left-hero",
      "right-hero",
      "three-quarter",
      "custom",
    ]);
  });

  it("leaves the orbit view without a fixed position", () => {
    // "custom" means "wherever the user dragged it" — a position would yank
    // the camera back on every re-render.
    expect(getCameraView("custom").position).toBeNull();
  });

  it("matches a transform against the preset that produced it", () => {
    const preset = getTransformPreset("hero-left");
    expect(preset).toBeDefined();

    const transform = { ...IDENTITY_TRANSFORM, ...preset!.rotation };
    expect(matchesTransformPreset(transform, preset!)).toBe(true);
    expect(matchesTransformPreset({ ...transform, rotationY: 90 }, preset!)).toBe(false);
  });

  it("keeps position and scale out of the device presets", () => {
    // Presets set the angle only; a user's framing and size survive them.
    for (const preset of DEVICE_TRANSFORM_PRESETS) {
      expect(Object.keys(preset.rotation).sort()).toEqual([
        "rotationX",
        "rotationY",
        "rotationZ",
      ]);
    }
  });
});
