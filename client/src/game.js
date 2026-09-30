import * as THREE from 'three';
import { ITEMS, FOOD, START_INVENTORY, START_COINS } from './data/items.js';
import * as B from './models/buildings.js';
import * as N from './models/nature.js';
import { buildFarmer, animateFarmer, PRESETS } from './models/farmer.js';
import { sanitizeLook } from '../../shared/looks.js';
import { ITEM_MODELS } from './models/items.js';
import { renderIcons } from './gfx/icons.js';
import { tex } from './gfx/textures.js';
import * as M from './gfx/materials.js';
import { createSky, createGrass, createCritters, createDust } from './gfx/ambience.js';

// Game world + rules. Starts in "menu mode" (camera circles the map, the
// other farmer works his land) until play(skin) is called from the menu.
// Gets split further into world / shop / building modules as online lands.
export function startGame() {
let playing = false;
const inv = { ...START_INVENTORY };
let coins = START_COINS, hunger = 100;
// Match rules. "Play solo" uses these; online matches pass the lobby's rules to play().
let rules = { startCoins: START_COINS, treeWood: 8, shopItems: 6, weather: 'rare', storms: true, bridge: true, hunger: true, dayMinutes: 1.2, days: null };
const RAIN_CHANCE = { off: 0, rare: 0.22, normal: 0.4, often: 0.65 };
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('world'), antialias: true }); }
catch (e) { document.getElementById('fail').hidden = false; throw e; }
const canvas = renderer.domElement;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9fd8ff, 70, 150);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
const $ = id => document.getElementById(id);

// ================= HELPERS =================
const mat = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, flatShading: true, roughness: 0.9 }, o));
function box(w, h, d, c, x = 0, y = 0, z = 0, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? mat(c) : c);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
let toastTimer;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.style.opacity = 1; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.style.opacity = 0, 2200); }

// ================= LIGHT / SEA =================
const hemi = new THREE.HemisphereLight(0xdff1ff, 0x6b8a3a, 0.7); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0008; sun.shadow.radius = 4;
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 180 });
scene.add(sun); scene.add(sun.target);
const moonLight = new THREE.DirectionalLight(0x8fa8ff, 0); moonLight.position.set(-20, 40, -10); scene.add(moonLight);

const seaGeo = new THREE.PlaneGeometry(320, 320, 50, 50);
const sea = new THREE.Mesh(seaGeo, mat(0x2aa3dc, { roughness: 0.25, metalness: 0.05 }));
sea.rotation.x = -Math.PI / 2; sea.position.y = -0.7; sea.receiveShadow = true; scene.add(sea);
const seaBase = seaGeo.attributes.position.array.slice();

