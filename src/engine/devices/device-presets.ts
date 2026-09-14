import type { Transform } from "@/types/layer";

/**
 * Product-shot presets.
 *
 * Two independent sets, deliberately kept apart:
 *
 * - **Device presets** write the layer's transform. They are ordinary
 *   keyframable values, so the timeline animates straight out of one.
 * - **Camera views** move the viewport camera and never touch the layer. A
 *   camera move is not part of the project's animation data.
 *
 * Mixing the two is what makes a mockup editor impossible to animate: rotating
 * "the phone" would silently mean orbiting the camera, and the exported frame
 * would stop matching the keyframes.
 */

export interface DeviceTransformPreset {
  id: string;
  label: string;
  description: string;
  /** Applied over the layer's current transform — position and scale are kept. */
  rotation: Pick<Transform, "rotationX" | "rotationY" | "rotationZ">;
}

export const DEVICE_TRANSFORM_PRESETS: DeviceTransformPreset[] = [
  {
    id: "front",
    label: "Front",
    description: "Straight-on, for app-store screenshots.",
    rotation: { rotationX: 0, rotationY: 0, rotationZ: 0 },
  },
  {
    id: "hero-left",
    label: "Hero Left",
    description: "Turned left, tipped back — the classic marketing angle.",
    rotation: { rotationX: 5, rotationY: -25, rotationZ: -3 },
  },
  {
    id: "hero-right",
    label: "Hero Right",
    description: "Mirrored hero angle, for a right-hand layout.",
    rotation: { rotationX: 5, rotationY: 25, rotationZ: 3 },
  },
  {
    id: "back",
    label: "Back",
    description: "Rear shot, showing the camera plateau.",
    rotation: { rotationX: 0, rotationY: 180, rotationZ: 0 },
  },
  {
    id: "three-quarter",
    label: "Three Quarter",
    description: "A deeper turn that shows the rail and the screen together.",
    rotation: { rotationX: 8, rotationY: -42, rotationZ: -4 },
  },
];

export type CameraViewId =
  | "front"
  | "back"
  | "left-hero"
  | "right-hero"
  | "three-quarter"
  | "custom";

export interface CameraView {
  id: CameraViewId;
  label: string;
  /** `null` on "custom": the camera stays wherever the user orbited it. */
  position: [number, number, number] | null;
  target: [number, number, number];
}

/**
 * Positions assume the normalised device: 3 scene units tall, centred on the
 * origin. Every model in the library is normalised the same way, so these read
 * identically across devices.
 */
export const CAMERA_VIEWS: CameraView[] = [
  { id: "front", label: "Front", position: [0, 0.1, 7.6], target: [0, 0, 0] },
  { id: "back", label: "Back", position: [0, 0.1, -7.6], target: [0, 0, 0] },
  { id: "left-hero", label: "Left hero", position: [-3.3, 1.1, 6.6], target: [0, 0, 0] },
  { id: "right-hero", label: "Right hero", position: [3.3, 1.1, 6.6], target: [0, 0, 0] },
  {
    id: "three-quarter",
    label: "Three quarter",
    position: [4.6, 2.3, 5.4],
    target: [0, 0, 0],
  },
  { id: "custom", label: "Orbit", position: null, target: [0, 0, 0] },
];

export function getCameraView(id: CameraViewId): CameraView {
  return CAMERA_VIEWS.find((view) => view.id === id) ?? CAMERA_VIEWS[0];
}

export function getTransformPreset(id: string): DeviceTransformPreset | undefined {
  return DEVICE_TRANSFORM_PRESETS.find((preset) => preset.id === id);
}

/**
 * Whether a layer's transform currently matches a preset, so the UI can show
 * which one is active without storing it in the project.
 */
export function matchesTransformPreset(
  transform: Transform,
  preset: DeviceTransformPreset,
): boolean {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.5;
  return (
    near(transform.rotationX, preset.rotation.rotationX) &&
    near(transform.rotationY, preset.rotation.rotationY) &&
    near(transform.rotationZ, preset.rotation.rotationZ)
  );
}
