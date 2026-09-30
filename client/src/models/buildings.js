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

// ======================================================================
// More things to build. Each returns a Group (y = 0 at ground level);
// anything that moves or glows is returned alongside so the game can animate it.
// ======================================================================

export function bed() {
  const g = new THREE.Group();
  const wood = planks(0x8a5a2b, 1, 0.5);
  mesh(boxG(1.6, 0.35, 2.6), wood, 0, 0.3, 0, g);
  for (const [x, z] of [[-0.72, -1.22], [0.72, -1.22], [-0.72, 1.22], [0.72, 1.22]]) mesh(boxG(0.14, 0.5, 0.14), wood, x, 0.25, z, g);
  mesh(boxG(1.7, 1.1, 0.15), wood, 0, 0.75, -1.3, g);                                  // headboard
  mesh(boxG(1.7, 0.6, 0.12), wood, 0, 0.5, 1.3, g);
  mesh(boxG(1.45, 0.22, 2.4), mat(0xf4ecd8, { roughness: 1 }), 0, 0.58, 0, g);          // mattress
  mesh(boxG(1.5, 0.12, 1.5), textured('cloth', 0x3a5a8c, 3, 3), 0, 0.72, 0.42, g);       // blanket
  mesh(boxG(1.52, 0.2, 0.1), textured('cloth', 0x3a5a8c, 3, 1), 0, 0.62, 1.17, g);
  mesh(sphereG(0.3, 16), mat(0xffffff, { roughness: 1 }), 0, 0.78, -0.9, g).scale.set(1.9, 0.5, 0.9); // pillow
  return g;
}

export function well() {
  const g = new THREE.Group();
  const stone = textured('stone', 0xcfcfcf, 2, 0.6);
  const ring = mesh(new THREE.CylinderGeometry(1, 1.05, 1, 20, 1, true), stone, 0, 0.5, 0, g); ring.material.side = THREE.DoubleSide;
  mesh(new THREE.TorusGeometry(1, 0.12, 8, 20), textured('stone', 0xb0b0b0), 0, 1, 0, g).rotation.x = Math.PI / 2;
  mesh(new THREE.CircleGeometry(0.95, 20), mat(0x2f6f8f, { roughness: 0.1, metalness: 0.3 }), 0, 0.6, 0, g).rotation.x = -Math.PI / 2;
  const wood = planks(0x8a5a2b, 0.3, 1);
  for (const x of [-0.95, 0.95]) mesh(boxG(0.14, 2, 0.14), wood, x, 1.5, 0, g);
  mesh(cylG(0.08, 0.08, 2.1, 8), wood, 0, 2.2, 0, g).rotation.z = Math.PI / 2;
  const roof = gableRoof(2.2, 1.4, 0.8, 0x9c3d2a, 0.15); roof.position.y = 2.5; g.add(roof);
  mesh(cylG(0.18, 0.15, 0.3, 10), planks(0x6b4424, 0.5, 0.3), 0.2, 1.7, 0, g);          // bucket
  mesh(cylG(0.01, 0.01, 0.5, 4), mat(0xcaa66a), 0.2, 1.95, 0, g);
  return g;
}

export function scarecrow() {
  const g = new THREE.Group();
  const wood = planks(0x8a5a2b, 0.3, 1);
  mesh(boxG(0.14, 2.6, 0.14), wood, 0, 1.3, 0, g);
  mesh(boxG(2, 0.12, 0.12), wood, 0, 1.9, 0, g);
  mesh(sphereG(0.6, 16), textured('plaid', 0xffffff, 1, 1), 0, 1.65, 0, g).scale.set(1, 1.1, 0.8);
  mesh(sphereG(0.38, 16), textured('cloth', 0xe0c890, 2, 2), 0, 2.55, 0, g);
  for (const x of [-0.13, 0.13]) mesh(sphereG(0.05, 8), mat(0x111111), x, 2.6, 0.34, g);
  mesh(new THREE.ConeGeometry(0.07, 0.25, 6), mat(0xe8801a), 0, 2.52, 0.42, g).rotation.x = Math.PI / 2;
  const straw = textured('straw', 0xffffff, 4, 1);
  mesh(cylG(0.8, 0.8, 0.05, 20), straw, 0, 2.85, 0, g);
  mesh(new THREE.ConeGeometry(0.4, 0.5, 16), straw, 0, 3.1, 0, g);
  for (const x of [-1, 1]) for (let k = 0; k < 4; k++) mesh(cylG(0.02, 0.02, 0.35, 4), mat(0xe3c04a), x * (1.02 + k * 0.02), 1.8 - k * 0.05, (k - 1.5) * 0.06, g).rotation.z = x * 0.6;
  return g;
}

