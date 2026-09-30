import * as THREE from 'three';
import { tex } from '../gfx/textures.js';
import * as N from '../models/nature.js';
import * as B from '../models/buildings.js';
import * as M from '../gfx/materials.js';

// The island. With 2 teams: two lands side by side and a river between them
// (spring in the north, waterfall in the south). With 3 teams: three lands
// around a lake; three rivers run from the lake to the sea. The shop always
// sits on a small island in the middle.
//
// Every land has a local frame: `dir` points out to sea, `side` across it.
// land.at(out, across) turns local numbers into a world position, so trees,
// respawn pads and bots work the same on every land.

export const TEAM_COLORS = [0x3d7fc4, 0xe0762b, 0x8a4fc4];
export const TEAM_NAMES = ['Blue', 'Orange', 'Purple'];
const GROUND = 0.42;       // height of the grass
const BASE = -0.3;         // top of the island rock under rivers

export function createMap(scene, teams = 2) {
  const group = new THREE.Group(); scene.add(group);
  const lands = [], rivers = [], docks = [], anim = { falls: [], foams: [], river: null };
  let islandR, shopR, shopAt = { x: 0, z: 0 }, shopRot = 0, bounds;

  if (teams <= 2) {
    const W = 26, D = 34, RIV = 8, X = RIV / 2 + W;
    bounds = { x: X, z: D / 2 };
    for (const [i, s] of [[0, -1], [1, 1]]) {
      const x0 = s < 0 ? -X : RIV / 2, x1 = s < 0 ? -RIV / 2 : X;
      lands.push(makeLand(i, s < 0 ? Math.PI : 0, { x: s * (RIV / 2 + W / 2), z: 0 },
        [[x0, -D / 2], [x1, -D / 2], [x1, D / 2], [x0, D / 2]]));
    }
    rivers.push({ a: { x: 0, z: -D / 2 }, b: { x: 0, z: D / 2 }, w: RIV, spring: true });
    shopR = 3.3;
    for (const s of [-1, 1]) docks.push(rect(s * 3.6, 1.6, 1, 0, 1.4, 0.9));
    // island rock under the river + water
    box(group, RIV, 2.2, D, soil(2, 1), 0, BASE - 1.1, 0);
    water(group, new THREE.PlaneGeometry(RIV, D), 1.5, 6, anim);
    spring(group, RIV, -D / 2 - 1.2, anim);
    fall(group, RIV - 1.4, 0, D / 2, 0, anim);
  } else {
    // three lands around a lake
    const R = 34, LAKE = 9, RIV = 7, hw = RIV / 2;
    islandR = R; bounds = { x: R, z: R };
    const riverAngles = [90, 210, 330].map(d => d * Math.PI / 180);
    const landAngles = [270, 30, 150].map(d => d * Math.PI / 180);
    landAngles.forEach((phi, i) => {
      const r0 = phi - Math.PI / 3, r1 = phi + Math.PI / 3;
      const poly = [];
      const steps = 14;
      for (let k = 0; k <= steps; k++) { const t = r0 + Math.asin(hw / R) + (r1 - r0 - 2 * Math.asin(hw / R)) * k / steps; poly.push([Math.cos(t) * R, Math.sin(t) * R]); }
      for (let r = R; r >= LAKE; r -= 4) { const t = r1 - Math.asin(hw / r); poly.push([Math.cos(t) * r, Math.sin(t) * r]); }
      for (let k = 0; k <= 6; k++) { const t = r1 - Math.asin(hw / LAKE) - (r1 - r0 - 2 * Math.asin(hw / LAKE)) * k / 6; poly.push([Math.cos(t) * LAKE, Math.sin(t) * LAKE]); }
      for (let r = LAKE; r <= R; r += 4) { const t = r0 + Math.asin(hw / r); poly.push([Math.cos(t) * r, Math.sin(t) * r]); }
      lands.push(makeLand(i, phi, { x: Math.cos(phi) * 21, z: Math.sin(phi) * 21 }, poly));
    });
    riverAngles.forEach(t => rivers.push({ a: { x: Math.cos(t) * LAKE, z: Math.sin(t) * LAKE }, b: { x: Math.cos(t) * R, z: Math.sin(t) * R }, w: RIV }));
    shopR = 4.3;
    landAngles.forEach(phi => docks.push(rect(Math.cos(phi) * 6.9, Math.sin(phi) * 6.9, Math.cos(phi), Math.sin(phi), 2.9, 0.9)));
    shopRot = Math.PI; // counter faces the first land
    const base = new THREE.Mesh(new THREE.CylinderGeometry(R, R - 1, 2.2, 64), soil(10, 1));
    base.position.y = BASE - 1.1; base.receiveShadow = true; group.add(base);
    water(group, new THREE.CircleGeometry(R - 0.2, 64), 6, 6, anim);
    riverAngles.forEach(t => fall(group, RIV - 1.2, Math.cos(t) * (R + 0.1), Math.sin(t) * (R + 0.1), t, anim));
  }

  // lands: flat grass on a soil cliff, sandy bank, decorations
  for (const land of lands) buildLand(group, land, anim);

  // shop island + docks
  const isle = new THREE.Mesh(new THREE.CylinderGeometry(shopR, shopR + 0.3, 1, 32), new THREE.MeshStandardMaterial({ color: 0xe6d08e, roughness: 1 }));
  isle.position.set(shopAt.x, 0, shopAt.z); isle.receiveShadow = true; group.add(isle);
  const shop = B.shop(); shop.position.set(shopAt.x, 0.5, shopAt.z - (teams <= 2 ? 0.9 : 0)); shop.rotation.y = shopRot; group.add(shop);
  for (const d of docks) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(d.hl * 2 + 0.2, 0.2, d.hw * 2), M.textured('planks', 0xb58656, 1, 1));
    m.position.set(d.x, 0.35, d.z); m.rotation.y = Math.atan2(-d.uz, d.ux); m.castShadow = m.receiveShadow = true; group.add(m);
  }
  const shopBox = teams <= 2 ? rect(0, -1.1, 1, 0, 2.1, 1.5) : rect(0, 0, Math.cos(shopRot), -Math.sin(shopRot), 2.1, 1.5);

  // ---------- queries ----------
  const bridges = [];
  function onLand(x, z, i, margin = 0.6) {
    const l = lands[i];
    return pointInPoly(x, z, l.poly) && edgeDist(x, z, l.poly) > margin;
  }
  function landAt(x, z) { return lands.findIndex((_, i) => onLand(x, z, i, 0)); }
  function walkable(x, z) {
    if (lands.some((_, i) => onLand(x, z, i, 0.5))) return true;
    if (Math.hypot(x - shopAt.x, z - shopAt.z) < shopR - 0.4) return true;
    return docks.some(d => inRect(d, x, z)) || bridges.some(b => inRect(b, x, z));
  }
  function blocked(x, z, r) { return inRect(shopBox, x, z, r); }
  function nearShop(x, z) { return Math.hypot(x - shopAt.x, z - shopAt.z) < shopR + 1.6; }

  // Where a bridge would go if the farmer at (x,z) builds one now
  function bridgeSpot(x, z, myLand) {
    let best = null;
    for (const r of rivers) {
      const dx = r.b.x - r.a.x, dz = r.b.z - r.a.z, len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
      const t = ((x - r.a.x) * ux + (z - r.a.z) * uz) / len;
      const px = r.a.x + dx * t, pz = r.a.z + dz * t, d = Math.hypot(x - px, z - pz);
      if (!best || d < best.d) best = { d, t, px, pz, ux, uz, w: r.w };
    }
    if (!best) return null;
    const across = { ux: -best.uz, uz: best.ux };
    const ok = best.d < best.w / 2 + 3 && best.t > 0.12 && best.t < 0.9 && onLand(x, z, myLand, 0) &&
      Math.abs(best.t * 1 - 0.5) > 0.0 && !docks.some(d => Math.hypot(d.x - best.px, d.z - best.pz) < 4) &&
      !bridges.some(b => Math.hypot(b.x - best.px, b.z - best.pz) < 4);
    return { ...rect(best.px, best.pz, across.ux, across.uz, best.w / 2 + 1, 1.2), ok };
  }
  function addBridge(spot) {
    const m = B.bridge(spot.hl * 2 - 0.4);
    m.position.set(spot.x, 0.35, spot.z); m.rotation.y = Math.atan2(-spot.uz, spot.ux);
    group.add(m); bridges.push(spot);
  }

  function update(dt, tm) {
    if (anim.river) anim.river.offset.y -= dt * 0.18;
    anim.falls.forEach(m => { m.map.offset.y += dt * 0.9; });
    anim.foams.forEach(f => { f.material.opacity = 0.3 + Math.sin(tm * 2 + f.id) * 0.12; });
  }
  function dispose() { scene.remove(group); }

  return { group, lands, rivers, bounds, shop, shopAt, onLand, landAt, walkable, blocked, nearShop, bridgeSpot, addBridge, update, dispose, teams };
}

