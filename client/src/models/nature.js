import * as THREE from 'three';
import { mat, flat, textured, mesh, cylG } from '../gfx/materials.js';

// A lumpy leaf cluster: an icosphere with its points pushed in and out
function leafBlob(r, color) {
  const geo = new THREE.IcosahedronGeometry(r, 2);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 1 + Math.sin(v.x * 3.1) * 0.08 + Math.cos(v.y * 2.7 + v.z) * 0.08 + (Math.random() - 0.5) * 0.06;
    v.multiplyScalar(n); p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return mesh(geo, flat(color, { roughness: 0.8 }));
}

// Oak-style tree: tapered bark trunk, two branches, five leaf clusters in three greens.
// Returns { g, top, trunk } so the game can shake the leaves and cut it down.
export function tree() {
  const g = new THREE.Group();
  const bark = textured('bark', 0xffffff, 2, 2);
  const trunk = mesh(cylG(0.32, 0.5, 3.2, 12), bark, 0, 1.6, 0, g);
  const roots = new THREE.Group(); g.add(roots);
  for (let i = 0; i < 4; i++) {
    const r = mesh(new THREE.ConeGeometry(0.22, 0.9, 6), bark, 0, 0.2, 0, roots);
    const a = i / 4 * Math.PI * 2 + 0.4; r.position.set(Math.cos(a) * 0.45, 0.2, Math.sin(a) * 0.45); r.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2);
  }
  const top = new THREE.Group(); g.add(top);
  for (const s of [-1, 1]) { const b = mesh(cylG(0.1, 0.18, 1.6, 8), bark, s * 0.6, 3.2, 0.1, top); b.rotation.z = -s * 0.8; }
  const greens = [0x3f9b3a, 0x4fb546, 0x2f7f2c];
  [[0, 4.2, 0, 1.9], [1.3, 3.8, 0.3, 1.3], [-1.3, 3.9, -0.2, 1.35], [0.4, 5.2, -0.3, 1.25], [-0.4, 4.6, 1.0, 1.1]]
    .forEach(([x, y, z, r], i) => { const b = leafBlob(r, greens[i % 3]); b.position.set(x, y, z); top.add(b); });
  // a couple of apples
  for (const [x, y, z] of [[1.1, 3.4, 1.0], [-0.9, 3.6, 1.1], [0.2, 3.3, 1.7]]) mesh(new THREE.SphereGeometry(0.16, 12, 10), mat(0xd9453b, { roughness: 0.4 }), x, y, z, top);
  return { g, top, trunk };
}

export function bush() {
  const g = new THREE.Group();
  const c = [0x3f9b3a, 0x4fb546][Math.floor(Math.random() * 2)];
  for (let i = 0; i < 3; i++) { const b = leafBlob(0.45 + Math.random() * 0.25, c); b.position.set((i - 1) * 0.45, 0.35, (Math.random() - 0.5) * 0.3); b.scale.y = 0.8; g.add(b); }
  return g;
}

export function rock() {
  const geo = new THREE.DodecahedronGeometry(0.4 + Math.random() * 0.4, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) * 0.6);
  geo.computeVertexNormals();
  const m = mesh(geo, flat(0x9aa0a6, { roughness: 0.95 }));
  m.rotation.y = Math.random() * 6;
  return m;
}

export function flower(color) {
  const g = new THREE.Group();
  mesh(cylG(0.02, 0.02, 0.35, 4), mat(0x4f9a36), 0, 0.17, 0, g);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2;
    const p = mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(color), Math.cos(a) * 0.08, 0.36, Math.sin(a) * 0.08, g);
    p.scale.y = 0.4; p.castShadow = false;
  }
  mesh(new THREE.SphereGeometry(0.05, 8, 6), mat(0xffc93a), 0, 0.38, 0, g);
  return g;
}