// Windmill: returns { g, blades } so the game can turn the blades
export function windmill() {
  const g = new THREE.Group();
  mesh(cylG(1.2, 1.7, 5, 8), planks(0xf1e0c5, 3, 2), 0, 2.5, 0, g);
  mesh(new THREE.ConeGeometry(1.5, 1.6, 8), textured('shingles', 0x5b3a1e, 2, 1), 0, 5.8, 0, g);
  door(g, 0, 0.9, 1.62, 0.9, 1.6);
  windowFrame(g, 0, 3.3, 1.35, 0.6, 0.6);
  const blades = new THREE.Group(); blades.position.set(0, 4.6, 1.5); g.add(blades);
  mesh(cylG(0.2, 0.2, 0.5, 10), mat(0x5e3b1a), 0, 0, 0, blades).rotation.x = Math.PI / 2;
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Group(); arm.rotation.z = i * Math.PI / 2; blades.add(arm);
    mesh(boxG(0.14, 3.2, 0.08), planks(0x8a5a2b, 0.2, 1), 0, 1.7, 0.1, arm);
    mesh(boxG(0.8, 2.4, 0.04), textured('cloth', 0xf4ecd8, 1, 2), 0.45, 2, 0.12, arm);
  }
  return { g, blades };
}

// Chicken coop with three chickens that peck around it
export function chickenCoop() {
  const g = new THREE.Group();
  mesh(boxG(2.4, 1.6, 1.8), planks(0xc49a64, 1.2, 0.8), 0, 1.1, 0, g);
  for (const [x, z] of [[-1.1, -0.8], [1.1, -0.8], [-1.1, 0.8], [1.1, 0.8]]) mesh(boxG(0.14, 0.4, 0.14), planks(0x8a5a2b, 0.2, 0.2), x, 0.2, z, g);
  const roof = gableRoof(2.4, 1.8, 0.9, 0xb8372a, 0.2); roof.position.y = 1.9; g.add(roof);
  mesh(boxG(0.6, 0.6, 0.06), mat(0x3b2412), 0, 1.0, 0.92, g);
  const ramp = mesh(boxG(0.5, 0.06, 1.2), planks(0xb58656, 0.3, 0.5), 0, 0.45, 1.4, g); ramp.rotation.x = 0.55;
  const chickens = [];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Group(); g.add(c);
    mesh(sphereG(0.22, 12), mat(0xffffff), 0, 0.28, 0, c).scale.set(1, 0.9, 1.3);
    mesh(sphereG(0.12, 10), mat(0xffffff), 0, 0.5, 0.2, c);
    mesh(new THREE.ConeGeometry(0.04, 0.1, 6), mat(0xf2a33a), 0, 0.5, 0.33, c).rotation.x = Math.PI / 2;
    mesh(sphereG(0.05, 8), mat(0xd9453b), 0, 0.62, 0.2, c);
    mesh(new THREE.ConeGeometry(0.1, 0.2, 6), mat(0xf4f4f4), 0, 0.35, -0.28, c).rotation.x = -1.2;
    chickens.push({ c, a: i * 2.1, r: 1.8 + i * 0.3 });
  }
  return { g, chickens };
}

export function beehive() {
  const g = new THREE.Group();
  mesh(boxG(0.9, 0.3, 0.9), planks(0x8a5a2b, 0.5, 0.2), 0, 0.15, 0, g);
  for (let i = 0; i < 4; i++) mesh(cylG(0.45 - Math.abs(i - 1.5) * 0.05, 0.45 - Math.abs(i - 1.5) * 0.05, 0.28, 16), mat(0xe8b43a, { roughness: 0.8 }), 0, 0.45 + i * 0.27, 0, g);
  mesh(sphereG(0.3, 12), mat(0xe8b43a), 0, 1.5, 0, g).scale.y = 0.6;
  mesh(boxG(0.18, 0.1, 0.05), mat(0x3b2412), 0, 0.5, 0.44, g);
  const bees = [];
  for (let i = 0; i < 4; i++) { const b = mesh(sphereG(0.05, 6), mat(0xf2c21a), 0, 1, 0, g); b.castShadow = false; bees.push({ b, p: i * 1.7 }); }
  return { g, bees };
}