// ---------- land ----------
function makeLand(i, phi, center, poly) {
  const dir = { x: Math.cos(phi), z: Math.sin(phi) }, side = { x: -Math.sin(phi), z: Math.cos(phi) };
  return {
    i, phi, center, poly, dir, side, color: TEAM_COLORS[i], name: TEAM_NAMES[i],
    at: (out, across) => ({ x: center.x + dir.x * out + side.x * across, z: center.z + dir.z * out + side.z * across }),
    sample() {
      const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
      for (let k = 0; k < 40; k++) {
        const x = min(xs) + Math.random() * (max(xs) - min(xs)), z = min(zs) + Math.random() * (max(zs) - min(zs));
        if (pointInPoly(x, z, poly) && edgeDist(x, z, poly) > 0.6) return { x, z };
      }
      return { ...center };
    },
  };
}

function buildLand(group, land, anim) {
  const shape = new THREE.Shape(land.poly.map(([x, z]) => new THREE.Vector2(x, -z)));
  // soil cliff
  const cliff = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: GROUND - BASE + 0.4, bevelEnabled: false }),
    [new THREE.MeshStandardMaterial({ color: 0x5aa23a, roughness: 1 }), soil(0.25, 0.6)]);
  cliff.rotation.x = -Math.PI / 2; cliff.position.y = BASE - 0.4; cliff.receiveShadow = true; cliff.castShadow = true; group.add(cliff);
  // sandy bank just outside the land
  const bank = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(offsetPoly(land.poly, 0.9).map(([x, z]) => new THREE.Vector2(x, -z)))),
    new THREE.MeshStandardMaterial({ color: 0xd9c28c, roughness: 1 }));
  bank.rotation.x = -Math.PI / 2; bank.position.y = -0.02; bank.receiveShadow = true; group.add(bank);
  // flat grass top with soft colour patches
  const geo = new THREE.ShapeGeometry(shape, 4);
  const pos = geo.attributes.position, cols = [], c = new THREE.Color(), light = new THREE.Color(0x86c95a), dark = new THREE.Color(0x5f9f3e);
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = -pos.getY(k);
    const n = Math.sin(x * 0.21) * Math.cos(z * 0.17) * 0.5 + Math.sin(x * 0.05 + z * 0.08) * 0.5;
    c.copy(dark).lerp(light, 0.5 + n * 0.5); cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const top = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, map: tex('grass', 0.12, 0.12) }));
  top.material.map.repeat.set(0.12, 0.12);
  top.rotation.x = -Math.PI / 2; top.position.y = GROUND + 0.001; top.receiveShadow = true; group.add(top);
  // foam where the bank meets the water
  const foam = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(offsetPoly(land.poly, 1.5).map(([x, z]) => new THREE.Vector2(x, -z)))),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }));
  foam.rotation.x = -Math.PI / 2; foam.position.y = -0.14; foam.id2 = land.i; group.add(foam); anim.foams.push(foam);
  // decorations: flowers, rocks and bushes near the edges, pebbles on the bank
  const petals = [0xffffff, 0xffd84a, 0xff7aa8, 0xb48cff];
  for (let k = 0; k < 40; k++) { const p = land.sample(); const f = N.flower(petals[k % 4]); f.position.set(p.x, GROUND, p.z); group.add(f); }
  const n = land.poly.length;
  for (let k = 0; k < 18; k++) {
    const e = Math.floor(Math.random() * n), [ax, az] = land.poly[e], [bx, bz] = land.poly[(e + 1) % n], t = Math.random();
    let x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    x += (land.center.x - x) * 0.04; z += (land.center.z - z) * 0.04;
    const d = k % 3 ? N.bush() : N.rock();
    d.position.set(x, GROUND, z); group.add(d);
  }
}

