import * as THREE from 'three';
import { mat, metal, textured, mesh, boxG, sphereG, cylG } from '../gfx/materials.js';
import { patternTex } from '../gfx/textures.js';
import { sanitizeLook, PRESETS } from '../../../shared/looks.js';

// Every farmer is round-bellied, short-legged and waddles when they walk.
// buildFarmer takes a preset key ('zino', 'arjun', ...) or a look object.
export { PRESETS };

const darker = (hex, amt = -0.12) => new THREE.Color(hex).offsetHSL(0, 0, amt);

export function buildFarmer(lookOrKey) {
  const o = sanitizeLook(lookOrKey);
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const skin = mat(o.skin, { roughness: 0.7 });
  const shirt = o.pattern === 'plain' ? textured('cloth', o.top, 3, 3) : mat(0xffffff, { map: patternTex(o.pattern, o.top, 2, 2) });
  const lower = textured('cloth', o.bottomColor, 4, 4);
  const hairM = mat(o.hairColor, { roughness: 0.9 });
  const hatM = mat(o.hatColor, { roughness: 0.85 });

  // ---- body ----
  mesh(sphereG(1, 32), shirt, 0, 1.3, 0, body).scale.set(1.12, 1.05, 1.02);
  if (o.bottom === 'overalls') {
    mesh(sphereG(1.03, 32), lower, 0, 1.02, 0, body).scale.set(1.14, 0.78, 1.05);
    const bib = mesh(boxG(0.95, 0.7, 0.2), lower, 0, 1.55, 0.86, body); bib.rotation.x = -0.25;
    for (const x of [-0.4, 0.4]) {
      mesh(boxG(0.18, 1.0, 0.1), lower, x, 2.0, 0.62, body).rotation.x = -0.55;
      mesh(sphereG(0.08, 12), metal(0xe0b64a), x, 1.84, 0.92, body);
    }
  } else if (o.bottom === 'trousers') {
    mesh(sphereG(1.03, 32), lower, 0, 0.95, 0, body).scale.set(1.13, 0.62, 1.04);
    mesh(cylG(1.07, 1.07, 0.14, 32), mat(0x3b2412), 0, 1.25, 0, body).scale.z = 0.97; // belt
    mesh(boxG(0.28, 0.2, 0.06), metal(0xe0b64a), 0, 1.25, 1.04, body);
  } else {
    // robe / skirt: a bell that flows down to the feet
    const long = o.bottom === 'robe';
    const bell = mesh(cylG(1.02, long ? 1.2 : 1.15, long ? 1.5 : 1.1, 32), long ? shirtOr(o, shirt, lower) : lower, 0, long ? 0.78 : 0.95, 0, body);
    bell.scale.z = 0.95;
    if (!long) mesh(cylG(1.08, 1.08, 0.1, 32), mat(0xffd84a), 0, 1.45, 0, body);
  }

  // ---- head ----
  mesh(sphereG(0.58, 32), skin, 0, 2.62, 0, body);
  mesh(sphereG(0.17, 16), mat(darker(o.skin, -0.06), { roughness: 0.7 }), 0, 2.56, 0.56, body);
  for (const x of [-0.56, 0.56]) mesh(sphereG(0.13, 12), skin, x, 2.62, 0, body).scale.set(0.6, 1, 1);
  for (const x of [-0.21, 0.21]) {
    mesh(sphereG(0.09, 12), mat(0xffffff, { roughness: 0.3 }), x, 2.74, 0.47, body);
    mesh(sphereG(0.05, 10), mat(0x1c120a, { roughness: 0.2 }), x, 2.74, 0.54, body);
    const brow = mesh(boxG(0.22, 0.06, 0.08), hairM, x, 2.88, 0.5, body); brow.rotation.z = x > 0 ? -0.15 : 0.15;
    mesh(sphereG(0.1, 10), mat(0xf0a09a, { transparent: true, opacity: 0.45 }), x * 1.6, 2.5, 0.42, body);
  }
  mesh(boxG(0.22, 0.04, 0.05), mat(darker(o.skin, -0.25)), 0, 2.38, 0.54, body); // smile line

  // ---- hair ----
  const hat = o.hat;
  const coversHair = ['hijab', 'headscarf', 'turban', 'keffiyeh', 'ushanka', 'headwrap'].includes(hat);
  if (!coversHair && o.hair !== 'bald') {
    const cap = mesh(new THREE.SphereGeometry(0.6, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, 2.66, -0.05, body);
    cap.rotation.x = -0.35;
    if (o.hair === 'long') mesh(cylG(0.5, 0.62, 1.1, 20), hairM, 0, 2.2, -0.3, body).scale.z = 0.7;
    if (o.hair === 'bun') mesh(sphereG(0.26, 16), hairM, 0, 3.05, -0.35, body);
    if (o.hair === 'curly') for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; mesh(sphereG(0.2, 10), hairM, Math.cos(a) * 0.5, 2.85 + Math.sin(i * 1.7) * 0.1, Math.sin(a) * 0.45 - 0.1, body); }
    if (o.hair === 'braid') for (let i = 0; i < 5; i++) mesh(sphereG(0.13 - i * 0.012, 10), hairM, 0.3, 2.35 - i * 0.2, -0.45 + i * 0.03, body);
  }
  if (o.hair === 'bald' && hat === 'none') for (const x of [-0.5, 0.5]) mesh(sphereG(0.15, 10), hairM, x, 2.65, -0.15, body);

  // ---- facial hair ----
  const fm = mat(o.hairColor, { roughness: 1 });
  if (o.facial === 'fullbeard' || o.facial === 'beard') {
    const big = o.facial === 'fullbeard';
    [[0, 2.26, 0.38, big ? 0.36 : 0.28], [-0.25, 2.36, 0.33, 0.24], [0.25, 2.36, 0.33, 0.24], ...(big ? [[0, 2.08, 0.32, 0.26]] : [])]
      .forEach(([x, y, z, r]) => mesh(sphereG(r, 16), fm, x, y, z, body));
  }
  if (o.facial === 'goatee') mesh(sphereG(0.15, 12), fm, 0, 2.2, 0.48, body).scale.y = 1.4;
  if (['mustache', 'beard', 'fullbeard', 'goatee'].includes(o.facial)) {
    for (const s of [-1, 1]) {
      mesh(cylG(0.07, 0.11, 0.42, 12), fm, s * 0.2, 2.44, 0.55, body).rotation.z = s * 1.2;
      if (o.facial === 'mustache') mesh(sphereG(0.07, 10), fm, s * 0.4, 2.5, 0.5, body);
    }
  }

  // ---- headwear ----
  buildHat(body, hat, hatM, o);

  // ---- arms ----
  const arm = side => {
    const a = new THREE.Group(); a.position.set(side * 1.12, 1.95, 0); body.add(a);
    mesh(cylG(0.25, 0.21, 0.8, 16), shirt, 0, -0.35, 0, a).rotation.z = side * 0.12;
    mesh(sphereG(0.25, 16), shirt, 0, 0, 0, a);
    mesh(sphereG(0.2, 16), skin, side * 0.05, -0.82, 0, a);
    return a;
  };
  const armL = arm(-1), armR = arm(1);

  // ---- tools ----
  const wood = textured('planks', 0xa0703f, 0.3, 1);
  const axe = new THREE.Group(); axe.position.set(0.05, -0.82, 0); armR.add(axe);
  mesh(cylG(0.06, 0.07, 1.4, 10), wood, 0, 0, 0.35, axe).rotation.x = Math.PI / 2;
  mesh(boxG(0.08, 0.36, 0.34), metal(0xb8bec6), 0, 0.02, 1.02, axe);
  mesh(boxG(0.1, 0.42, 0.06), metal(0xe8edf2), 0, 0.02, 1.2, axe);
  const sword = new THREE.Group(); sword.position.set(0.05, -0.82, 0); armR.add(sword); sword.visible = false;
  mesh(boxG(0.05, 0.16, 1.5), metal(0xdfe6ee, { roughness: 0.15 }), 0, 0, 1.1, sword);
  mesh(boxG(0.1, 0.5, 0.1), metal(0xc9a24a), 0, 0, 0.32, sword);
  mesh(cylG(0.06, 0.06, 0.35, 10), mat(0x4a2e17), 0, 0, 0.1, sword).rotation.x = Math.PI / 2;

  // ---- legs ----
  const legM = o.bottom === 'robe' || o.bottom === 'skirt' ? skin : lower;
  const leg = side => {
    const l = new THREE.Group(); l.position.set(side * 0.45, 0, 0); g.add(l);
    mesh(cylG(0.24, 0.26, 0.4, 16), legM, 0, 0.45, 0, l);
    mesh(sphereG(0.3, 16), mat(o.hat === 'ushanka' ? 0x8a8f94 : 0x3b2412, { roughness: 0.6 }), 0, 0.17, 0.08, l).scale.set(0.95, 0.6, 1.3);
    return l;
  };
  const legL = leg(-1), legR = leg(1);

  return { g, body, legL, legR, armL, armR, axe, sword, walkT: 0, swing: 0, x: 0, z: 0, face: 0, look: o };
}

