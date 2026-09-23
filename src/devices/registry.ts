import { ADDITIONAL_DEVICES, MODELLED_DEVICES } from "@/engine/devices/device-definitions";
import type { DeviceDefinition } from "@/types/device";

/**
 * Devices are data, not code paths. Adding a device means adding a definition
 * (plus, optionally, a GLB) — the renderer does not change.
 */
const DEVICE_LIST: DeviceDefinition[] = [
  ...MODELLED_DEVICES,
  ...ADDITIONAL_DEVICES,
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
