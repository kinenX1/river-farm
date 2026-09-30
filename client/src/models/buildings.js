import * as THREE from 'three';
import { mat, metal, flat, textured, mesh, boxG, sphereG, cylG } from '../gfx/materials.js';

// Everything players can build, plus the river shop. Each builder returns a
// Group centred on its footprint with y = 0 at ground level.

const planks = (color, rx = 2, ry = 1) => textured('planks', color, rx, ry);

// A gable roof: triangular prism covered in shingles
function gableRoof(w, d, h, color, overhang = 0.35) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 - overhang, 0); shape.lineTo(0, h); shape.lineTo(w / 2 + overhang, 0); shape.lineTo(-w / 2 - overhang, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d + overhang * 2, bevelEnabled: false });
  geo.translate(0, 0, -(d + overhang * 2) / 2);
  const m = textured('shingles', color, 3, 3);
  return mesh(geo, m);
}

function windowFrame(parent, x, y, z, w = 0.9, h = 0.9) {
  const trim = mat(0xf4ecd8);
  mesh(boxG(w, h, 0.08), mat(0x9fd8ff, { roughness: 0.1, metalness: 0.2, emissive: 0x223344, emissiveIntensity: 0.3 }), x, y, z, parent);
  mesh(boxG(w + 0.16, 0.1, 0.14), trim, x, y + h / 2, z, parent);
  mesh(boxG(w + 0.16, 0.1, 0.14), trim, x, y - h / 2, z, parent);
  mesh(boxG(0.1, h, 0.14), trim, x - w / 2, y, z, parent);
  mesh(boxG(0.1, h, 0.14), trim, x + w / 2, y, z, parent);
  mesh(boxG(0.06, h, 0.12), trim, x, y, z, parent);
  mesh(boxG(w + 0.3, 0.1, 0.3), trim, x, y - h / 2 - 0.05, z + 0.1, parent); // sill
}

function door(parent, x, y, z, w = 1.1, h = 1.9, color = 0x6b4423) {
  mesh(boxG(w, h, 0.12), planks(color, 1, 1.5), x, y, z, parent).rotation.z = 0;
  mesh(boxG(w + 0.2, 0.12, 0.18), mat(0xf4ecd8), x, y + h / 2, z, parent);
  mesh(sphereG(0.07, 12), metal(0xe0b64a), x + w * 0.32, y, z + 0.1, parent);
}

export function house() {
  const g = new THREE.Group();
  const walls = planks(0xe8c99a, 2, 1.2);
  mesh(boxG(4.5, 3, 4), walls, 0, 1.5, 0, g);
  mesh(boxG(4.7, 0.3, 4.2), textured('stone', 0xbbbbbb, 3, 0.4), 0, 0.15, 0, g);   // foundation
  for (const x of [-2.25, 2.25]) for (const z of [-2, 2]) mesh(boxG(0.25, 3, 0.25), planks(0x8a5a2b, 0.3, 1), x, 1.5, z, g);
  const roof = gableRoof(4.5, 4, 2, 0xb04a32); roof.position.y = 3; g.add(roof);
  // gable ends
  const tri = new THREE.Shape(); tri.moveTo(-2.25, 0); tri.lineTo(0, 2); tri.lineTo(2.25, 0);
  for (const z of [-2, 2]) mesh(new THREE.ShapeGeometry(tri), planks(0xd9b784, 2, 1), 0, 3, z + (z > 0 ? 0.01 : -0.01), g).rotation.y = z > 0 ? 0 : Math.PI;
  door(g, 0, 0.95 + 0.3, 2.06);
  windowFrame(g, -1.4, 1.9, 2.05); windowFrame(g, 1.4, 1.9, 2.05);
  mesh(boxG(0.7, 1.6, 0.7), textured('stone', 0xaaaaaa, 1, 1.5), 1.3, 4.2, -0.8, g);   // chimney
  mesh(boxG(1.6, 0.2, 0.9), planks(0x8a5a2b, 1, 0.5), 0, 0.1, 2.5, g);                  // doorstep
  // flower box
  mesh(boxG(1.1, 0.25, 0.3), planks(0x8a5a2b, 1, 0.3), -1.4, 1.3, 2.25, g);
  [0xff6b8a, 0xffd84a, 0xffffff].forEach((c, i) => mesh(sphereG(0.1, 8), mat(c), -1.75 + i * 0.35, 1.48, 2.25, g));
  return g;
}

