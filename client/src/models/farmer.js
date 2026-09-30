import * as THREE from 'three';
import { mat, metal, textured, mesh, boxG, sphereG, cylG } from '../gfx/materials.js';

// The two farmers. Both are round-bellied, short-legged and waddle when they walk.
export const SKINS = {
  zino: {
    name: 'Mr. Zino',
    blurb: 'Old farmer. White beard, straw hat, has seen a hundred harvests.',
    shirt: () => textured('cloth', 0xe4dcc0, 3, 3),
    overalls: () => textured('cloth', 0x6b5236, 4, 4),
    hair: 0xf1f1ee,
    beard: true,
    hat: 'straw',
  },
  copper: {
    name: 'Mr. Copper',
    blurb: 'Loud farmer with a copper mustache and a plaid shirt.',
    shirt: () => textured('plaid', 0xffffff, 2, 2),
    overalls: () => textured('cloth', 0x3a5a8c, 4, 4),
    hair: 0xa9501f,
    mustache: true,
    hat: 'cap',
    hatColor: 0x2e7d4f,
  },
};

const SKIN = 0xf2c29b;

export function buildFarmer(skinKey) {
  const o = SKINS[skinKey];
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const shirt = o.shirt(), overalls = o.overalls();
  const skin = mat(SKIN, { roughness: 0.7 });

  // Big round belly, overalls over the lower half
  mesh(sphereG(1, 32), shirt, 0, 1.3, 0, body).scale.set(1.12, 1.05, 1.02);
  mesh(sphereG(1.03, 32), overalls, 0, 1.02, 0, body).scale.set(1.14, 0.78, 1.05);
  const bib = mesh(boxG(0.95, 0.7, 0.2), overalls, 0, 1.55, 0.86, body); bib.rotation.x = -0.25;
  mesh(sphereG(0.12, 12), mat(0x8a5a2b), 0, 1.5, 1.0, body).scale.set(1.2, 0.8, 0.5); // pocket stitch
  for (const x of [-0.4, 0.4]) {
    const strap = mesh(boxG(0.18, 1.0, 0.1), overalls, x, 2.0, 0.62, body); strap.rotation.x = -0.55;
    mesh(sphereG(0.08, 12), metal(0xe0b64a), x, 1.84, 0.92, body);
  }

  // Head
  mesh(sphereG(0.58, 32), skin, 0, 2.62, 0, body);
  mesh(sphereG(0.17, 16), mat(0xe9a888), 0, 2.56, 0.56, body);                // nose
  for (const x of [-0.56, 0.56]) mesh(sphereG(0.13, 12), skin, x, 2.62, 0, body).scale.set(0.6, 1, 1); // ears
  for (const x of [-0.21, 0.21]) {
    mesh(sphereG(0.09, 12), mat(0xffffff, { roughness: 0.3 }), x, 2.74, 0.47, body);
    mesh(sphereG(0.05, 10), mat(0x1c120a, { roughness: 0.2 }), x, 2.74, 0.54, body);
    const brow = mesh(boxG(0.22, 0.06, 0.08), mat(o.hair), x, 2.88, 0.5, body); brow.rotation.z = x > 0 ? -0.15 : 0.15;
    mesh(sphereG(0.1, 10), mat(0xf0a09a, { transparent: true, opacity: 0.6 }), x * 1.6, 2.5, 0.42, body); // cheeks
  }
  if (o.beard) {
    const beard = new THREE.Group(); body.add(beard);
    const bm = mat(o.hair, { roughness: 1 });
    [[0, 2.28, 0.38, 0.36], [-0.25, 2.36, 0.33, 0.25], [0.25, 2.36, 0.33, 0.25], [0, 2.1, 0.32, 0.26], [-0.12, 2.42, 0.5, 0.14], [0.12, 2.42, 0.5, 0.14]]
      .forEach(([x, y, z, r]) => mesh(sphereG(r, 16), bm, x, y, z, beard));
  }
  if (o.mustache) {
    const mm = mat(o.hair, { roughness: 0.9 });
    for (const s of [-1, 1]) {
      const m = mesh(cylG(0.07, 0.11, 0.42, 12), mm, s * 0.2, 2.44, 0.55, body);
      m.rotation.z = s * 1.2;
      mesh(sphereG(0.07, 10), mm, s * 0.4, 2.5, 0.5, body);
    }
  }

  // Hat
  if (o.hat === 'straw') {
    const straw = textured('straw', 0xffffff, 4, 1);
    mesh(cylG(1.08, 1.12, 0.07, 32), straw, 0, 3.02, 0, body);
    mesh(cylG(0.46, 0.56, 0.5, 24), straw, 0, 3.28, 0, body);
    mesh(cylG(0.57, 0.57, 0.12, 24), mat(0x8c2a1c), 0, 3.1, 0, body);
  } else {
    const hm = mat(o.hatColor, { roughness: 0.8 });
    const cap = mesh(new THREE.SphereGeometry(0.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hm, 0, 2.8, 0, body);
    cap.scale.y = 0.85;
    const brim = mesh(cylG(0.42, 0.42, 0.06, 24), hm, 0, 2.82, 0.55, body); brim.scale.set(1, 1, 0.8);
    mesh(sphereG(0.07, 10), hm, 0, 3.31, 0, body);
    for (const x of [-0.5, 0.5]) mesh(sphereG(0.16, 12), mat(o.hair), x, 2.7, -0.15, body); // hair tufts
  }

  // Arms swing from the shoulder: sleeve + hand
  const arm = side => {
    const a = new THREE.Group(); a.position.set(side * 1.12, 1.95, 0); body.add(a);
    const sleeve = mesh(cylG(0.25, 0.21, 0.8, 16), shirt, 0, -0.35, 0, a); sleeve.rotation.z = side * 0.12;
    mesh(sphereG(0.25, 16), shirt, 0, 0, 0, a);
    mesh(sphereG(0.2, 16), skin, side * 0.05, -0.82, 0, a);
    return a;
  };
  const armL = arm(-1), armR = arm(1);

  // Tools in the right hand
  const wood = textured('planks', 0xa0703f, 0.3, 1);
  const axe = new THREE.Group(); axe.position.set(0.05, -0.82, 0); armR.add(axe);
  const handle = mesh(cylG(0.06, 0.07, 1.4, 10), wood, 0, 0, 0.35, axe); handle.rotation.x = Math.PI / 2;
  const head = mesh(boxG(0.08, 0.36, 0.34), metal(0xb8bec6), 0, 0.02, 1.02, axe);
  mesh(boxG(0.1, 0.42, 0.06), metal(0xe8edf2), 0, 0.02, 1.2, axe);
  head.castShadow = true;
  const sword = new THREE.Group(); sword.position.set(0.05, -0.82, 0); armR.add(sword); sword.visible = false;
  mesh(boxG(0.05, 0.16, 1.5), metal(0xdfe6ee, { roughness: 0.15 }), 0, 0, 1.1, sword);
  mesh(boxG(0.1, 0.5, 0.1), metal(0xc9a24a), 0, 0, 0.32, sword);
  mesh(cylG(0.06, 0.06, 0.35, 10), mat(0x4a2e17), 0, 0, 0.1, sword).rotation.x = Math.PI / 2;

  // Stubby legs with boots
  const leg = side => {
    const l = new THREE.Group(); l.position.set(side * 0.45, 0, 0); g.add(l);
    mesh(cylG(0.24, 0.26, 0.4, 16), overalls, 0, 0.45, 0, l);
    const boot = mesh(sphereG(0.3, 16), mat(0x3b2412, { roughness: 0.6 }), 0, 0.17, 0.08, l);
    boot.scale.set(0.95, 0.6, 1.3);
    return l;
  };
  const legL = leg(-1), legR = leg(1);

  return { g, body, legL, legR, armL, armR, axe, sword, walkT: 0, swing: 0, x: 0, z: 0, face: 0 };
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