// ================= MAP =================
const foams = [];
// Two lands split by a river. You (team Zino) own the left one, team Copper the right one.
const LAND_W = 26, LAND_D = 34, RIVER = 8, HALF_D = LAND_D / 2;
const leftX = -(RIVER / 2 + LAND_W / 2), rightX = RIVER / 2 + LAND_W / 2;
const cA = new THREE.Color(0x6fcf4a), cB = new THREE.Color(0x4fa83a), cC = new THREE.Color(0x9adf5a), tmpC = new THREE.Color();
function land(cx) {
  const g = new THREE.PlaneGeometry(LAND_W, LAND_D, 52, 68);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, cols = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx, z = pos.getZ(i);
    const n = Math.sin(x * 0.35) * Math.cos(z * 0.3) + Math.sin(x * 1.3 + z * 0.9) * 0.4 + (Math.random() - 0.5) * 0.35;
    const edge = Math.abs(pos.getX(i)) > LAND_W / 2 - 0.1 || Math.abs(z) > LAND_D / 2 - 0.1;
    pos.setY(i, edge ? 0 : 0.06 * n);
    tmpC.copy(cA).lerp(n > 0 ? cC : cB, Math.min(1, Math.abs(n) * 0.6));
    cols.push(tmpC.r, tmpC.g, tmpC.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  g.computeVertexNormals();
  const top = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, map: tex('grass', 6, 8) }));
  top.position.set(cx, 0.42, 0); top.receiveShadow = true; scene.add(top);
  box(LAND_W, 0.6, LAND_D, 0x5a9e36, cx, 0.1, 0).castShadow = false;
  box(LAND_W + 0.02, 1.2, LAND_D + 0.02, new THREE.MeshStandardMaterial({ color: 0x9b6a3c, map: tex('soil', 8, 1), roughness: 1 }), cx, -0.8, 0);
  box(LAND_W - 0.4, 1.2, LAND_D - 0.4, 0x6e4526, cx, -1.9, 0);
  const foam = new THREE.Mesh(new THREE.BoxGeometry(LAND_W + 1.4, 0.1, LAND_D + 1.4), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
  foam.position.set(cx, -0.55, 0); scene.add(foam); foams.push(foam);
  // decoration: grass tufts, flowers, rocks, bushes near the edges
  const tuftGeo = new THREE.ConeGeometry(0.12, 0.5, 3);
  const tuftMat = mat(0x5fb83e);
  for (let i = 0; i < 160; i++) {
    const t = new THREE.Mesh(tuftGeo, tuftMat);
    t.position.set(cx + (Math.random() - 0.5) * (LAND_W - 1), 0.62, (Math.random() - 0.5) * (LAND_D - 1));
    t.rotation.z = (Math.random() - 0.5) * 0.4; scene.add(t);
  }
  const petals = [0xffffff, 0xffd84a, 0xff7aa8, 0xb48cff];
  for (let i = 0; i < 60; i++) {
    const f = N.flower(petals[i % 4]);
    f.position.set(cx + (Math.random() - 0.5) * (LAND_W - 1), 0.45, (Math.random() - 0.5) * (LAND_D - 1)); scene.add(f);
  }
  for (let i = 0; i < 14; i++) {
    const side = Math.random() < 0.5 ? -1 : 1, alongX = Math.random() < 0.5;
    const x = cx + (alongX ? (Math.random() - 0.5) * (LAND_W - 2) : side * (LAND_W / 2 - 0.9));
    const z = alongX ? side * (LAND_D / 2 - 0.9) : (Math.random() - 0.5) * (LAND_D - 2);
    const d = i % 2 ? N.rock() : N.bush();
    d.position.set(x, i % 2 ? 0.5 : 0.45, z); scene.add(d);
  }
}
land(leftX); land(rightX);
const fields = [{ x: leftX, z: 0, w: LAND_W - 1, d: LAND_D - 1 }, { x: rightX, z: 0, w: LAND_W - 1, d: LAND_D - 1 }];
const sky = createSky(scene);
const grass = createGrass(scene, fields);
const critters = createCritters(scene, fields);
const dust = createDust(scene);
// The river runs through the island: it starts at a spring in the rocks at the
// north end and pours off a waterfall into the sea at the south end.
box(RIVER, 2.2, LAND_D, new THREE.MeshStandardMaterial({ color: 0x9b6a3c, map: tex('soil', 2, 1), roughness: 1 }), 0, -1.35, 0);  // riverbed and cliff below it
const riverTex = tex('water', 1.5, 6);
const river = new THREE.Mesh(new THREE.PlaneGeometry(RIVER, LAND_D), new THREE.MeshStandardMaterial({ color: 0x2fb7c9, map: riverTex, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.93 }));
river.rotation.x = -Math.PI / 2; river.position.set(0, -0.12, 0); river.receiveShadow = true; scene.add(river);
for (const s of [-1, 1]) {   // sandy banks with pebbles
  box(0.7, 0.5, LAND_D, new THREE.MeshStandardMaterial({ color: 0xd9c28c, roughness: 1 }), s * (RIVER / 2 - 0.35), -0.05, 0);
  for (let i = 0; i < 26; i++) { const r = N.rock(); r.scale.setScalar(0.35); r.position.set(s * (RIVER / 2 - 0.3 - Math.random() * 0.4), 0.2, (Math.random() - 0.5) * (LAND_D - 1)); scene.add(r); }
}
// the spring: a rocky hill across the north end with a small waterfall
const spring = new THREE.Group(); spring.position.set(0, 0, -HALF_D - 1.2); scene.add(spring);
box(RIVER + 3, 2.4, 3.2, new THREE.MeshStandardMaterial({ color: 0x8a8f94, map: tex('stone', 3, 1), roughness: 1 }), 0, -0.6, 0, spring);
for (let i = 0; i < 9; i++) { const r = N.rock(); r.scale.setScalar(1.6 + Math.random() * 1.6); r.position.set((Math.random() - 0.5) * (RIVER + 2), 0.9 + Math.random() * 1.4, (Math.random() - 0.5) * 2); spring.add(r); }
const fallMat = new THREE.MeshStandardMaterial({ color: 0xbfefff, map: tex('water', 1, 1), transparent: true, opacity: 0.85, roughness: 0.1, side: THREE.DoubleSide });
const springFall = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), fallMat); springFall.position.set(0, 1.1, 1.62); spring.add(springFall);
// the mouth: river pours over the south cliff into the sea
const mouthFall = new THREE.Mesh(new THREE.PlaneGeometry(RIVER - 1.4, 1.4), fallMat); mouthFall.rotation.x = -0.25; mouthFall.position.set(0, -0.5, HALF_D + 0.15); scene.add(mouthFall);
const mouthFoam = new THREE.Mesh(new THREE.CircleGeometry(3.4, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
mouthFoam.rotation.x = -Math.PI / 2; mouthFoam.scale.set(1.4, 0.7, 1); mouthFoam.position.set(0, -0.6, HALF_D + 1.4); scene.add(mouthFoam);

// Shop islet in the middle of the river, with a small dock to each land
const SHOP_R = 3.25;
box(SHOP_R * 2, 1, SHOP_R * 2, 0xe6d08e, 0, 0, 0);
const shop = B.shop(); shop.position.set(0, 0.5, -0.9); scene.add(shop);
for (const x of [-3.7, 3.7]) {
  box(1.3, 0.2, 1.8, M.textured('planks', 0xb58656, 0.5, 1), x, 0.35, 1.6);
  for (const z of [0.9, 2.3]) box(0.18, 1.2, 0.18, 0x7a4a22, x + (x < 0 ? -0.5 : 0.5), -0.1, z);
}
const SHOP_POS = new THREE.Vector3(0, 0, 1.6);

// ================= WORLD OBJECTS =================
const solids = [];   // {x,z,hw,hd} rectangles you can't walk through
const trees = [];    // {g, x, z, wood, stump}
const farms = [];    // {x,z,crops[],growth}
const structs = [];  // placed things (for overlap checks) {x,z,hw,hd}
let bridge = null;   // {z}

function addSolid(x, z, hw, hd) { const s = { x, z, hw, hd }; solids.push(s); return s; }

function makeTree(x, z, s = 1, woodLeft = 8) {
  const { g, top, trunk } = N.tree();
  g.position.set(x, 0.4, z); g.scale.setScalar(s); g.rotation.y = Math.random() * 6; scene.add(g);
  const t = { g, top, trunk, x, z, wood: woodLeft, grow: s < 1 ? s : 1, full: s < 1 ? 1 : s, solid: addSolid(x, z, 0.6, 0.6), shake: 0 };
  trees.push(t); structs.push({ x, z, hw: 1, hd: 1 });
  return t;
}
function cutDown(t) { t.top.visible = false; t.trunk.scale.y = 0.15; t.trunk.position.y = 0.25; }
function place(model, x, y, z, rot = 0) { model.position.set(x, y, z); model.rotation.y = rot; scene.add(model); return model; }
function makeFarm(x, z, rot, owner = 'me') {
  const { g, crops, headM, stalkM } = B.farm();
  place(g, x, 0, z, rot);
  const f = { x, z, crops, headM, stalkM, growth: 0, owner };
  farms.push(f); return f;
}
const makeHouse = (x, z, rot) => place(B.house(), x, 0.4, z, rot);
const makeBarn = (x, z, rot) => place(B.barn(), x, 0.4, z, rot);
const makeFence = (x, z, rot) => place(B.fence(), x, 0.4, z, rot);
const makeWall = (x, z, rot) => place(B.wall(), x, 0.4, z, rot);
function makeBridge(z) {
  place(B.bridge(RIVER + 1.6), 0, 0.35, z);
  bridge = { z };
}

// ================= BUILD CATALOG =================
const BUILDS = {
  farm:   { name: 'Farm',   cost: { wood: 3, seeds: 1 }, w: 6,   d: 6,   solid: false, make: makeFarm,  note: 'Grows wheat. Rain makes it grow faster.' },
  fence:  { name: 'Fence',  cost: { wood: 1 },           w: 3,   d: 0.4, solid: true,  make: makeFence },
  house:  { name: 'House',  cost: { wood: 10, door: 1 }, w: 4.6, d: 4.2, solid: true,  make: makeHouse, note: 'Where you sleep.' },
  barn:   { name: 'Barn',   cost: { wood: 14, iron: 2 }, w: 6.2, d: 5.2, solid: true,  make: makeBarn },
  tree:   { name: 'Tree',   cost: { sapling: 1 },        w: 2,   d: 2,   solid: true,  make: (x, z) => makeTree(x, z, 0.3, 6), note: 'Plant a sapling. Chop it when it’s grown.' },
  wall:   { name: 'Stone wall', cost: { stone: 2 },      w: 3,   d: 0.8, solid: true,  make: makeWall },
  bridge: { name: 'Bridge', cost: { wood: 12 },          w: RIVER + 2, d: 3, solid: false, make: null, note: 'Connects the two lands. Stand at the river edge.' },
};
const canPay = cost => Object.entries(cost).every(([k, n]) => inv[k] >= n);
const pay = cost => Object.entries(cost).forEach(([k, n]) => inv[k] -= n);
const costHtml = cost => Object.entries(cost).map(([k, n]) => `<span class="${inv[k] >= n ? '' : 'miss'}">${n} ${ITEMS[k].name}</span>`).join(' · ');

// ================= FARMERS =================
// Walking is 40% quicker than the first prototype (still no running)
const WALK = 4.76, WALK_STARVING = 2.52, WALK_ANIM = 1.4;
const animate = (f, moving, dt) => {
  animateFarmer(f, moving, dt * (moving ? WALK_ANIM : 1), reduceMotion);
  if (moving && (f.dustT = (f.dustT ?? 0) - dt) < 0) { f.dustT = 0.22; dust.puff(f.x, f.z); }
};
// You always live on the left land. The other land's farmer is the computer
// (or, online, the other team).
function addFarmer(look) { const f = buildFarmer(look); scene.add(f.g); blob(f); return f; }
function removeFarmer(f) { scene.remove(f.g); if (f.blob) scene.remove(f.blob); }
let me = addFarmer('zino'), copper = addFarmer('copper');
me.x = leftX + 4; me.z = 6; copper.x = rightX - 2; copper.z = 6;
function assignSkins(lookIn, rivalLook = null) {
  const look = sanitizeLook(lookIn);
  removeFarmer(me); removeFarmer(copper);
  me = addFarmer(look);
  const others = Object.keys(PRESETS).filter(k => PRESETS[k].name !== look.name);
  copper = addFarmer(rivalLook || others[Math.floor(Math.random() * others.length)]);
  me.x = leftX + 4; me.z = 6; me.face = 0;
  copper.x = rightX - 2; copper.z = 6;
  $('tagMe').textContent = 'You · ' + look.name;
  $('tagCopper').textContent = copper.look.name;
}

// Respawn pads
function respawnPad(x, z, color) {
  const { g, ring } = B.respawnPad(color);
  place(g, x, 0.42, z);
  structs.push({ x, z, hw: 1.8, hd: 1.8 });
  return ring;
}
const rings = [respawnPad(leftX - 9, 13, 0x3d7fc4), respawnPad(rightX + 9, 13, 0xe0762b)];

// The one starting tree on each land
const myTree = makeTree(leftX - 4, -8, 1.1);
const copperTree = makeTree(rightX + 4, -8, 1.1);

// Clouds drifting over the map
const clouds = [];
const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, transparent: true, opacity: 0.92 });
for (let i = 0; i < 7; i++) {
  const c = new THREE.Group();
  for (let j = 0; j < 4; j++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + Math.random() * 1.4, 1), cloudMat); p.position.set(j * 1.9 - 3, Math.random() * 0.8, (Math.random() - 0.5) * 1.5); p.scale.y = 0.65; c.add(p); }
  c.position.set((Math.random() - 0.5) * 140, 8 + Math.random() * 5, -32 - Math.random() * 30);
  c.userData.speed = 0.6 + Math.random() * 0.8;
  scene.add(c); clouds.push(c);
}
// Soft blob shadows under the farmers so they sit on the grass
function blob(f) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1.1, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; scene.add(m); f.blob = m;
}


