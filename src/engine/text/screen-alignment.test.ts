import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { screenAlignmentDelta, type ScreenAlignment } from "./screen-alignment";
import { projectToScreen, quadBounds } from "./text-viewport";
import { createProject } from "@/lib/project-factory";
import { useProjectStore } from "@/store/project-store";
import { evaluateTransform } from "@/engine/animation/evaluate";

const frame = { width: 1920, height: 1080 };
function camera(orbit: boolean) {
  const value = new THREE.PerspectiveCamera(32, frame.width / frame.height, 0.01, 100);
  value.position.set(orbit ? 3 : 0, orbit ? 2 : 0, 8);
  value.lookAt(0, 0, 0); value.updateMatrixWorld();
  return value;
}
const corners = [[-1, -0.3], [1, -0.3], [1, 0.3], [-1, 0.3]].map(([x, y]) => new THREE.Vector3(x, y, 0).applyEuler(new THREE.Euler(0.2, 0.5, 0.3)).add(new THREE.Vector3(0.6, -0.2, 0.4)));

describe("screen text alignment", () => {
  for (const orbit of [false, true]) {
    it.each<ScreenAlignment>(["left", "center", "right", "top", "middle", "bottom"])(`aligns %s with ${orbit ? "orbited" : "front"} camera and rotated text`, alignment => {
      const view = camera(orbit);
      const delta = screenAlignmentDelta(view, corners, frame, alignment, 48);
      const result = quadBounds(corners.map(point => projectToScreen(view, point.clone().add(delta), frame)));
      const expected = { left: 48, right: frame.width - 48, center: frame.width / 2, top: 48, bottom: frame.height - 48, middle: frame.height / 2 };
      const actual = { left: result.left, right: result.left + result.width, center: result.left + result.width / 2, top: result.top, bottom: result.top + result.height, middle: result.top + result.height / 2 };
      expect(actual[alignment]).toBeCloseTo(expected[alignment], 3);
      const forward = new THREE.Vector3(); view.getWorldDirection(forward);
      expect(delta.dot(forward)).toBeCloseTo(0, 8);
    });
  }
  it("shifts animated positions together and undoes in one step", () => {
    const store = () => useProjectStore.getState();
    store().loadProject(createProject());
    const id = store().addTextLayer()!;
    store().addKeyframe(id, "x", 0, -1);
    store().addKeyframe(id, "x", 2, 1);
    const before = structuredClone(store().project!.layers.find(layer => layer.id === id)!);
    store().translateLayer(id, { x: 0.5, y: 0.2, z: -0.1 });
    const after = store().project!.layers.find(layer => layer.id === id)!;
    for (const time of [0, 0.5, 1, 2]) {
      expect(evaluateTransform(after, time).x - evaluateTransform(before, time).x).toBeCloseTo(0.5);
    }
    expect(after.animations[0].keyframes.map(key => key.time)).toEqual([0, 2]);
    store().undo();
    expect(store().project!.layers.find(layer => layer.id === id)).toEqual(before);
  });
});
