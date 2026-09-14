import * as THREE from "three";

/**
 * A flat rounded rectangle with clean 0..1 UVs.
 *
 * `ShapeGeometry` derives UVs from shape coordinates, which breaks texture
 * mapping, so the UV attribute is rebuilt from the vertex positions.
 */
export function createRoundedRectGeometry(
  width: number,
  height: number,
  radius: number,
  segments = 8,
): THREE.BufferGeometry {
  const safeRadius = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  const shape = new THREE.Shape();

  const x = -width / 2;
  const y = -height / 2;

  shape.moveTo(x + safeRadius, y);
  shape.lineTo(x + width - safeRadius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  shape.lineTo(x + width, y + height - safeRadius);
  shape.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  shape.lineTo(x + safeRadius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  shape.lineTo(x, y + safeRadius);
  shape.quadraticCurveTo(x, y, x + safeRadius, y);

  const geometry = new THREE.ShapeGeometry(shape, segments);
  remapUvs(geometry, width, height);
  return geometry;
}

function remapUvs(geometry: THREE.BufferGeometry, width: number, height: number): void {
  const positions = geometry.attributes.position;
  const uvs = new Float32Array(positions.count * 2);

  for (let i = 0; i < positions.count; i += 1) {
    uvs[i * 2] = positions.getX(i) / width + 0.5;
    uvs[i * 2 + 1] = positions.getY(i) / height + 0.5;
  }

  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
}
