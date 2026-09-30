import * as THREE from 'three';
import { mat, metal, textured, mesh, boxG, sphereG, cylG } from '../gfx/materials.js';

// 3D model for every inventory item. Used for the hotbar and shop icons.

function log(parent, x, y, z, len = 1.6, r = 0.32) {
  const side = textured('bark', 0xffffff, 1, 1);
  const end = textured('rings', 0xffffff);
  const m = mesh(cylG(r, r, len, 20), [side, end, end], x, y, z, parent);
  m.rotation.z = Math.PI / 2;
  return m;
}

function ingot(color, rough) {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(0.55, 0.8, 0.45, 4, 1);
  geo.rotateY(Math.PI / 4); geo.scale(1.5, 1, 0.8);
  mesh(geo, metal(color, { roughness: rough }), 0, 0, 0, g);
  const top = mesh(new THREE.BoxGeometry(1.1, 0.02, 0.4), metal(0xffffff, { roughness: 0.1, transparent: true, opacity: 0.35 }), 0, 0.23, 0, g);
  top.castShadow = false;
  return g;
}

function seedBag(color) {
  const g = new THREE.Group();
  const sack = mesh(sphereG(0.6, 24), textured('cloth', 0xc9a978, 3, 3), 0, -0.1, 0, g); sack.scale.set(1, 1.1, 0.9);
  mesh(cylG(0.18, 0.3, 0.35, 16), textured('cloth', 0xc9a978, 2, 1), 0, 0.6, 0, g);
  mesh(cylG(0.2, 0.2, 0.08, 16), mat(0x8c2a1c), 0, 0.52, 0, g);
  mesh(sphereG(0.22, 12), mat(color), 0, -0.05, 0.5, g).scale.z = 0.3;   // picture of the crop
  for (let i = 0; i < 6; i++) mesh(sphereG(0.06, 8), mat(0x8bbf3c), (Math.random() - 0.5) * 0.3, 0.8, (Math.random() - 0.5) * 0.2, g).scale.y = 1.5;
  return g;
}