export function barn() {
  const g = new THREE.Group();
  const red = planks(0xb8372a, 1, 2);
  red.map.rotation = Math.PI / 2;
  mesh(boxG(6, 4, 5), red, 0, 2, 0, g);
  mesh(boxG(6.2, 0.3, 5.2), textured('stone', 0xbbbbbb, 3, 0.4), 0, 0.15, 0, g);
  // gambrel roof: two slopes each side
  const roofM = textured('shingles', 0x5b3a1e, 3, 3);
  const shape = new THREE.Shape();
  shape.moveTo(-3.4, 0); shape.lineTo(-2.4, 1.3); shape.lineTo(0, 2.2); shape.lineTo(2.4, 1.3); shape.lineTo(3.4, 0); shape.lineTo(-3.4, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 5.6, bevelEnabled: false }); geo.translate(0, 0, -2.8);
  mesh(geo, roofM, 0, 4, 0, g);
  const endShape = new THREE.Shape(); endShape.moveTo(-3, 0); endShape.lineTo(-2.1, 1.15); endShape.lineTo(0, 1.95); endShape.lineTo(2.1, 1.15); endShape.lineTo(3, 0);
  for (const z of [-2.5, 2.5]) mesh(new THREE.ShapeGeometry(endShape), red, 0, 4, z + (z > 0 ? 0.01 : -0.01), g).rotation.y = z > 0 ? 0 : Math.PI;
  // big doors with white X trim
  const white = mat(0xf4ecd8);
  mesh(boxG(2.6, 3, 0.1), planks(0x9c2e22, 1, 1.5), 0, 1.5, 2.53, g);
  for (const s of [-1, 1]) { const x = mesh(boxG(0.14, 3.7, 0.08), white, 0, 1.5, 2.6, g); x.rotation.z = s * 0.72; }
  mesh(boxG(2.8, 0.16, 0.1), white, 0, 3.05, 2.6, g);
  mesh(boxG(2.8, 0.16, 0.1), white, 0, 0.02, 2.6, g);
  for (const x of [-1.35, 1.35]) mesh(boxG(0.16, 3.1, 0.1), white, x, 1.5, 2.6, g);
  windowFrame(g, 0, 4.9, 2.55, 0.8, 0.7);
  // hay bales next to it
  const hay = mat(0xe3c04a, { roughness: 1 });
  mesh(boxG(1, 0.6, 0.7), hay, 2.4, 0.3, 3.2, g); mesh(boxG(1, 0.6, 0.7), hay, 2.2, 0.9, 3.1, g);
  return g;
}

export function fence() {
  const g = new THREE.Group();
  const wood = planks(0xb58656, 0.5, 0.5);
  for (let i = -1; i <= 1; i++) {
    mesh(boxG(0.22, 1.2, 0.22), wood, i * 1.4, 0.6, 0, g);
    mesh(new THREE.ConeGeometry(0.16, 0.22, 4), wood, i * 1.4, 1.31, 0, g).rotation.y = Math.PI / 4;
  }
  mesh(boxG(3, 0.16, 0.1), wood, 0, 0.85, 0.08, g); mesh(boxG(3, 0.16, 0.1), wood, 0, 0.45, 0.08, g);
  return g;
}

export function wall() {
  const g = new THREE.Group();
  const stone = textured('stone', 0xd0d0d0, 1.5, 1);
  mesh(boxG(3, 1.6, 0.8), stone, 0, 0.8, 0, g);
  mesh(boxG(3.2, 0.2, 1), textured('stone', 0xb0b0b0, 1.5, 0.3), 0, 1.7, 0, g);
  return g;
}

export function bridge(length) {
  const g = new THREE.Group();
  const wood = planks(0xb5824a, 0.4, 1);
  const n = Math.round(length / 0.8);
  for (let i = 0; i < n; i++) {
    const p = mesh(boxG(0.72, 0.22, 3), wood, -length / 2 + 0.4 + i * 0.8, Math.sin(i / (n - 1) * Math.PI) * 0.35, 0, g);
    p.rotation.y = (Math.random() - 0.5) * 0.04;
  }
  const post = planks(0x7a4a22, 0.3, 1);
  for (let i = 0; i <= 4; i++) for (const z of [-1.4, 1.4]) {
    const x = -length / 2 + i * length / 4;
    mesh(cylG(0.12, 0.14, 1.3, 10), post, x, 0.4 + Math.sin(i / 4 * Math.PI) * 0.35, z, g);
  }
  // rope rails
  for (const z of [-1.4, 1.4]) {
    const pts = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector3(-length / 2 + t * length, 1.0 + Math.sin(t * Math.PI) * 0.35 - Math.abs(Math.sin(t * Math.PI * 4)) * 0.08, z)); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.05, 6), mat(0xcaa66a), 0, 0, 0, g);
  }
  return g;
}

