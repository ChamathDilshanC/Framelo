import { MODELLED_DEVICES } from "@/engine/devices/device-definitions";
import type { DeviceDefinition } from "@/types/device";

/**
 * Devices are data, not code paths. Adding a device means adding a definition
 * (plus, optionally, a GLB) — the renderer does not change.
 */
const DEVICE_LIST: DeviceDefinition[] = [
  ...MODELLED_DEVICES,
  {
    id: "ipad",
    name: "iPad",
    category: "tablet",
    description: "11\" tablet. Coming in the next device drop.",
    ratioLabel: "4 : 3",
    available: false,
    body: { width: 3.1, height: 4.4, depth: 0.16, cornerRadius: 0.22, bezel: 0.14 },
    screen: {
      width: 2.82,
      height: 4.12,
      cornerRadius: 0.1,
      position: [0, 0, 0.083],
      rotation: [0, 0, 0],
    },
    screenAspect: 2.82 / 4.12,
    defaultCamera: { position: [0, 0.1, 8.6], target: [0, 0, 0], fov: 32 },
  },
  {
    id: "macbook",
    name: "MacBook",
    category: "laptop",
    description: "Laptop with an animated lid. Coming soon.",
    ratioLabel: "16 : 10",
    available: false,
    body: { width: 5.6, height: 3.8, depth: 0.2, cornerRadius: 0.12, bezel: 0.12 },
    screen: {
      width: 5.36,
      height: 3.36,
      cornerRadius: 0.06,
      position: [0, 0, 0.101],
      rotation: [0, 0, 0],
    },
    screenAspect: 5.36 / 3.36,
    defaultCamera: { position: [0, 0.4, 11], target: [0, 0, 0], fov: 32 },
  },
  {
    id: "browser",
    name: "Browser",
    category: "browser",
    description: "Desktop browser frame for web showcases. Coming soon.",
    ratioLabel: "16 : 9",
    available: false,
    body: { width: 6.4, height: 4, depth: 0.1, cornerRadius: 0.1, bezel: 0.08 },
    screen: {
      width: 6.24,
      height: 3.5,
      cornerRadius: 0.02,
      position: [0, -0.2, 0.051],
      rotation: [0, 0, 0],
    },
    screenAspect: 6.24 / 3.5,
    defaultCamera: { position: [0, 0, 12], target: [0, 0, 0], fov: 32 },
  },
];

export const DEVICES: readonly DeviceDefinition[] = DEVICE_LIST;

export const DEFAULT_DEVICE_ID = MODELLED_DEVICES[0].id;

/**
 * Unknown ids resolve to the default device rather than throwing: a project
 * saved against a device that has since been renamed must still open.
 */
export function getDevice(deviceId: string): DeviceDefinition {
  return DEVICE_LIST.find((device) => device.id === deviceId) ?? MODELLED_DEVICES[0];
}

export function getAvailableDevices(): DeviceDefinition[] {
  return DEVICE_LIST.filter((device) => device.available);
}