// ================= WALKING RULES =================
function onLand(x, z, side) {
  const inZ = Math.abs(z) < HALF_D - 0.6;
  if (side === 'left') return inZ && x > leftX - LAND_W / 2 + 0.6 && x < -RIVER / 2 - 0.4;
  return inZ && x < rightX + LAND_W / 2 - 0.6 && x > RIVER / 2 + 0.4;
}
function walkable(x, z) {
  if (onLand(x, z, 'left') || onLand(x, z, 'right')) return true;
  if (Math.abs(x) < SHOP_R - 0.3 && Math.abs(z) < SHOP_R - 0.3) return true;
  if (Math.abs(x) < RIVER / 2 + 0.6 && Math.abs(z - 1.6) < 0.8) return true;  // docks
  if (bridge && Math.abs(x) < RIVER / 2 + 1 && Math.abs(z - bridge.z) < 1.2) return true;
  return false;
}
function hitsSolid(x, z, r = 0.7) {
  if (Math.abs(x - shop.position.x) < 2.1 + r && Math.abs(z - (shop.position.z - 0.2)) < 1.5 + r) return true;
  return solids.some(s => Math.abs(x - s.x) < s.hw + r && Math.abs(z - s.z) < s.hd + r);
}
function tryMove(f, dx, dz) {
  const nx = f.x + dx, nz = f.z + dz;
  if (walkable(nx, nz) && !hitsSolid(nx, nz)) { f.x = nx; f.z = nz; return true; }
  if (walkable(nx, f.z) && !hitsSolid(nx, f.z)) { f.x = nx; return true; }
  if (walkable(f.x, nz) && !hitsSolid(f.x, nz)) { f.z = nz; return true; }
  return false;
}