// Farm plot: tilled soil + 16 wheat plants. Returns { g, crops } so the game can grow them.
export function farm() {
  const g = new THREE.Group();
  mesh(boxG(6, 0.3, 6), textured('soil', 0xffffff, 1.5, 1.5), 0, 0.45, 0, g);
  const border = planks(0x8a5a2b, 2, 0.2);
  for (const [x, z, w, d] of [[0, 3, 6.3, 0.2], [0, -3, 6.3, 0.2], [3, 0, 0.2, 6.3], [-3, 0, 0.2, 6.3]]) mesh(boxG(w, 0.35, d), border, x, 0.5, z, g);
  const crops = [];
  const stalkM = mat(0x8fbf3c), headM = mat(0x9bd13c);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const plant = new THREE.Group(); plant.position.set(-2.1 + c * 1.4, 0.6, -2.1 + r * 1.4); g.add(plant);
    for (let k = 0; k < 5; k++) {
      const a = k / 5 * Math.PI * 2, ox = Math.cos(a) * 0.15, oz = Math.sin(a) * 0.15;
      const st = mesh(cylG(0.025, 0.035, 1, 5), stalkM, ox, 0.5, oz, plant); st.rotation.set(oz * 0.8, 0, -ox * 0.8);
      const h = mesh(sphereG(0.09, 8), headM, ox * 1.5, 1.05, oz * 1.5, plant); h.scale.y = 2.2;
    }
    plant.scale.setScalar(0.3);
    crops.push(plant);
  }
  return { g, crops, stalkM, headM };
}

// The river shop: wooden market stall with a striped awning and crates of goods
export function shop() {
  const g = new THREE.Group();
  const wood = planks(0xc49a64, 1.5, 1);
  mesh(boxG(4, 2.4, 2.4), planks(0xf1e0c5, 2, 1), 0, 1.2, -0.3, g);
  mesh(boxG(3.6, 1, 0.8), wood, 0, 0.5, 1.3, g);                      // counter
  mesh(boxG(3.8, 0.12, 1), planks(0x8a5a2b, 2, 0.5), 0, 1.05, 1.3, g);
  for (const x of [-1.9, 1.9]) mesh(boxG(0.18, 3, 0.18), wood, x, 1.5, 1.7, g);
  // striped awning
  for (let i = 0; i < 8; i++) {
    const s = mesh(boxG(0.5, 0.08, 1.6), mat(i % 2 ? 0xffffff : 0xd9453b, { roughness: 0.7 }), -1.75 + i * 0.5, 3.0, 1.2, g);
    s.rotation.x = 0.28;
    mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.5, 12, 1, false, 0, Math.PI), mat(i % 2 ? 0xffffff : 0xd9453b), -1.75 + i * 0.5, 2.76, 1.98, g).rotation.set(0, 0, Math.PI / 2);
  }
  const roof = gableRoof(4, 2.4, 0.9, 0x5e3b1a, 0.2); roof.position.set(0, 2.4, -0.3); g.add(roof);
  // goods on the counter
  mesh(sphereG(0.18, 12), mat(0xd9453b), -1.2, 1.3, 1.3, g);
  mesh(sphereG(0.18, 12), mat(0xd9453b), -0.95, 1.3, 1.4, g);
  mesh(boxG(0.4, 0.25, 0.3), metal(0xc9c9d1), -0.2, 1.24, 1.3, g);
  mesh(sphereG(0.22, 12), mat(0xd99b4a), 0.5, 1.28, 1.3, g).scale.set(1.5, 0.8, 1);
  mesh(cylG(0.12, 0.12, 0.6, 10), textured('bark', 0xffffff), 1.2, 1.25, 1.3, g).rotation.z = Math.PI / 2;
  // crates and a sign
  const crate = planks(0xb07b3f, 1, 1);
  mesh(boxG(0.8, 0.8, 0.8), crate, 2.5, 0.4, 0.6, g); mesh(boxG(0.7, 0.7, 0.7), crate, 2.45, 1.15, 0.6, g);
  mesh(boxG(0.8, 0.8, 0.8), crate, -2.5, 0.4, 0.8, g);
  const barrel = mesh(cylG(0.4, 0.4, 0.9, 16), planks(0x8a5a2b, 2, 1), -2.5, 0.45, -0.6, g);
  for (const y of [0.2, 0.7]) mesh(cylG(0.42, 0.42, 0.06, 16), metal(0x555555), -2.5, y, -0.6, g);
  mesh(boxG(2, 0.6, 0.1), planks(0x8a5a2b, 1, 0.3), 0, 3.35, 2.0, g);
  return g;
}

// Respawn pad: glowing stone circle in the team color
export function respawnPad(color) {
  const g = new THREE.Group();
  mesh(cylG(1.7, 1.8, 0.2, 32), textured('stone', 0xcccccc, 2, 2), 0, 0.1, 0, g);
  mesh(cylG(1.3, 1.3, 0.05, 32), mat(color, { emissive: color, emissiveIntensity: 0.6 }), 0, 0.22, 0, g);
  const ring = mesh(new THREE.TorusGeometry(1.2, 0.08, 8, 40), mat(0xffffff, { emissive: color, emissiveIntensity: 1 }), 0, 0.4, 0, g);
  ring.rotation.x = Math.PI / 2;
  return { g, ring };
}

export { flat };
