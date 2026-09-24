import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** Own the complete GPU render target for the lifetime of a mounted scene. */
export function installStudioEnvironment(gl: THREE.WebGLRenderer, scene: THREE.Scene): () => void {
  const previous = scene.environment;
  const pmrem = new THREE.PMREMGenerator(gl);
  const room = new RoomEnvironment();
  let target: THREE.WebGLRenderTarget;
  try {
    target = pmrem.fromScene(room, 0.04);
  } finally {
    room.dispose();
    pmrem.dispose();
  }
  scene.environment = target.texture;
  return () => {
    scene.environment = previous;
    target.dispose();
  };
}

export function setStudioEnvironmentIntensity(scene: THREE.Scene, intensity: number): () => void {
  const previous = scene.environmentIntensity;
  scene.environmentIntensity = intensity;
  return () => { scene.environmentIntensity = previous; };
}