export function doghouse() {
  const g = new THREE.Group();
  mesh(boxG(1.4, 1.1, 1.6), planks(0xb8372a, 1, 0.8), 0, 0.55, 0, g);
  const roof = gableRoof(1.4, 1.6, 0.7, 0x5b3a1e, 0.15); roof.position.y = 1.1; g.add(roof);
  mesh(new THREE.CircleGeometry(0.35, 16, 0, Math.PI), mat(0x1c120a), 0, 0.2, 0.81, g);
  mesh(boxG(0.7, 0.4, 0.05), mat(0x1c120a), 0, 0.2, 0.81, g);
  mesh(boxG(0.8, 0.2, 0.08), planks(0xf1e0c5, 0.5, 0.2), 0, 1.0, 0.82, g);
  // dog lying outside
  const dog = new THREE.Group(); dog.position.set(0.3, 0, 1.4); g.add(dog);
  const fur = mat(0xc98a3e, { roughness: 1 });
  mesh(sphereG(0.3, 14), fur, 0, 0.25, 0, dog).scale.set(1, 0.8, 1.6);
  const head = mesh(sphereG(0.2, 14), fur, 0, 0.42, 0.45, dog);
  mesh(sphereG(0.08, 8), mat(0x1c120a), 0, 0.4, 0.66, dog);
  for (const x of [-0.14, 0.14]) mesh(sphereG(0.09, 8), mat(0x8a5a2b), x, 0.55, 0.4, dog).scale.set(0.6, 1.3, 0.6);
  const tail = mesh(cylG(0.03, 0.05, 0.35, 6), fur, 0, 0.35, -0.5, dog); tail.rotation.x = -0.8;
  return { g, tail, head };
}

export function silo() {
  const g = new THREE.Group();
  mesh(cylG(1.4, 1.4, 6, 24), metal(0xb8bec6, { roughness: 0.5 }), 0, 3, 0, g);
  for (let y = 0.6; y < 6; y += 1) mesh(cylG(1.43, 1.43, 0.08, 24), metal(0x8a8f94), 0, y, 0, g);
  mesh(new THREE.SphereGeometry(1.42, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), metal(0x9a3a2a, { roughness: 0.5 }), 0, 6, 0, g);
  for (let y = 0.3; y < 6; y += 0.4) mesh(boxG(0.4, 0.05, 0.05), metal(0x555555), 0, y, 1.45, g);
  return g;
}

export function greenhouse() {
  const g = new THREE.Group();
  const glass = mat(0xcff2ff, { transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.1 });
  const frame = mat(0xf4f4f4);
  mesh(boxG(4, 2, 3), glass, 0, 1, 0, g).castShadow = false;
  const shape = new THREE.Shape(); shape.moveTo(-2, 0); shape.lineTo(0, 1); shape.lineTo(2, 0); shape.lineTo(-2, 0);
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: 3, bevelEnabled: false }); roofGeo.translate(0, 0, -1.5);
  mesh(roofGeo, glass, 0, 2, 0, g).castShadow = false;
  for (const x of [-2, -1, 0, 1, 2]) for (const z of [-1.5, 1.5]) mesh(boxG(0.08, 2, 0.08), frame, x, 1, z, g);
  mesh(boxG(4, 0.08, 0.08), frame, 0, 2, 1.5, g); mesh(boxG(4, 0.08, 0.08), frame, 0, 2, -1.5, g);
  mesh(boxG(0.08, 0.08, 3), frame, 0, 3, 0, g);
  // plants inside
  for (let i = 0; i < 6; i++) {
    mesh(cylG(0.18, 0.14, 0.25, 10), mat(0xb4603a), -1.5 + i * 0.6, 0.55, 0.9, g);
    mesh(sphereG(0.22, 10), mat([0x4fb546, 0xd9453b, 0xffd84a][i % 3]), -1.5 + i * 0.6, 0.8, 0.9, g);
  }
  mesh(boxG(3.6, 0.4, 0.6), planks(0x8a5a2b, 2, 0.3), 0, 0.2, 0.9, g);
  return g;
}

