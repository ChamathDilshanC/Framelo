import * as THREE from "three";

/**
 * Mapping between the 3D scene and the HTML overlay above it.
 *
 * The selection box, the drag handles and the editing caret are DOM, because
 * a caret drawn into a texture would be a text editor written from scratch.
 * The text itself is a plane in the scene. These two live in different
 * coordinate spaces, and everything here exists to keep them in the same place
 * on screen — including while the user orbits the camera.
 */

const scratch = new THREE.Vector3();

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ViewportFrame {
  width: number;
  height: number;
}

/** World position → pixel position inside the composition frame. */
export function projectToScreen(
  camera: THREE.Camera,
  world: THREE.Vector3Like,
  frame: ViewportFrame,
): ScreenPoint {
  scratch.set(world.x, world.y, world.z).project(camera);
  return {
    x: (scratch.x * 0.5 + 0.5) * frame.width,
    // NDC y runs upward, screen y runs downward.
    y: (1 - (scratch.y * 0.5 + 0.5)) * frame.height,
  };
}

/**
 * How many world units one screen pixel covers at a given depth.
 *
 * Perspective makes this depth-dependent: dragging text that sits behind the
 * device has to move it further per pixel than text in front, or the text
 * drifts away from the pointer. Measured at the object's own distance from the
 * camera, which is what makes a drag track the cursor exactly.
 */
export function worldUnitsPerPixel(
  camera: THREE.Camera,
  world: THREE.Vector3Like,
  frame: ViewportFrame,
): number {
  if (frame.height <= 0) return 0;

  const perspective = camera as THREE.PerspectiveCamera;
  if (!perspective.isPerspectiveCamera) return 1 / frame.height;

  // Distance along the view axis, not straight-line distance: an object off to
  // the side of frame is further from the camera but sits on the same plane,
  // and using the hypotenuse would make it scale differently from one centred.
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  const offset = scratch.set(world.x, world.y, world.z).sub(camera.position);
  const depth = Math.abs(offset.dot(forward));

  const visibleHeight = 2 * depth * Math.tan(THREE.MathUtils.degToRad(perspective.fov) / 2);
  return visibleHeight / frame.height;
}

/**
 * Pixel movement → world movement, in the camera's own plane.
 *
 * Uses the camera's right and up vectors rather than world X and Y, so a drag
 * still follows the pointer after the view has been orbited.
 */
export function screenDeltaToWorld(
  camera: THREE.Camera,
  world: THREE.Vector3Like,
  frame: ViewportFrame,
  deltaX: number,
  deltaY: number,
): THREE.Vector3 {
  const scale = worldUnitsPerPixel(camera, world, frame);

  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  camera.matrixWorld.extractBasis(right, up, new THREE.Vector3());

  return right.multiplyScalar(deltaX * scale).add(up.multiplyScalar(-deltaY * scale));
}

/**
 * The on-screen quad of a text plane.
 *
 * Returns all four corners rather than a bounding box so the selection outline
 * can follow a rotated layer instead of growing into an axis-aligned box
 * around it.
 */
export function projectQuad(
  camera: THREE.Camera,
  centre: THREE.Vector3Like,
  size: { width: number; height: number },
  rotation: { x: number; y: number; z: number },
  scale: { x: number; y: number },
  frame: ViewportFrame,
): ScreenPoint[] {
  const halfWidth = (size.width * scale.x) / 2;
  const halfHeight = (size.height * scale.y) / 2;

  const euler = new THREE.Euler(rotation.x, rotation.y, rotation.z, "XYZ");
  const origin = new THREE.Vector3(centre.x, centre.y, centre.z);

  return [
    [-halfWidth, halfHeight],
    [halfWidth, halfHeight],
    [halfWidth, -halfHeight],
    [-halfWidth, -halfHeight],
  ].map(([x, y]) => {
    const corner = new THREE.Vector3(x, y, 0).applyEuler(euler).add(origin);
    return projectToScreen(camera, corner, frame);
  });
}

/** Axis-aligned bounds of a projected quad, for hit testing and layout. */
export function quadBounds(points: ScreenPoint[]): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
}

/**
 * Screen position → a world point on the plane facing the camera at `depth`.
 *
 * Used when the text tool creates a layer: the click lands somewhere on screen
 * and has to become a position in the scene.
 */
export function screenToWorld(
  camera: THREE.Camera,
  point: ScreenPoint,
  frame: ViewportFrame,
  depth: number,
): THREE.Vector3 {
  const ndc = new THREE.Vector3(
    (point.x / frame.width) * 2 - 1,
    -((point.y / frame.height) * 2 - 1),
    0.5,
  );

  ndc.unproject(camera);

  const direction = ndc.sub(camera.position).normalize();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);

  // Distance along the ray that lands on the plane `depth` units in front of
  // the camera, measured along its view axis.
  const cosine = direction.dot(forward);
  if (Math.abs(cosine) < 1e-6) return camera.position.clone();

  const targetDepth = Math.abs(camera.position.z - depth) || 1;
  return camera.position.clone().add(direction.multiplyScalar(targetDepth / cosine));
}