// ---------- water pieces ----------
function water(group, geo, rx, ry, anim) {
  const t = tex('water', rx, ry);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x2aa9c4, map: t, roughness: 0.5, metalness: 0, transparent: true, opacity: 0.94 }));
  m.rotation.x = -Math.PI / 2; m.position.y = -0.12; m.receiveShadow = true; group.add(m);
  anim.river = t;
}
function fall(group, w, x, z, angle, anim) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xbfefff, map: tex('water', 1, 1), transparent: true, opacity: 0.85, roughness: 0.1, side: THREE.DoubleSide });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.4), mat);
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.PI / 2 - angle; group.add(g);
  f.rotation.x = -0.25; f.position.set(0, -0.5, 0.15); g.add(f);
  const foam = new THREE.Mesh(new THREE.CircleGeometry(3.2, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
  foam.rotation.x = -Math.PI / 2; foam.scale.set(1.4, 0.7, 1); foam.position.set(0, -0.6, 1.4); g.add(foam);
  anim.falls.push(mat); anim.foams.push(foam);
}
function spring(group, w, z, anim) {
  const g = new THREE.Group(); g.position.set(0, 0, z); group.add(g);
  box(g, w + 3, 2.4, 3.2, new THREE.MeshStandardMaterial({ color: 0x8a8f94, map: tex('stone', 3, 1), roughness: 1 }), 0, -0.6, 0);
  for (let i = 0; i < 9; i++) { const r = N.rock(); r.scale.setScalar(1.6 + Math.random() * 1.6); r.position.set((Math.random() - 0.5) * (w + 2), 0.9 + Math.random() * 1.4, (Math.random() - 0.5) * 2); g.add(r); }
  const mat = new THREE.MeshStandardMaterial({ color: 0xbfefff, map: tex('water', 1, 1), transparent: true, opacity: 0.85, roughness: 0.1, side: THREE.DoubleSide });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), mat); f.position.set(0, 1.1, 1.62); g.add(f);
  anim.falls.push(mat);
}