// Lamp post: returns { g, light, bulb } so the game can switch it on at night
export function lampPost() {
  const g = new THREE.Group();
  const iron = metal(0x2b2b2b, { roughness: 0.5 });
  mesh(cylG(0.08, 0.12, 3, 10), iron, 0, 1.5, 0, g);
  mesh(cylG(0.2, 0.25, 0.2, 10), iron, 0, 0.1, 0, g);
  mesh(boxG(0.5, 0.06, 0.06), iron, 0.2, 2.9, 0, g);
  const bulbMat = mat(0xfff2c0, { emissive: 0xffc860, emissiveIntensity: 0 });
  const bulb = mesh(sphereG(0.18, 12), bulbMat, 0.4, 2.7, 0, g);
  mesh(new THREE.ConeGeometry(0.28, 0.25, 8), iron, 0.4, 2.92, 0, g);
  const light = new THREE.PointLight(0xffc070, 0, 9, 2); light.position.set(0.4, 2.6, 0); g.add(light);
  return { g, light, bulb };
}

export function bench() {
  const g = new THREE.Group();
  const wood = planks(0xb58656, 1, 0.3), iron = metal(0x2b2b2b);
  for (let i = 0; i < 3; i++) mesh(boxG(2, 0.08, 0.16), wood, 0, 0.55, -0.2 + i * 0.2, g);
  for (let i = 0; i < 2; i++) mesh(boxG(2, 0.16, 0.06), wood, 0, 0.85 + i * 0.22, -0.36, g).rotation.x = -0.2;
  for (const x of [-0.85, 0.85]) { mesh(boxG(0.08, 0.55, 0.5), iron, x, 0.28, 0, g); mesh(boxG(0.08, 0.6, 0.06), iron, x, 0.85, -0.36, g); }
  return g;
}

export function picnicTable() {
  const g = new THREE.Group();
  const wood = planks(0xb58656, 1, 0.5);
  mesh(boxG(2.2, 0.1, 1), wood, 0, 0.8, 0, g);
  for (const z of [-0.8, 0.8]) mesh(boxG(2.2, 0.08, 0.35), wood, 0, 0.45, z, g);
  for (const x of [-0.9, 0.9]) for (const s of [-1, 1]) { const l = mesh(boxG(0.1, 1.1, 0.1), wood, x, 0.4, s * 0.45, g); l.rotation.x = s * 0.55; }
  mesh(sphereG(0.14, 12), mat(0xd9453b), 0.3, 0.92, 0.1, g); mesh(sphereG(0.12, 12), mat(0xffd84a), 0.5, 0.9, -0.1, g);
  mesh(cylG(0.25, 0.2, 0.15, 12), planks(0x8a5a2b, 0.5, 0.2), -0.4, 0.92, 0, g);
  return g;
}

// Campfire: returns { g, flames, light }
export function campfire() {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const r = mesh(sphereG(0.22, 8), textured('stone', 0x9a9a9a), Math.cos(a) * 0.7, 0.12, Math.sin(a) * 0.7, g); r.scale.y = 0.7; }
  for (let i = 0; i < 4; i++) { const l = mesh(cylG(0.08, 0.08, 1, 8), textured('bark', 0xffffff), 0, 0.25, 0, g); l.rotation.set(0.9, i * Math.PI / 2, 0); }
  const flames = [];
  [[0xffd84a, 0.25, 0.9], [0xff8a1a, 0.35, 0.7], [0xd9331a, 0.42, 0.5]].forEach(([c, r, h], i) => {
    const f = mesh(new THREE.ConeGeometry(r, h, 8), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9 }), 0, 0.3 + h / 2, 0, g);
    f.castShadow = false; flames.push(f);
  });
  const light = new THREE.PointLight(0xff9040, 1.2, 8, 2); light.position.y = 1; g.add(light);
  return { g, flames, light };
}

export function mailbox() {
  const g = new THREE.Group();
  mesh(boxG(0.12, 1.2, 0.12), planks(0x8a5a2b, 0.2, 0.5), 0, 0.6, 0, g);
  const box = mesh(boxG(0.4, 0.4, 0.7), metal(0x3a5a8c, { roughness: 0.4 }), 0, 1.3, 0, g);
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 12, 1, false, 0, Math.PI), metal(0x3a5a8c, { roughness: 0.4 }), 0, 1.5, 0, g).rotation.set(Math.PI / 2, 0, Math.PI / 2);
  const flag = mesh(boxG(0.04, 0.3, 0.12), mat(0xd9453b), 0.23, 1.55, 0.2, g);
  void box; void flag;
  return g;
}