export const ITEM_MODELS = {
  wood: () => {
    const g = new THREE.Group();
    log(g, 0, 0, 0.25); log(g, 0.05, 0, -0.4); log(g, 0.02, 0.55, -0.08, 1.5, 0.3);
    return g;
  },
  wheat: () => {
    const g = new THREE.Group();
    const stalk = mat(0xd9b24a), head = mat(0xe8c65a, { roughness: 0.6 });
    for (let i = 0; i < 11; i++) {
      const a = i / 11 * Math.PI * 2, r = i ? 0.12 : 0;
      const s = new THREE.Group(); s.rotation.set(Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25); g.add(s);
      mesh(cylG(0.025, 0.025, 1.8, 5), stalk, Math.cos(a) * r, 0, Math.sin(a) * r, s);
      const h = mesh(sphereG(0.09, 10), head, Math.cos(a) * r, 1.05, Math.sin(a) * r, s); h.scale.y = 3;
    }
    mesh(cylG(0.2, 0.2, 0.14, 16), mat(0x8c2a1c), 0, -0.1, 0, g);
    return g;
  },
  stone: () => {
    const g = new THREE.Group();
    const geo = new THREE.DodecahedronGeometry(0.7, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (1 + Math.sin(i) * 0.08), p.getY(i) * 0.75, p.getZ(i));
    geo.computeVertexNormals();
    mesh(geo, textured('stone', 0xbbbbbb, 1, 1, { flatShading: true }), 0, 0, 0, g);
    return g;
  },
  iron: () => ingot(0xd6d8de, 0.35),
  steel: () => ingot(0x7f95ab, 0.15),
  door: () => {
    const g = new THREE.Group();
    mesh(boxG(1, 1.9, 0.14), textured('planks', 0x8a5a2b, 1, 1.4), 0, 0, 0, g).material.map.rotation = Math.PI / 2;
    for (const y of [-0.6, 0.6]) mesh(boxG(1.02, 0.12, 0.18), mat(0x5e3b1a), 0, y, 0, g);
    mesh(boxG(0.14, 1.3, 0.18), mat(0x5e3b1a), 0, 0, 0, g).rotation.z = 0.62;
    mesh(sphereG(0.08, 12), metal(0xe0b64a), 0.35, 0, 0.12, g);
    return g;
  },
  bread: () => {
    const g = new THREE.Group();
    const loaf = mesh(sphereG(0.6, 32), mat(0xc98a3e, { roughness: 0.7 }), 0, 0, 0, g); loaf.scale.set(1.5, 0.75, 0.9);
    for (let i = -1; i <= 1; i++) { const c = mesh(boxG(0.08, 0.05, 0.6), mat(0xf1d7a0), i * 0.35, 0.42, 0, g); c.rotation.y = 0.5; }
    return g;
  },
  apple: () => {
    const g = new THREE.Group();
    const a = mesh(sphereG(0.6, 32), mat(0xd9453b, { roughness: 0.35 }), 0, 0, 0, g); a.scale.set(1, 0.92, 1);
    mesh(sphereG(0.16, 12), mat(0x9c2a22), 0, 0.5, 0, g).scale.y = 0.4;
    mesh(cylG(0.03, 0.04, 0.35, 6), mat(0x5e3b1a), 0.02, 0.68, 0, g).rotation.z = -0.2;
    const leaf = mesh(sphereG(0.14, 10), mat(0x4fb546), 0.18, 0.72, 0, g); leaf.scale.set(1.6, 0.25, 0.8); leaf.rotation.z = 0.4;
    return g;
  },
  seeds: () => {
    const g = new THREE.Group();
    const sack = mesh(sphereG(0.6, 24), textured('cloth', 0xc9a978, 3, 3), 0, -0.1, 0, g); sack.scale.set(1, 1.1, 0.9);
    mesh(cylG(0.18, 0.3, 0.35, 16), textured('cloth', 0xc9a978, 2, 1), 0, 0.6, 0, g);
    mesh(cylG(0.2, 0.2, 0.08, 16), mat(0x8c2a1c), 0, 0.52, 0, g);
    for (let i = 0; i < 6; i++) mesh(sphereG(0.06, 8), mat(0x8bbf3c), (Math.random() - 0.5) * 0.3, 0.8, (Math.random() - 0.5) * 0.2, g).scale.y = 1.5;
    return g;
  },
  carrotSeeds: () => seedBag(0xe8801a),
  pumpkinSeeds: () => seedBag(0xe8801a),
  cornSeeds: () => seedBag(0xf2d24a),
  sunSeeds: () => seedBag(0xffc21a),
  glass: () => {
    const g = new THREE.Group();
    mesh(boxG(1.4, 1.4, 0.1), mat(0xcff2ff, { transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2 }), 0, 0, 0, g);
    mesh(boxG(1.5, 0.08, 0.14), mat(0xf4f4f4), 0, 0.72, 0, g); mesh(boxG(1.5, 0.08, 0.14), mat(0xf4f4f4), 0, -0.72, 0, g);
    g.rotation.y = 0.5;
    return g;
  },
  carrot: () => {
    const g = new THREE.Group();
    mesh(new THREE.ConeGeometry(0.28, 1.3, 16), mat(0xe8801a, { roughness: 0.6 }), 0, -0.2, 0, g).rotation.x = Math.PI;
    for (let k = 0; k < 4; k++) { const l = mesh(new THREE.ConeGeometry(0.08, 0.6, 6), mat(0x4fb546), Math.cos(k * 1.6) * 0.08, 0.7, Math.sin(k * 1.6) * 0.08, g); l.rotation.z = Math.cos(k * 1.6) * 0.4; }
    g.rotation.z = -0.6;
    return g;
  },
  pumpkin: () => {
    const g = new THREE.Group();
    for (let k = 0; k < 8; k++) { const s = mesh(sphereG(0.45, 16), mat(0xe8801a, { roughness: 0.6 }), Math.cos(k / 8 * 6.28) * 0.28, 0, Math.sin(k / 8 * 6.28) * 0.28, g); s.scale.set(0.7, 1, 0.7); }
    mesh(cylG(0.07, 0.09, 0.3, 8), mat(0x5e3b1a), 0, 0.5, 0, g);
    return g;
  },
  corn: () => {
    const g = new THREE.Group();
    const cob = mesh(cylG(0.28, 0.24, 1.3, 16), mat(0xf2d24a, { roughness: 0.5 }), 0, 0, 0, g);
    for (let k = 0; k < 3; k++) { const h = mesh(boxG(0.3, 1.2, 0.03), mat(0x7cc242), Math.cos(k * 2.1) * 0.25, -0.15, Math.sin(k * 2.1) * 0.25, g); h.rotation.set(0, -k * 2.1, 0.25); }
    void cob; g.rotation.z = -0.5;
    return g;
  },
  sunflower: () => {
    const g = new THREE.Group();
    mesh(cylG(0.25, 0.25, 0.1, 20), mat(0x5e3b1a), 0, 0, 0, g).rotation.x = Math.PI / 2;
    for (let k = 0; k < 14; k++) { const p = mesh(sphereG(0.15, 8), mat(0xffc21a), Math.cos(k / 14 * 6.28) * 0.42, Math.sin(k / 14 * 6.28) * 0.42, 0, g); p.scale.set(1.5, 0.6, 0.3); p.rotation.z = k / 14 * 6.28; }
    mesh(cylG(0.05, 0.05, 1, 6), mat(0x4f9a36), 0, -0.8, -0.05, g);
    return g;
  },
  egg: () => {
    const g = new THREE.Group();
    mesh(sphereG(0.5, 24), mat(0xf4e3c8, { roughness: 0.5 }), 0, 0, 0, g).scale.set(0.8, 1.05, 0.8);
    return g;
  },
  honey: () => {
    const g = new THREE.Group();
    mesh(cylG(0.45, 0.42, 0.8, 20), mat(0xe8a020, { roughness: 0.15, transparent: true, opacity: 0.9 }), 0, 0, 0, g);
    mesh(cylG(0.48, 0.48, 0.14, 20), textured('cloth', 0xd9453b, 2, 1), 0, 0.46, 0, g);
    mesh(boxG(0.5, 0.3, 0.02), mat(0xf4ecd8), 0, 0, 0.44, g);
    return g;
  },
  sapling: () => {
    const g = new THREE.Group();
    mesh(cylG(0.45, 0.35, 0.6, 20), mat(0xb4603a, { roughness: 0.7 }), 0, -0.4, 0, g);
    mesh(cylG(0.4, 0.4, 0.06, 20), mat(0x4a2e17), 0, -0.1, 0, g);
    mesh(cylG(0.04, 0.06, 0.9, 6), mat(0x6b4424), 0, 0.35, 0, g);
    [[0.2, 0.6, 0], [-0.2, 0.75, 0.05], [0.05, 0.9, -0.1]].forEach(([x, y, z], i) => {
      const l = mesh(sphereG(0.2, 12), mat(0x4fb546), x, y, z, g); l.scale.set(1.3, 0.35, 0.8); l.rotation.z = i % 2 ? 0.5 : -0.5;
    });
    return g;
  },
  sword: () => {
    const g = new THREE.Group();
    mesh(boxG(0.16, 1.7, 0.05), metal(0xdfe6ee, { roughness: 0.12 }), 0, 0.45, 0, g);
    mesh(new THREE.ConeGeometry(0.113, 0.25, 4), metal(0xdfe6ee, { roughness: 0.12 }), 0, 1.42, 0, g).rotation.y = Math.PI / 4;
    mesh(boxG(0.7, 0.12, 0.14), metal(0xc9a24a, { roughness: 0.3 }), 0, -0.42, 0, g);
    mesh(cylG(0.07, 0.07, 0.5, 10), mat(0x4a2e17), 0, -0.73, 0, g);
    mesh(sphereG(0.1, 12), metal(0xc9a24a), 0, -1.0, 0, g);
    g.rotation.z = -0.7;
    return g;
  },
};