function shirtOr(o, shirt, lower) { return o.bottomColor === o.top ? shirt : lower; }

function buildHat(body, hat, m, o) {
  const at = (geo, x, y, z) => mesh(geo, m, x, y, z, body);
  switch (hat) {
    case 'straw': {
      const straw = textured('straw', 0xffffff, 4, 1);
      mesh(cylG(1.08, 1.12, 0.07, 32), straw, 0, 3.02, 0, body);
      mesh(cylG(0.46, 0.56, 0.5, 24), straw, 0, 3.28, 0, body);
      mesh(cylG(0.57, 0.57, 0.12, 24), mat(0x8c2a1c), 0, 3.1, 0, body);
      break;
    }
    case 'cap':
      at(new THREE.SphereGeometry(0.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0, 2.8, 0).scale.y = 0.85;
      at(cylG(0.42, 0.42, 0.06, 24), 0, 2.82, 0.55).scale.set(1, 1, 0.8);
      at(sphereG(0.07, 10), 0, 3.31, 0);
      break;
    case 'turban':
      // wrapped layers rising to a peak at the front
      for (let i = 0; i < 4; i++) { const r = at(new THREE.TorusGeometry(0.5 - i * 0.06, 0.16, 12, 28), 0, 2.95 + i * 0.13, -0.02); r.rotation.x = Math.PI / 2 + 0.25; }
      at(sphereG(0.42, 20), 0, 3.25, -0.05).scale.y = 0.7;
      mesh(new THREE.ConeGeometry(0.16, 0.3, 4), mat(darker(o.hatColor, -0.1)), 0, 3.12, 0.52, body).rotation.x = 0.4;
      break;
    case 'keffiyeh': {
      // cloth over the head falling to the shoulders, face open, held by a black cord ring (agal)
      const cloth = mesh(openHood(0.68), textured('cloth', o.hatColor, 3, 3), 0, 2.62, -0.02, body);
      cloth.scale.set(1, 1.05, 1.05);
      const drape = mesh(new THREE.CylinderGeometry(0.62, 0.95, 1.1, 24, 1, true, Math.PI * 0.2, Math.PI * 1.6), textured('cloth', o.hatColor, 3, 2), 0, 2.0, -0.15, body);
      drape.material.side = THREE.DoubleSide; drape.rotation.y = Math.PI;
      for (const y of [3.02, 3.1]) { const a = mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 28), mat(0x111111), 0, y, -0.02, body); a.rotation.x = Math.PI / 2; }
      break;
    }
    case 'ushanka': {
      const fur = mat(o.hatColor, { roughness: 1 });
      mesh(cylG(0.62, 0.66, 0.5, 24), fur, 0, 3.05, 0, body);
      mesh(sphereG(0.6, 20), fur, 0, 3.25, 0, body).scale.y = 0.45;
      for (const s of [-1, 1]) { const f = mesh(boxG(0.18, 0.55, 0.55), fur, s * 0.62, 2.72, 0, body); f.rotation.z = s * 0.1; }
      mesh(boxG(0.8, 0.28, 0.14), fur, 0, 3.12, 0.6, body).rotation.x = -0.4;
      mesh(sphereG(0.07, 8), metal(0xc0271c), 0, 3.14, 0.69, body);
      break;
    }
    case 'headwrap':
      // tall Nigerian gele: folded fans of cloth
      at(sphereG(0.62, 24), 0, 2.95, -0.05).scale.set(1.05, 0.7, 1);
      for (let i = 0; i < 5; i++) { const f = at(boxG(0.9, 0.5, 0.08), 0, 3.3, -0.2 + i * 0.06); f.rotation.set(-0.5 + i * 0.25, i * 0.35 - 0.7, 0); }
      break;
    case 'kufi':
      at(cylG(0.5, 0.56, 0.35, 24), 0, 3.0, -0.05);
      mesh(cylG(0.57, 0.57, 0.08, 24), mat(0x1f7a3a), 0, 2.86, -0.05, body);
      break;
    case 'hijab': {
      const hood = mesh(openHood(0.68), m, 0, 2.64, -0.04, body); hood.scale.set(1, 1.02, 1.02); hood.material = m.clone(); hood.material.side = THREE.DoubleSide;
      const drape = mesh(new THREE.CylinderGeometry(0.6, 0.95, 0.75, 24, 1, true), m, 0, 2.02, -0.02, body);
      drape.material.side = THREE.DoubleSide;
      break;
    }
    case 'headscarf':
      at(new THREE.SphereGeometry(0.64, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), 0, 2.66, -0.06).rotation.x = -0.3;
      at(new THREE.SphereGeometry(0.14, 10, 8), 0, 2.08, 0.4); // knot under the chin
      break;
    case 'kasa': {
      const straw = textured('straw', 0xffffff, 6, 1);
      mesh(new THREE.ConeGeometry(1.25, 0.7, 32, 1, true), straw, 0, 3.25, 0, body).material.side = THREE.DoubleSide;
      break;
    }
    case 'wide': {
      const straw = textured('straw', o.hatColor, 5, 1);
      mesh(cylG(1.35, 1.4, 0.06, 32), straw, 0, 3.02, 0, body);
      mesh(cylG(0.4, 0.55, 0.55, 24), straw, 0, 3.3, 0, body);
      mesh(cylG(0.56, 0.56, 0.1, 24), mat(0xb8372a), 0, 3.1, 0, body);
      break;
    }
  }
}