// ================= INPUT =================
const keys = {};
addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === 'e' || e.key === ' ') { e.preventDefault(); $('action').click(); }
  if (e.key === 'b') $('buildBtn').click();
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

const stick = { x: 0, y: 0, id: null };
const stickEl = $('stick'), knob = $('knob');
function stickMove(e) {
  const r = stickEl.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const len = Math.hypot(dx, dy), max = 44;
  if (len > max) { dx *= max / len; dy *= max / len; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  stick.x = dx / max; stick.y = dy / max;
}
stickEl.addEventListener('pointerdown', e => { stick.id = e.pointerId; stickEl.setPointerCapture(e.pointerId); stickMove(e); });
stickEl.addEventListener('pointermove', e => { if (e.pointerId === stick.id) stickMove(e); });
const stickEnd = e => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; };
stickEl.addEventListener('pointerup', stickEnd); stickEl.addEventListener('pointercancel', stickEnd);

// drag on the world to turn the camera
let yaw = 0, pitch = 0.95, camDist = 34, drag = null;
const camFocus = new THREE.Vector3();
canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', e => {
  if (!drag) return;
  yaw = drag.yaw - (e.clientX - drag.x) * 0.006;
  pitch = Math.min(1.35, Math.max(0.5, drag.pitch + (e.clientY - drag.y) * 0.004));
});
canvas.addEventListener('pointerup', () => drag = null);
canvas.addEventListener('wheel', e => { camDist = Math.min(60, Math.max(14, camDist + e.deltaY * 0.03)); }, { passive: true });

// ================= INVENTORY UI =================
const icons = renderIcons(ITEM_MODELS);
const buildIcons = renderIcons({
  farm: () => B.farm().g, fence: B.fence, house: B.house, barn: B.barn,
  tree: () => N.tree().g, wall: B.wall, bridge: () => B.bridge(8),
}, { angle: [0.7, 0.55], dist: 3.8 });
function renderInv() {
  $('coins').textContent = coins;
  $('hotbar').innerHTML = Object.keys(ITEMS).map(k => {
    const n = inv[k];
    return `<div class="slot ${n ? '' : 'empty'}" data-item="${k}" title="${ITEMS[k].name}${FOOD[k] ? ' (tap to eat)' : ''}">
      <img class="ic" src="${icons[k]}" alt=""><span class="n">${n}</span><span class="l">${ITEMS[k].name}</span></div>`;
  }).join('');
}
$('hotbar').addEventListener('click', e => {
  const s = e.target.closest('.slot'); if (!s) return;
  const k = s.dataset.item;
  if (FOOD[k] && inv[k] > 0) { inv[k]--; hunger = Math.min(100, hunger + FOOD[k]); toast(`Ate ${ITEMS[k].name.toLowerCase()}. Yum!`); renderInv(); }
  else if (k === 'sword' && inv.sword > 0) { me.sword.visible = !me.sword.visible; me.axe.visible = !me.sword.visible; toast(me.sword.visible ? 'Sword out' : 'Axe out'); }
  else if (FOOD[k]) toast(`No ${ITEMS[k].name.toLowerCase()} left. Buy some at the shop.`);
});

