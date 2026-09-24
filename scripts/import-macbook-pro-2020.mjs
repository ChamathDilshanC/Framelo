// Convert the supplied 3ds Max OBJ export to a self-contained, editable GLB.
// node scripts/import-macbook-pro-2020.mjs "C:/path/to/Macbook-Pro-2020"
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as T from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import sharp from 'sharp'; // Bundled with the project's Next.js image pipeline.

const source = process.argv[2];
if (!source) throw new Error('Pass the folder containing Macbook Pro 2020.obj and its JPG textures.');
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
};
const root = new OBJLoader().parse(await readFile(path.join(source, 'Macbook Pro 2020.obj'), 'utf8'));
root.name = 'MacBook Pro 2020';
const material = (name, color, metalness = 0, roughness = 0.5) => new T.MeshStandardMaterial({ name, color, metalness, roughness });
const aluminium = material('Aluminium', 0xbcc0c5, 0.82, 0.36);
const bezel = material('Bezel', 0x08090b);
const keyboard = material('Keyboard', 0xffffff, 0, 0.65);
const touchbar = material('TouchBar', 0xffffff, 0, 0.4);
const rubber = material('Rubber', 0x101113, 0, 0.85);
const trackpad = material('Trackpad', 0xa7abb0, 0.65, 0.48);
const parts = {
  Rectangle004: ['Display enclosure', aluminium],
  Rectangle003: ['Aluminium deck', aluminium],
  Object026: ['Keyboard keys', keyboard],
  Object027: ['Touch Bar', touchbar],
  Plane006: ['Hinge cover', bezel],
  Cylinder007: ['Display hinge', bezel],
  Sphere001: ['Rubber feet', rubber],
  Object025: ['Trackpad', trackpad],
  Object028: ['USB-C ports', bezel],
};
for (const mesh of root.children) {
  const part = parts[mesh.name];
  if (!part) throw new Error(`Unexpected OBJ part: ${mesh.name}`);
  const originalName = mesh.name;
  [mesh.name, mesh.material] = part;
  if (originalName === 'Object025') mesh.position.y = 0.08;
  // The OBJ's MTL has only a red wireframe material. Restore the supplied
  // keyboard/Touch Bar atlases with planar UVs in the original model units.
  if (originalName === 'Object026' || originalName === 'Object027') {
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox;
    const p = mesh.geometry.attributes.position;
    const uv = new T.Float32BufferAttribute(new Float32Array(p.count * 2), 2);
    for (let i = 0; i < p.count; i++) {
      uv.setXY(i, (p.getX(i) - box.min.x) / (box.max.x - box.min.x),
        (p.getZ(i) - box.min.z) / (box.max.z - box.min.z));
    }
    mesh.geometry.setAttribute('uv', uv);
  }
  mesh.geometry = mergeVertices(mesh.geometry);
}

function plane(name, width, height, x, y, z, mat, back = false) {
  const geometry = new T.PlaneGeometry(width, height);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  const mesh = new T.Mesh(geometry, mat);
  mesh.name = name;
  mesh.position.set(x, y, z);
  if (back) mesh.rotation.y = Math.PI;
  root.add(mesh);
  return mesh;
}
// The source lid is a single aluminium shell; add flush front glass and a
// separate 16:10 display so uploads never replace the keyboard or enclosure.
plane('Front glass', 350, 233, 0, 3.5, -118.90, bezel);
plane('Screen', 332, 207.5, 0, 7, -118.84, material('Display', 0x000000));
const lens = new T.Mesh(new T.CircleGeometry(1.3, 24), material('Lens', 0x172935, 0.25, 0.2));
lens.name = 'FaceTime camera'; lens.position.set(0, 116.5, -118.80); root.add(lens);
plane('MacBook Pro wordmark', 48, 16.55, 0, -105.5, -118.82, material('Legend', 0xffffff));
plane('Rear Apple logo', 45, 45, 0, 5, -122.32, material('Logo', 0xffffff), true);

// Match the editor's three-unit device height without changing the source proportions.
const scale = 3 / new T.Box3().setFromObject(root).getSize(new T.Vector3()).y;
for (const mesh of root.children) {
  mesh.geometry.scale(scale, scale, scale);
  mesh.position.multiplyScalar(scale);
}

const exported = Buffer.from(await new GLTFExporter().parseAsync(root, { binary: true }));
const jsonSize = exported.readUInt32LE(12);
const gltf = JSON.parse(exported.subarray(20, 20 + jsonSize).toString());
const binStart = 20 + jsonSize + 8;
const buffers = [exported.subarray(binStart)];
let byteLength = buffers[0].length;
gltf.images = []; gltf.textures = [];
gltf.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }];
// Embed original JPG bytes directly: no browser/canvas dependency at import time.
for (const [materialName, filename] of [
  ['Keyboard', 'keyboard_diff.jpg'], ['TouchBar', 'touchpad_diff.jpg'],
  ['Legend', 'macbook_pro_logo_diff.jpg'], ['Logo', 'apple_logo_diff.jpg'],
]) {
  let bytes = await readFile(path.join(source, filename));
  let mimeType = 'image/jpeg';
  const mat = gltf.materials.find(m => m.name === materialName);
  if (materialName === 'Legend' || materialName === 'Logo') {
    // The supplied marks are black-on-white masks, not opaque stickers.
    const { data, info } = await sharp(bytes).greyscale().raw().toBuffer({ resolveWithObject: true });
    const rgba = Buffer.alloc(info.width * info.height * 4);
    for (let i = 0; i < data.length; i++) {
      const color = materialName === 'Legend' ? 170 : 15;
      rgba[i * 4] = color; rgba[i * 4 + 1] = color; rgba[i * 4 + 2] = color;
      rgba[i * 4 + 3] = 255 - data[i];
    }
    bytes = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
    mimeType = 'image/png'; mat.alphaMode = 'MASK'; mat.alphaCutoff = 0.5;
  }
  const view = gltf.bufferViews.length;
  gltf.bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.length });
  buffers.push(bytes, Buffer.alloc((4 - bytes.length % 4) % 4));
  byteLength += bytes.length + (4 - bytes.length % 4) % 4;
  const index = gltf.images.length;
  gltf.images.push({ bufferView: view, mimeType, name: filename });
  gltf.textures.push({ source: index, sampler: 0 });
  mat.pbrMetallicRoughness.baseColorTexture = { index };
}
gltf.buffers[0].byteLength = byteLength;
gltf.asset.extras = { source: 'User-supplied Macbook-Pro-2020/Macbook Pro 2020.obj', editableDisplay: 'Screen' };
const json = Buffer.from(JSON.stringify(gltf));
const paddedJson = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 0x20)]);
const bin = Buffer.concat(buffers);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
header.writeUInt32LE(20 + paddedJson.length + 8 + bin.length, 8);
header.writeUInt32LE(paddedJson.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(bin.length, 0); binHeader.writeUInt32LE(0x004e4942, 4);
const output = Buffer.concat([header, paddedJson, binHeader, bin]);
await writeFile(new URL('../public/devices/macbook-pro-2020.glb', import.meta.url), output);
console.log(`Imported ${root.children.length} meshes, ${gltf.images.length} textures; ${output.length} bytes.`);