export function flowerBed() {
  const g = new THREE.Group();
  mesh(boxG(2.4, 0.3, 1.2), planks(0x8a5a2b, 1, 0.2), 0, 0.15, 0, g);
  mesh(boxG(2.2, 0.1, 1), textured('soil', 0xffffff, 1, 0.5), 0, 0.3, 0, g);
  const cols = [0xff6b8a, 0xffd84a, 0xffffff, 0xb48cff, 0xff8a1a];
  for (let i = 0; i < 14; i++) {
    const x = -0.95 + (i % 7) * 0.32, z = i < 7 ? -0.25 : 0.25;
    mesh(cylG(0.02, 0.02, 0.4, 4), mat(0x4f9a36), x, 0.5, z, g);
    mesh(sphereG(0.1, 8), mat(cols[i % 5]), x, 0.72, z, g).scale.y = 0.6;
  }
  return g;
}

export function haystack() {
  const g = new THREE.Group();
  const hay = mat(0xe3c04a, { roughness: 1, map: textured('straw', 0xffffff, 3, 2).map });
  mesh(sphereG(1.2, 20), hay, 0, 0.6, 0, g).scale.set(1, 0.9, 1);
  mesh(new THREE.ConeGeometry(0.9, 1, 16), hay, 0, 1.6, 0, g);
  mesh(cylG(0.03, 0.03, 1.4, 4), mat(0x8a5a2b), 0.7, 1.2, 0.3, g).rotation.z = 0.5;
  return g;
}

export function cart() {
  const g = new THREE.Group();
  const wood = planks(0xa0703f, 1, 0.4);
  mesh(boxG(1.8, 0.1, 1.2), wood, 0, 0.8, 0, g);
  for (const z of [-0.6, 0.6]) mesh(boxG(1.8, 0.45, 0.08), wood, 0, 1.05, z, g);
  mesh(boxG(0.08, 0.45, 1.2), wood, -0.9, 1.05, 0, g);
  for (const z of [-0.7, 0.7]) {
    const wheel = mesh(new THREE.TorusGeometry(0.45, 0.07, 8, 20), planks(0x5e3b1a, 0.5, 0.2), 0.2, 0.5, z, g);
    for (let k = 0; k < 4; k++) mesh(boxG(0.05, 0.85, 0.05), planks(0x5e3b1a, 0.2, 0.2), 0.2, 0.5, z, g).rotation.z = k * Math.PI / 4;
    void wheel;
  }
  for (const z of [-0.3, 0.3]) mesh(cylG(0.04, 0.04, 1.6, 6), wood, 1.7, 0.75, z, g).rotation.z = 1.35;
  for (let i = 0; i < 5; i++) mesh(sphereG(0.2, 10), mat([0xe8801a, 0xd9453b, 0x9bd13c][i % 3]), -0.5 + i * 0.25, 1.0, (i % 2 - 0.5) * 0.4, g);
  return g;
}

export function pond() {
  const g = new THREE.Group();
  mesh(new THREE.CircleGeometry(1.8, 24), mat(0x2f8fbf, { roughness: 0.08, metalness: 0.3 }), 0, 0.05, 0, g).rotation.x = -Math.PI / 2;
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const r = mesh(sphereG(0.28, 8), textured('stone', 0xaaaaaa), Math.cos(a) * 1.9, 0.08, Math.sin(a) * 1.9, g); r.scale.y = 0.5; }
  for (const [x, z] of [[-0.6, 0.4], [0.5, -0.5]]) { const p = mesh(new THREE.CircleGeometry(0.3, 12, 0.3, Math.PI * 1.8), mat(0x4fb546), x, 0.08, z, g); p.rotation.x = -Math.PI / 2; }
  mesh(sphereG(0.1, 8), mat(0xff9ad0), -0.6, 0.12, 0.4, g);
  const duck = new THREE.Group(); duck.position.set(0.4, 0.1, 0.6); g.add(duck);
  mesh(sphereG(0.2, 10), mat(0xffffff), 0, 0.1, 0, duck).scale.set(1, 0.7, 1.4);
  mesh(sphereG(0.12, 10), mat(0x2e7d4f), 0, 0.28, 0.2, duck);
  mesh(new THREE.ConeGeometry(0.05, 0.12, 6), mat(0xf2a33a), 0, 0.27, 0.35, duck).rotation.x = Math.PI / 2;
  return { g, duck };
}

// Team flag: returns { g, cloth } so it can wave
export function flag(color) {
  const g = new THREE.Group();
  mesh(cylG(0.06, 0.08, 4, 10), metal(0xdddddd), 0, 2, 0, g);
  mesh(sphereG(0.12, 10), metal(0xe0b64a), 0, 4.05, 0, g);
  const geo = new THREE.PlaneGeometry(1.6, 1, 10, 4); geo.translate(0.8, 0, 0);
  const cloth = mesh(geo, mat(color, { side: THREE.DoubleSide, roughness: 0.8 }), 0.06, 3.4, 0, g);
  cloth.userData.base = geo.attributes.position.array.slice();
  return { g, cloth };
}