// A hood around the head with the face left open (hijab, keffiyeh)
function openHood(r) {
  const open = 1.9; // radians of the opening, centred on the face (+z)
  const geo = new THREE.SphereGeometry(r, 28, 18, Math.PI / 2 + open / 2, Math.PI * 2 - open, 0, Math.PI * 0.72);
  return geo;
}

// Waddle walk: the whole body rocks side to side and bounces on each step
export function animateFarmer(f, moving, dt, reduceMotion = false) {
  if (moving && !reduceMotion) f.walkT += dt * 7;
  const w = f.walkT, a = moving ? 1 : 0;
  f.body.rotation.z = Math.sin(w) * 0.17 * a;
  f.body.position.y = Math.abs(Math.sin(w)) * 0.2 * a;
  f.legL.position.z = Math.sin(w) * 0.3 * a; f.legR.position.z = -Math.sin(w) * 0.3 * a;
  f.legL.position.y = Math.max(0, Math.sin(w)) * 0.12 * a; f.legR.position.y = Math.max(0, -Math.sin(w)) * 0.12 * a;
  f.armL.rotation.x = Math.sin(w) * 0.6 * a;
  if (f.swing > 0) { f.swing -= dt * 3; f.armR.rotation.x = -Math.sin(Math.max(0, f.swing) * Math.PI) * 2.2; }
  else f.armR.rotation.x = -Math.sin(w) * 0.6 * a;
  f.g.position.set(f.x, 0.4, f.z); f.g.rotation.y = f.face;
  if (f.blob) f.blob.position.set(f.x, 0.55, f.z);
}
