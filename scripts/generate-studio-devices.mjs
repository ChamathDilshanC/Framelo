// Original Framelo industrial-design study. No downloaded meshes or branding.
// node scripts/generate-studio-devices.mjs
import * as T from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { readFile, writeFile } from 'node:fs/promises';
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend?.(); }); }
};
const metal = new T.MeshStandardMaterial({name:'Aluminium', color:0xbcc0c5, metalness:0.82, roughness:0.36});
const edge = new T.MeshStandardMaterial({name:'Machined edge', color:0xcbd0d4, metalness:0.88, roughness:0.22});
const black = new T.MeshStandardMaterial({name:'Bezel', color:0x08090b, roughness:0.53});
const keys = new T.MeshStandardMaterial({name:'Keyboard', color:0x161719, roughness:0.65});
const glass = new T.MeshStandardMaterial({name:'Lens',color:0x162633,metalness:0.45,roughness:0.12});
const ink = new T.MeshStandardMaterial({name:'Legend',color:0xb7bdc5,roughness:0.8});
const geometries = new Map();
function outline(w,h,r) {
  r=Math.min(r,w/2,h/2); const x=-w/2, y=-h/2; const s=new T.Shape();
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
function panel(parent,name,w,h,d,x,y,z,material=metal,r=0.06) {
  const key=[w,h,d,r].join(',');
  if(!geometries.has(key)) {
    // XY corner radius is independent of thickness: thin tablets still have rounded corners.
    const geo=new T.ExtrudeGeometry(outline(w,h,r),{depth:d,bevelEnabled:true,bevelThickness:0.002,bevelSize:0.003,bevelSegments:2,steps:1,curveSegments:10});
    geo.translate(0,0,-d/2); geometries.set(key,geo);
  }
  const mesh=new T.Mesh(geometries.get(key),material);mesh.name=name;mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function dot(parent,name,r,depth,x,y,z,material=black) {
  const key=`dot:${r}:${depth}`;
  if(!geometries.has(key))geometries.set(key,new T.CylinderGeometry(r,r,depth,24));
  const mesh=new T.Mesh(geometries.get(key),material);mesh.rotation.x=Math.PI/2;mesh.name=name;mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function screen(parent,w,h,x,y,z,r=0.035) {
  const geo=new T.ShapeGeometry(outline(w,h,r),16);
  const uv=geo.attributes.uv, p=geo.attributes.position;
  for(let i=0;i<uv.count;i++)uv.setXY(i,p.getX(i)/w+0.5,0.5-p.getY(i)/h);
  const mesh=new T.Mesh(geo,new T.MeshStandardMaterial({name:'Display',color:0x000000}));
  mesh.name='Screen';mesh.position.set(x,y,z);parent.add(mesh);
}
const ipad=new T.Group();
panel(ipad,'Rounded aluminium enclosure',2.16,3,0.069,0,0,0,metal,0.13);
panel(ipad,'Polished display rim',2.145,2.985,0.008,0,0,0.035,edge,0.128);
panel(ipad,'Flush front glass',2.12,2.96,0.008,0,0,0.042,black,0.12);
screen(ipad,2.8*1668/2388,2.8,0,0,0.051,0.095);
dot(ipad,'Landscape front camera',0.014,0.004,1.031,0,0.049,glass);
panel(ipad,'Rear camera island',0.28,0.30,0.022,-0.84,1.24,-0.047,metal,0.065);
dot(ipad,'Camera ring',0.096,0.023,-0.84,1.27,-0.065,black);
dot(ipad,'Camera sapphire',0.075,0.025,-0.84,1.27,-0.075,glass);
dot(ipad,'Flash',0.024,0.006,-0.76,1.16,-0.063,ink);
for(let i=0;i<3;i++)dot(ipad,'Smart connector',0.014,0.004,(i-1)*0.065,-1.3,-0.038,edge);
panel(ipad,'Power button',0.23,0.015,0.042,0.65,1.508,0,edge,0.007);
for(const y of [0.85,1.12])panel(ipad,'Volume button',0.014,0.19,0.036,1.088,y,0,edge,0.006);
const port=panel(ipad,'USB-C',0.14,0.027,0.003,0,-1.503,0,black,0.013);port.rotation.x=Math.PI/2;
for(const sign of [-1,1])for(const side of [-1,1])for(let i=0;i<10;i++){
  const hole=dot(ipad,'Speaker perforation',0.008,0.004,side*(0.56+i*0.035),sign*1.502,0);
  hole.rotation.x=0;
}
const laptop=new T.Group();
const deck=panel(laptop,'Tapered aluminium deck',4.48,2.95,0.125,0,-1.22,0.98,metal,0.13);deck.rotation.x=-Math.PI/2;
const bottom=panel(laptop,'Bottom cover seam',4.43,2.90,0.03,0,-1.3,0.98,edge,0.12);bottom.rotation.x=-Math.PI/2;
function deckPanel(name,w,h,d,x,z,material,r=0.025,y=-1.151){const m=panel(laptop,name,w,h,d,x,y,z,material,r);m.rotation.x=-Math.PI/2;return m;}
deckPanel('Keyboard recess',3.55,1.32,0.006,0,0.48,black,0.065);
const font=new FontLoader().parse(JSON.parse(await readFile(new URL('./assets/helvetiker_regular.typeface.json',import.meta.url),'utf8')));
function legend(char,x,z){
  const key=`letter:${char}`;
  if(!geometries.has(key))geometries.set(key,new T.ShapeGeometry(font.generateShapes(char,0.057)));
  const mesh=new T.Mesh(geometries.get(key),ink);mesh.rotation.x=-Math.PI/2;mesh.position.set(x-0.022,-1.125,z+0.019);laptop.add(mesh);
}
const rows=['1234567890-+','QWERTYUIOP[]','ASDFGHJKL;','ZXCVBNM,./'];
rows.forEach((row,r)=>[...row].forEach((char,c)=>{
 const x=(c-(row.length-1)/2)*0.27,z=0.01+r*0.245;
 deckPanel(`Key ${char}`,0.237,0.205,0.016,x,z,keys,0.028,-1.137);legend(char,x,z);
}));
for(let i=0;i<5;i++)deckPanel('Modifier key',0.24,0.20,0.016,(i-2)*0.29-0.93,1.0,keys,0.025,-1.137);
deckPanel('Space bar',1.34,0.20,0.016,0.18,1.0,keys,0.025,-1.137);
for(let i=0;i<2;i++)deckPanel('Arrow key',0.23,0.20,0.016,1.08+i*0.28,1.0,keys,0.025,-1.137);
deckPanel('Trackpad perimeter',1.68,0.88,0.004,0,1.82,black,0.065);
deckPanel('Glass trackpad',1.664,0.864,0.005,0,1.82,metal,0.06,-1.148);
for(const sign of [-1,1])for(let row=0;row<27;row++)for(let col=0;col<3;col++){
 const hole=dot(laptop,'Speaker grille',0.006,0.003,sign*(1.92+col*0.06),-1.149,-0.09+row*0.047);hole.rotation.x=0;
}
for(const x of [-1.9,1.9])for(const z of [-0.12,2.03]){const foot=dot(laptop,'Rubber foot',0.11,0.035,x,-1.332,z);foot.rotation.x=0;}
const hinge=new T.Mesh(new T.CylinderGeometry(0.075,0.075,3.8,32),black);hinge.rotation.z=Math.PI/2;hinge.position.set(0,-1.12,-0.38);hinge.name='Continuous hinge';laptop.add(hinge);
for(const x of [-2.244,2.244])for(const z of [0.05,0.44]){const p=panel(laptop,'USB-C port',0.18,0.038,0.005,x,-1.22,z,black,0.017);p.rotation.y=Math.PI/2;}
const lid=new T.Group();lid.name='Open lid';lid.position.set(0,-1.1,-0.38);lid.rotation.x=-0.19;laptop.add(lid);
panel(lid,'Rounded display enclosure',4.48,2.91,0.058,0,1.455,0,metal,0.09);
panel(lid,'Display edge',4.46,2.89,0.006,0,1.455,0.031,edge,0.087);
panel(lid,'Black display surround',4.40,2.83,0.006,0,1.455,0.038,black,0.075);
screen(lid,4.24,2.65,0,1.465,0.044,0.052);
panel(lid,'Camera notch',0.31,0.063,0.003,0,2.76,0.048,black,0.018);
dot(lid,'FaceTime lens',0.012,0.004,0,2.761,0.051,glass);
// Restrained rear panel seam and antenna strip, intentionally unbranded.
panel(lid,'Rear hinge trim',3.8,0.045,0.006,0,0.09,-0.033,black,0.015);
for(const [id,group]of [['ipad',ipad],['macbook',laptop]]){
 const data=await new GLTFExporter().parseAsync(group,{binary:true});
 await writeFile(new URL(`../public/devices/${id}.glb`,import.meta.url),Buffer.from(data));console.log(id,data.byteLength);
}