// ---------- geometry helpers ----------
const soil = (rx, ry) => new THREE.MeshStandardMaterial({ color: 0x9b6a3c, map: tex('soil', rx, ry), roughness: 1 });
function box(parent, w, h, d, material, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); m.receiveShadow = true; parent.add(m); return m;
}
// An oriented rectangle: centre, unit axis u, half length along u, half width across
function rect(x, z, ux, uz, hl, hw) { const l = Math.hypot(ux, uz) || 1; return { x, z, ux: ux / l, uz: uz / l, hl, hw }; }
function inRect(r, x, z, pad = 0) {
  const dx = x - r.x, dz = z - r.z;
  return Math.abs(dx * r.ux + dz * r.uz) < r.hl + pad && Math.abs(-dx * r.uz + dz * r.ux) < r.hw + pad;
}
export function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function edgeDist(x, z, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, az] = poly[j], [bx, bz] = poly[i], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
// Push every edge of a polygon outward by d (for banks and foam)
function offsetPoly(poly, d) {
  const n = poly.length, out = [];
  let area = 0; for (let i = 0; i < n; i++) { const [x1, z1] = poly[i], [x2, z2] = poly[(i + 1) % n]; area += x1 * z2 - x2 * z1; }
  const s = area > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const [px, pz] = poly[(i - 1 + n) % n], [cx, cz] = poly[i], [nx, nz] = poly[(i + 1) % n];
    const n1 = normal(px, pz, cx, cz, s), n2 = normal(cx, cz, nx, nz, s);
    let mx = n1[0] + n2[0], mz = n1[1] + n2[1]; const ml = Math.hypot(mx, mz) || 1; mx /= ml; mz /= ml;
    const k = d / Math.max(0.3, mx * n1[0] + mz * n1[1]);
    out.push([cx + mx * k, cz + mz * k]);
  }
  return out;
}
function normal(ax, az, bx, bz, s) { const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1; return [s * dz / l, -s * dx / l]; }
const min = a => Math.min(...a), max = a => Math.max(...a);
