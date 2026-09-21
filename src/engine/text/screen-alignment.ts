import * as THREE from "three";
import { projectToScreen, type ViewportFrame } from "./text-viewport";

export type ScreenAlignment = "left" | "center" | "right" | "top" | "middle" | "bottom";

/** Translate in the camera plane, keeping each corner at its original view depth. */
export function screenAlignmentDelta(camera: THREE.Camera, corners: THREE.Vector3[], frame: ViewportFrame, alignment: ScreenAlignment, margin = 0): THREE.Vector3 {
  if (!corners.length || frame.width <= 0 || frame.height <= 0) throw new Error("The text box is not ready to align.");
  camera.updateMatrixWorld();
  const vertical = ["top", "middle", "bottom"].includes(alignment);
  const axis = vertical ? "y" : "x";
  const extent = vertical ? frame.height : frame.width;
  const direction = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, vertical ? 1 : 0);
  if (vertical) direction.negate();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  if (corners.some(point => point.clone().sub(camera.position).dot(forward) <= 0.001)) throw new Error("Move the text in front of the camera before aligning it.");
  const samples = corners.map(point => {
    const position = projectToScreen(camera, point, frame)[axis];
    const slope = projectToScreen(camera, point.clone().add(direction), frame)[axis] - position;
    return { position, slope };
  });
  const inset = Math.max(0, Math.min(margin, extent / 2));
  const start = alignment === "left" || alignment === "top";
  const end = alignment === "right" || alignment === "bottom";
  const target = start ? inset : end ? extent - inset : extent / 2;
  let distance = 0;
  // Perspective gives each corner a different pixels-per-unit slope. Recompute
  // the extrema as they change; each step solves the current piecewise-linear segment.
  for (let i = 0; i < 24; i++) {
    const sorted = samples.map(sample => ({ ...sample, value: sample.position + distance * sample.slope })).sort((a, b) => a.value - b.value);
    const low = sorted[0], high = sorted[sorted.length - 1];
    const value = start ? low.value : end ? high.value : (low.value + high.value) / 2;
    const slope = start ? low.slope : end ? high.slope : (low.slope + high.slope) / 2;
    if (Math.abs(target - value) < 0.0001) break;
    if (!Number.isFinite(slope) || slope <= 0) throw new Error("This camera view cannot align the text.");
    distance += (target - value) / slope;
  }
  return direction.multiplyScalar(distance);
}
