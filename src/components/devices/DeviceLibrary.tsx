"use client";

import { DeviceSelector } from "@/components/devices/DeviceSelector";

/**
 * The "Devices" tab of the left sidebar.
 *
 * Kept as the sidebar's entry point so the panel can grow sections — search,
 * categories — around the picker without the selector knowing about them.
 */
export function DeviceLibrary() {
  return <DeviceSelector />;
}
