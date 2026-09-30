import * as THREE from 'three';
import { tex } from './textures.js';

// Smooth, lit materials. flat: true gives the faceted look (rocks, leaves).
export const mat = (color, o = {}) =>
  new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85 }, o));
export const flat = (color, o = {}) => mat(color, Object.assign({ flatShading: true }, o));
export const metal = (color, o = {}) => mat(color, Object.assign({ metalness: 0.75, roughness: 0.3 }, o));
export const textured = (key, color, rx = 1, ry = 1, o = {}) => mat(color, Object.assign({ map: tex(key, rx, ry) }, o));

// Build a mesh, place it, give it shadows and add it to a parent
export function mesh(geo, material, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
export const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d);
export const sphereG = (r, seg = 24) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75));
export const cylG = (rt, rb, h, seg = 20) => new THREE.CylinderGeometry(rt, rb, h, seg);