// ================= SHOP =================
const STOCK_POOL = ['wood', 'stone', 'iron', 'steel', 'door', 'bread', 'apple', 'seeds', 'sapling', 'sword'];
let todayStock = [];
function rollShop() {
  todayStock = STOCK_POOL.slice().sort(() => Math.random() - 0.5).slice(0, rules.shopItems).map(k => ({ k, left: 2 + Math.floor(Math.random() * 6) }));
}
function renderShop() {
  $('buyGrid').innerHTML = todayStock.map((s, i) => `<div class="card"><img class="ic" src="${icons[s.k]}" alt=""><b>${ITEMS[s.k].name}</b>
    <div class="cost">${ITEMS[s.k].buy} coins · ${s.left} left</div>
    <button data-buy="${i}" ${coins >= ITEMS[s.k].buy && s.left ? '' : 'disabled'}>Buy</button></div>`).join('');
  const sellable = Object.keys(ITEMS).filter(k => ITEMS[k].sell);
  $('sellGrid').innerHTML = sellable.map(k => `<div class="card"><img class="ic" src="${icons[k]}" alt=""><b>${ITEMS[k].name}</b>
    <div class="cost">${ITEMS[k].sell} coins each · you have ${inv[k]}</div>
    <button class="wood" data-sell="${k}" ${inv[k] ? '' : 'disabled'}>Sell 1</button></div>`).join('');
}
$('buyGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-buy]'); if (!b) return;
  const s = todayStock[b.dataset.buy], price = ITEMS[s.k].buy;
  if (coins < price || !s.left) return;
  coins -= price; s.left--; inv[s.k]++;
  toast(`Bought ${ITEMS[s.k].name}`); renderInv(); renderShop();
});
$('sellGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-sell]'); if (!b) return;
  const k = b.dataset.sell; if (!inv[k]) return;
  inv[k]--; coins += ITEMS[k].sell; renderInv(); renderShop();
});
function openSheet(id) { closeSheets(); $(id).hidden = false; }
function closeSheets() { $('shopSheet').hidden = true; $('buildSheet').hidden = true; }
document.querySelectorAll('[data-close]').forEach(b => b.onclick = closeSheets);

// ================= BUILDING =================
let placing = null; // {key, rot, ghost}
function renderBuild() {
  $('buildGrid').innerHTML = Object.entries(BUILDS).map(([k, b]) => {
    if (k === 'bridge' && !rules.bridge) return '';
    const blocked = k === 'bridge' && bridge;
    return `<div class="card"><img class="ic big" src="${buildIcons[k]}" alt=""><b>${b.name}</b><div class="cost">${costHtml(b.cost)}</div>
      ${b.note ? `<div class="cost" style="font-weight:600">${b.note}</div>` : ''}
      <button data-build="${k}" ${canPay(b.cost) && !blocked ? '' : 'disabled'}>${blocked ? 'Built' : 'Place'}</button></div>`;
  }).join('');
}
$('buildBtn').onclick = () => { if (placing) return; renderBuild(); openSheet('buildSheet'); };
$('buildGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-build]'); if (!b) return;
  const key = b.dataset.build, def = BUILDS[key];
  closeSheets();
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(def.w, key === 'bridge' ? 0.4 : 1.5, def.d),
    new THREE.MeshBasicMaterial({ color: 0x5cff5c, transparent: true, opacity: 0.35, depthWrite: false }));
  scene.add(ghost);
  placing = { key, rot: 0, ghost, ok: false };
  $('placebar').hidden = false; $('buildBtn').disabled = true;
  toast(key === 'bridge' ? 'Walk to the river edge of your land' : 'Walk to move it, then tap Place');
});
function ghostSpot() {
  const def = BUILDS[placing.key];
  if (placing.key === 'bridge') {
    const z = Math.round(me.z);
    const ok = me.x > -RIVER / 2 - 4 && onLand(me.x, me.z, 'left') && Math.abs(z) < HALF_D - 2 && Math.abs(z - 1.6) > 3;
    return { x: 0, z, hw: def.w / 2, hd: def.d / 2, ok };
  }
  const dist = Math.max(def.w, def.d) / 2 + 1.6;
  const x = Math.round((me.x + Math.sin(me.face) * dist) * 2) / 2, z = Math.round((me.z + Math.cos(me.face) * dist) * 2) / 2;
  const turned = placing.rot % 2 === 1;
  const hw = (turned ? def.d : def.w) / 2, hd = (turned ? def.w : def.d) / 2;
  const inside = onLand(x - hw, z - hd, 'left') && onLand(x + hw, z + hd, 'left');
  const free = !structs.some(s => Math.abs(x - s.x) < s.hw + hw && Math.abs(z - s.z) < s.hd + hd);
  const notOnMe = Math.abs(me.x - x) > hw + 0.6 || Math.abs(me.z - z) > hd + 0.6;
  return { x, z, hw, hd, ok: inside && free && notOnMe };
}
function updateGhost() {
  const s = ghostSpot();
  placing.spot = s;
  placing.ghost.position.set(s.x, placing.key === 'bridge' ? 0.4 : 1.2, s.z);
  placing.ghost.rotation.y = placing.key === 'bridge' ? 0 : placing.rot * Math.PI / 2;
  placing.ghost.material.color.set(s.ok ? 0x5cff5c : 0xff4a3a);
  $('placeBtn').disabled = !s.ok;
}
function endPlacing() {
  scene.remove(placing.ghost); placing = null;
  $('placebar').hidden = true; $('buildBtn').disabled = false;
}
$('rotBtn').onclick = () => { if (placing) placing.rot = (placing.rot + 1) % 4; };
$('cancelBtn').onclick = () => placing && endPlacing();
$('placeBtn').onclick = () => {
  if (!placing || !placing.spot.ok) return;
  const def = BUILDS[placing.key], s = placing.spot, rot = placing.rot * Math.PI / 2;
  if (!canPay(def.cost)) { toast('Not enough materials'); endPlacing(); return; }
  pay(def.cost);
  if (placing.key === 'bridge') { makeBridge(s.z); toast('Bridge built! The lands are connected.'); }
  else {
    def.make(s.x, s.z, rot);
    if (placing.key !== 'tree') structs.push({ x: s.x, z: s.z, hw: s.hw, hd: s.hd });
    if (def.solid && placing.key !== 'tree') addSolid(s.x, s.z, s.hw, s.hd);
    toast(`${def.name} built!`);
    if (placing.key === 'farm') setHelp('Wait for the wheat to turn gold, then tap Harvest. Rain helps it grow.');
    if (placing.key === 'house') setHelp('Nice house! Keep building your life.');
  }
  renderInv(); endPlacing();
};