// Crop patch for any crop. Returns { g, crops, parts } where parts are the
// materials that change colour as it ripens.
export const CROPS = {
  wheat:     { name: 'Wheat',     young: 0x9bd13c, ripe: 0xe8c65a },
  carrot:    { name: 'Carrots',   young: 0x4fb546, ripe: 0xe8801a },
  pumpkin:   { name: 'Pumpkins',  young: 0x6fb24a, ripe: 0xe8801a },
  corn:      { name: 'Corn',      young: 0x7cc242, ripe: 0xf2d24a },
  sunflower: { name: 'Sunflowers', young: 0x6fb24a, ripe: 0xffc21a },
};
export function cropPatch(kind) {
  if (kind === 'wheat') { const f = farm(); return { g: f.g, crops: f.crops, parts: [f.headM], young: CROPS.wheat.young, ripe: CROPS.wheat.ripe }; }
  const g = new THREE.Group();
  mesh(boxG(5, 0.3, 5), textured('soil', 0xffffff, 1.2, 1.2), 0, 0.45, 0, g);
  const border = planks(0x8a5a2b, 2, 0.2);
  for (const [x, z, w, d] of [[0, 2.5, 5.3, 0.2], [0, -2.5, 5.3, 0.2], [2.5, 0, 0.2, 5.3], [-2.5, 0, 0.2, 5.3]]) mesh(boxG(w, 0.35, d), border, x, 0.5, z, g);
  const leafM = mat(0x4fb546), partM = mat(CROPS[kind].young);
  const crops = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const p = new THREE.Group(); p.position.set(-1.6 + c * 1.6, 0.6, -1.6 + r * 1.6); g.add(p);
    if (kind === 'carrot') {
      for (let k = 0; k < 4; k++) { const l = mesh(new THREE.ConeGeometry(0.08, 0.6, 5), leafM, Math.cos(k * 1.6) * 0.1, 0.35, Math.sin(k * 1.6) * 0.1, p); l.rotation.z = Math.cos(k * 1.6) * 0.4; }
      mesh(new THREE.ConeGeometry(0.16, 0.25, 8), partM, 0, 0.05, 0, p).rotation.x = Math.PI;
    } else if (kind === 'pumpkin') {
      for (let k = 0; k < 3; k++) { const l = mesh(sphereG(0.22, 8), leafM, Math.cos(k * 2) * 0.4, 0.1, Math.sin(k * 2) * 0.4, p); l.scale.y = 0.2; }
      const pk = mesh(sphereG(0.45, 16), partM, 0, 0.3, 0, p); pk.scale.set(1.15, 0.8, 1.15);
      mesh(cylG(0.05, 0.06, 0.2, 6), mat(0x5e3b1a), 0, 0.68, 0, p);
    } else if (kind === 'corn') {
      mesh(cylG(0.06, 0.08, 2.2, 6), leafM, 0, 1.1, 0, p);
      for (let k = 0; k < 4; k++) { const l = mesh(boxG(0.08, 0.9, 0.02), leafM, 0, 0.8 + k * 0.35, 0, p); l.rotation.set(0, k * 1.6, 0.6); }
      mesh(cylG(0.1, 0.1, 0.45, 8), partM, 0.14, 1.3, 0, p).rotation.z = -0.3;
    } else if (kind === 'sunflower') {
      mesh(cylG(0.05, 0.07, 2.2, 6), leafM, 0, 1.1, 0, p);
      const head = new THREE.Group(); head.position.set(0, 2.25, 0.08); head.rotation.x = -0.5; p.add(head);
      mesh(cylG(0.2, 0.2, 0.08, 16), mat(0x5e3b1a), 0, 0, 0, head).rotation.x = Math.PI / 2;
      for (let k = 0; k < 12; k++) { const pe = mesh(sphereG(0.1, 6), partM, Math.cos(k / 12 * 6.28) * 0.3, Math.sin(k / 12 * 6.28) * 0.3, 0, head); pe.scale.set(1.4, 0.6, 0.3); pe.rotation.z = k / 12 * 6.28; }
    }
    p.scale.setScalar(0.3);
    crops.push(p);
  }
  return { g, crops, parts: [partM], young: CROPS[kind].young, ripe: CROPS[kind].ripe };
}
