import { IPHONE_15_PRO_MAX } from "@/engine/devices/device-definitions";
import type { DeviceDefinition } from "@/types/device";

/**
 * The stand-in phone.
 *
 * Kept for surfaces that must render without downloading a 9 MB GLB — the
 * landing-page hero — and as the shape the procedural fallback device uses when
 * a model cannot load. Device definitions live in
 * `@/engine/devices/device-definitions`.
 */
export const IPHONE: DeviceDefinition = IPHONE_15_PRO_MAX;