// ================= ACTIONS =================
let actionFn = null, chopCd = 0;
const nearest = (list, r) => list.filter(o => Math.hypot(o.x - me.x, o.z - me.z) < r).sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
function setHelp(t) { $('helpText').textContent = t; }
function pickAction() {
  if (placing) return [null, '…'];
  if (me.x > -SHOP_R - 1.5 && me.x < SHOP_R + 1.5 && Math.abs(me.z) < SHOP_R + 1) return [() => { renderShop(); openSheet('shopSheet'); }, 'Shop'];
  const f = nearest(farms.filter(f => f.owner === 'me'), 4.6);
  if (f && f.growth >= 1) return [() => {
    f.growth = 0; inv.wheat += 4; toast('+4 Wheat'); renderInv();
    setHelp('Sell wheat at the shop for coins.');
  }, 'Harvest'];
  const t = nearest(trees.filter(t => t.x < 0), 3.2);
  if (t && t.wood > 0 && t.grow >= 1) return [() => {
    if (chopCd > 0) return;
    chopCd = 0.55; me.swing = 1; t.shake = 0.3;
    me.face = Math.atan2(t.x - me.x, t.z - me.z);
    t.wood--; inv.wood++; toast(`+1 Wood (${t.wood} left in this tree)`); renderInv();
    if (t.wood === 0) {
      cutDown(t);
      toast('The tree is gone! Sell wood at the shop, or buy a sapling.');
      setHelp('Cross the dock to the shop in the river. Sell wood, buy what you need.');
    }
  }, 'Chop'];
  if (t && t.grow < 1) return [null, 'Growing'];
  return [null, '…'];
}

// ================= COPPER (AI stand-in for the other team) =================
const bot = { plan: [], wait: 0, stage: 0 };
const BOT_PLAN = [
  ['go', rightX + 4, -5.8], ['chop', 4], ['go', rightX - 5, 1.6], ['go', 3, 1.6], ['wait', 3],
  ['go', rightX - 5, 1.6], ['go', rightX + 1, 6], ['farm', rightX + 1, 9], ['go', rightX + 4, -5.8], ['chop', 4],
  ['go', rightX - 6, -2], ['wait', 4],
];
bot.plan = BOT_PLAN.slice();
function runBot(dt) {
  if (bot.wait > 0) { bot.wait -= dt; animate(copper, false, dt); return; }
  const step = bot.plan[0];
  if (!step) { bot.plan = BOT_PLAN.slice(3); animate(copper, false, dt); return; }
  if (step[0] === 'go') {
    const dx = step[1] - copper.x, dz = step[2] - copper.z, d = Math.hypot(dx, dz);
    if (d < 0.3) { bot.plan.shift(); animate(copper, false, dt); return; }
    const sp = Math.min(d, WALK * 0.9 * dt);
    copper.face = Math.atan2(dx, dz);
    copper.x += dx / d * sp; copper.z += dz / d * sp;
    animate(copper, true, dt); return;
  }
  if (step[0] === 'chop') {
    if (copperTree.wood > 0) { copper.face = Math.atan2(copperTree.x - copper.x, copperTree.z - copper.z); copper.swing = 1; copperTree.shake = 0.3; copperTree.wood--; if (!copperTree.wood) cutDown(copperTree); }
    step[1]--; bot.wait = 0.7; if (step[1] <= 0) bot.plan.shift();
    animate(copper, false, dt); return;
  }
  if (step[0] === 'farm') {
    if (!farms.some(f => f.owner === 'copper')) makeFarm(step[1], step[2], 0, 'copper');
    bot.plan.shift(); bot.wait = 1;
  }
  if (step[0] === 'wait') { bot.wait = step[1]; bot.plan.shift(); }
  animate(copper, false, dt);
}

// ================= RAIN =================
const RAIN_N = 1600;
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(RAIN_N * 3);
for (let i = 0; i < RAIN_N; i++) { rainPos[i * 3] = (Math.random() - 0.5) * 70; rainPos[i * 3 + 1] = Math.random() * 30; rainPos[i * 3 + 2] = (Math.random() - 0.5) * 70; }
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xbfe3ff, size: 0.18, transparent: true, opacity: 0.8 }));
rain.visible = false; scene.add(rain);
let raining = false, storm = false, flash = 0;
// The game decides the weather: each morning a small chance of rain, a smaller chance of a storm.
let weather = { kind: 'rain', start: 9.5, end: 11 };
function rollWeather() {
  const r = Math.random();
  const chance = RAIN_CHANCE[rules.weather];
  if (r < chance) { const start = 8 + Math.random() * 8; weather = { kind: rules.storms && r < chance * 0.28 ? 'storm' : 'rain', start, end: start + 1.5 + Math.random() * 3 }; }
  else weather = null;
}

// ================= SKY / TIME =================
const SKY = { night: new THREE.Color(0x0f1830), dawn: new THREE.Color(0xf7a26b), day: new THREE.Color(0x8fd3ff), dusk: new THREE.Color(0xe0715a), rain: new THREE.Color(0x6f7f8e), white: new THREE.Color(0xffffff) };
let clock = 7.5, dayNum = 1;
const bg = new THREE.Color();
function skyAt(h) {
  if (h < 5 || h >= 20.5) return bg.copy(SKY.night);
  if (h < 7) return bg.copy(SKY.night).lerp(SKY.dawn, Math.min(1, (h - 5) / 1.2)).lerp(SKY.day, Math.max(0, h - 6));
  if (h < 17.5) return bg.copy(SKY.day);
  if (h < 19) return bg.copy(SKY.day).lerp(SKY.dusk, (h - 17.5) / 1.5);
  return bg.copy(SKY.dusk).lerp(SKY.night, (h - 19) / 1.5);
}
const phaseName = h => h >= 5 && h < 7.5 ? 'Sunrise' : h >= 7.5 && h < 17.5 ? 'Day' : h >= 17.5 && h < 20 ? 'Sunset' : 'Night';

// ================= LOOP =================
function resize() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight;
  camera.fov = 40; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

const tags = [[$('tagMe'), () => me.g, 3.4], [$('tagCopper'), () => copper.g, 3.4], [$('tagShop'), () => shop, 4.2]];
const v3 = new THREE.Vector3();
function placeTags() {
  for (const [el, obj, off] of tags) {
    obj().getWorldPosition(v3); v3.y += off; v3.project(camera);
    el.style.left = ((v3.x + 1) / 2 * innerWidth) + 'px';
    el.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px';
    el.hidden = v3.z > 1 || Math.abs(v3.x) > 1.1 || Math.abs(v3.y) > 1.1;
  }
}

rollShop(); renderInv();
let last = performance.now(), tm = 0, lastAction = '';
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; tm += dt;
  chopCd = Math.max(0, chopCd - dt);

  // time: one in-game hour every 3 seconds (a day is 72 seconds here)
  clock += dt * 24 / (rules.dayMinutes * 60);
  if (clock >= 24) { clock -= 24; dayNum++; if (rules.days && dayNum > rules.days) { dayNum = rules.days; toast('That was the last day of the match!'); } rollShop(); rollWeather(); if (!$('shopSheet').hidden) renderShop(); toast(`Day ${dayNum}. The shop has new stock!`); }
  const wOn = !!weather && clock >= weather.start && clock < weather.end;
  if (wOn !== raining) { raining = wOn; storm = wOn && weather.kind === 'storm'; rain.visible = raining; if (wOn) toast(storm ? 'A storm is coming!' : 'It’s raining. Crops grow faster.'); }

  // hunger (walk slower when starving; you can never run)
  if (playing && rules.hunger) hunger = Math.max(0, hunger - dt * 0.35);
  $('hunger').style.width = hunger + '%';

  // movement, relative to the camera
  let ix = stick.x + ((keys.d || keys.arrowright) ? 1 : 0) - ((keys.a || keys.arrowleft) ? 1 : 0);
  let iy = stick.y + ((keys.s || keys.arrowdown) ? 1 : 0) - ((keys.w || keys.arrowup) ? 1 : 0);
  const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
  const moving = playing && il > 0.12 && $('shopSheet').hidden && $('buildSheet').hidden;
  if (moving) {
    const speed = (hunger > 0 ? WALK : WALK_STARVING) * dt;
    const wx = ix * Math.cos(yaw) + iy * Math.sin(yaw), wz = -ix * Math.sin(yaw) + iy * Math.cos(yaw);
    tryMove(me, wx * speed, wz * speed);
    me.face = Math.atan2(wx, wz);
  }
  animate(me, moving, dt);
  runBot(dt);
  if (placing) updateGhost();

  // action button
  const [fn, label] = pickAction();
  actionFn = fn;
  if (label !== lastAction) { $('action').textContent = label; lastAction = label; }
  $('action').disabled = !fn;

  // trees grow, shake
  for (const t of trees) {
    if (t.grow < 1) { t.grow = Math.min(1, t.grow + dt * (raining ? 0.06 : 0.02)); t.g.scale.setScalar(Math.max(0.3, t.grow) * t.full); }
    const wind = storm ? 3 : raining ? 1.8 : 1;
    if (t.shake > 0) { t.shake -= dt; t.top.rotation.z = Math.sin(t.shake * 60) * 0.06; } else t.top.rotation.z = Math.sin(tm * 1.3 + t.x) * 0.015 * wind;
    t.top.rotation.x = Math.sin(tm * 0.9 + t.z) * 0.012 * wind;
  }
  // farms grow (rain = much faster)
  for (const f of farms) {
    f.growth = Math.min(1, f.growth + dt * (raining ? 0.09 : 0.025));
    const s = 0.3 + f.growth * 0.9;
    const ripe = f.growth >= 1;
    f.crops.forEach(c => c.scale.setScalar(s));
    f.headM.color.setHex(ripe ? 0xe8c65a : 0x9bd13c); f.stalkM.color.setHex(ripe ? 0xd9b24a : 0x8fbf3c);
  }

  // sun and sky
  const ang = (clock - 6) / 24 * Math.PI * 2;
  sun.position.set(me.x + Math.cos(ang) * 60, Math.sin(ang) * 60, me.z + 25);
  sun.target.position.set(me.x, 0, me.z);
  const up = Math.max(0, Math.sin(ang));
  sun.intensity = up * (raining ? 0.45 : 1.1);
  sun.color.setHSL(0.09, 0.8, 0.55 + up * 0.4);
  moonLight.intensity = (1 - Math.min(1, up * 4)) * 0.4;
  hemi.intensity = 0.3 + up * 0.5;
  skyAt(clock);
  if (raining) bg.lerp(SKY.rain, storm ? 0.7 : 0.45);
  if (storm) {
    if (flash <= 0 && Math.random() < 0.006) flash = 0.25;
    if (flash > 0) { flash -= dt; bg.lerp(SKY.white, 0.6); hemi.intensity += 1.2; }
  }
  scene.fog.color.copy(bg);
  const night = 1 - Math.min(1, Math.max(0, Math.sin(ang) + 0.15) * 4);
  sky.update(v3.set(Math.cos(ang), Math.sin(ang), 0.4), bg, night);
  grass.update(tm, storm ? 3 : raining ? 1.8 : 1);
  critters.update(tm, raining ? Math.max(night, 0.6) : night);
  dust.update(dt);

  // sea
  const p = seaGeo.attributes.position.array, amp = storm ? 0.9 : 0.25;
  for (let i = 0; i < p.length; i += 3) p[i + 2] = seaBase[i + 2] + Math.sin(seaBase[i] * 0.15 + tm * (storm ? 2.5 : 1.2)) * amp + Math.cos(seaBase[i + 1] * 0.2 + tm) * amp * 0.6;
  seaGeo.attributes.position.needsUpdate = true;

  if (raining) {
    const rp = rainGeo.attributes.position.array, speed = storm ? 50 : 28, drift = storm ? 10 : 2;
    for (let i = 0; i < RAIN_N; i++) {
      rp[i * 3 + 1] -= speed * dt; rp[i * 3] += drift * dt;
      if (rp[i * 3 + 1] < 0) { rp[i * 3 + 1] = 30; rp[i * 3] = me.x + (Math.random() - 0.5) * 70; rp[i * 3 + 2] = me.z + (Math.random() - 0.5) * 70; }
    }
    rainGeo.attributes.position.needsUpdate = true;
  }
  clouds.forEach(c => { c.position.x += c.userData.speed * dt; if (c.position.x > 80) c.position.x = -80; });
  riverTex.offset.y -= dt * 0.18; fallMat.map.offset.y += dt * 0.9;
  mouthFoam.material.opacity = 0.45 + Math.sin(tm * 3) * 0.12;
  foams.forEach(f => f.material.opacity = 0.25 + Math.sin(tm * 1.5) * 0.1);
  rings.forEach((r, i) => { r.rotation.z += dt * (i ? -1 : 1); r.position.y = 0.4 + Math.sin(tm * 2) * 0.12; });

  // camera follows you
  // wide view of both lands, drifting a little toward you
  // In the menu the camera circles the whole island; in a match it follows you.
  if (!playing) yaw += dt * 0.06;
  const dist = playing ? camDist : 62;
  camFocus.lerp(v3.set(playing ? me.x : 0, 0, playing ? me.z : 0), playing ? Math.min(1, dt * 6) : 1);
  camera.position.set(camFocus.x + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, camFocus.z + Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(camFocus.x, 1, camFocus.z);
  renderer.render(scene, camera);
  placeTags();

  const hh = Math.floor(clock), mm = Math.floor((clock - hh) * 60);
  $('day').textContent = 'Day ' + dayNum + (rules.days ? ' / ' + rules.days : '');
  $('time').textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  $('phase').textContent = raining ? (storm ? 'Storm' : 'Rain') : phaseName(clock);
  requestAnimationFrame(frame);
}
$('action').onclick = () => actionFn && actionFn();
requestAnimationFrame(frame);

return {
  portraits: () => renderIcons(Object.fromEntries(Object.keys(PRESETS).map(k => [k, () => buildFarmer(k).g])), { size: 200, angle: [0.35, 0.25], dist: 4.2 }),
  portrait: look => renderIcons({ p: () => buildFarmer(look).g }, { size: 256, angle: [0.35, 0.25], dist: 4.2 }).p,
  play(skin, match = null) {
    if (match) {
      rules = { ...rules, ...match.settings };
      toast(`${match.settings.mode.replace(/v/g, ' v ')} started! Your team: ${match.team.join(', ')}`);
    }
    coins = rules.startCoins; hunger = 100;
    myTree.wood = copperTree.wood = rules.treeWood;
    rollShop(); rollWeather(); renderInv();
    camFocus.set(leftX + 4, 0, 6);
    assignSkins(skin);
    bot.plan = BOT_PLAN.slice(); bot.wait = 0;
    yaw = 0; playing = true;
    document.body.classList.remove('in-menu');
  },
};
}
