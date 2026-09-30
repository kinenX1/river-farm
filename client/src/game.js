import * as THREE from 'three';
import { ITEMS, FOOD, START_INVENTORY, START_COINS, STOCK_POOL } from './data/items.js';
import { BUILDS, BUILD_TABS } from './data/builds.js';
import * as B from './models/buildings.js';
import * as N from './models/nature.js';
import { buildFarmer, animateFarmer, PRESETS } from './models/farmer.js';
import { sanitizeLook } from '../../shared/looks.js';
import { ITEM_MODELS } from './models/items.js';
import { renderIcons } from './gfx/icons.js';
import { createSky, createGrass, createCritters, createDust } from './gfx/ambience.js';
import { createMap, TEAM_COLORS, TEAM_NAMES } from './world/map.js';

// The game. It opens in "menu mode" (the camera circles the island while a
// computer farmer works) until play() starts a match.
//
// A match has 2 or 3 lands (teams). Every farmer is a player: you, a bot, or a
// friend over the network. Each player sends one small state object ~10 times
// a second (position, what they built, what they chopped, who they hit); the
// game draws everyone else from theirs. Shop stock and weather come from the
// match seed, so every player sees the same shop and the same rain.

const WALK = 4.76, WALK_STARVING = 2.52, WALK_ANIM = 1.4;
const RAIN_CHANCE = { off: 0, rare: 0.22, normal: 0.4, often: 0.65 };
const DEFAULT_RULES = { startCoins: START_COINS, treeWood: 8, shopItems: 6, weather: 'rare', storms: true, disasters: false, bridge: true, hunger: true, dayMinutes: 1.5, days: null };

export function startGame() {
  const $ = id => document.getElementById(id);
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { $('fail').hidden = false; throw e; }
  const canvas = renderer.domElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x9fd8ff, 80, 190);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 1600);

  // ---------- light: warm low sun, cool sky fill, bounce from the ground ----------
  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x5b6e3a, 0.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 2);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 200 });
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0x9fc4ff, 0.25); fill.position.set(-30, 20, -20); scene.add(fill);
  const moon = new THREE.DirectionalLight(0x8fa8ff, 0); moon.position.set(-20, 40, -10); scene.add(moon);

  // ---------- sea ----------
  const seaGeo = new THREE.PlaneGeometry(1400, 1400, 70, 70);
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ color: 0x1f8fc8, roughness: 0.35, metalness: 0.05 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -0.7; sea.receiveShadow = true; scene.add(sea);
  const seaBase = seaGeo.attributes.position.array.slice();
  const sky = createSky(scene);
  const dust = createDust(scene);

  // clouds out over the sea
  const clouds = [];
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 8; i++) {
    const c = new THREE.Group();
    for (let j = 0; j < 4; j++) { const p = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + Math.random() * 1.4, 1), cloudMat); p.position.set(j * 1.9 - 3, Math.random() * 0.8, (Math.random() - 0.5) * 1.5); p.scale.y = 0.65; c.add(p); }
    c.position.set((Math.random() - 0.5) * 160, 10 + Math.random() * 6, (Math.random() < 0.5 ? -1 : 1) * (48 + Math.random() * 30));
    c.userData.speed = 0.6 + Math.random() * 0.8; scene.add(c); clouds.push(c);
  }

  // ---------- rain ----------
  const RAIN_N = 1600, rainGeo = new THREE.BufferGeometry(), rainPos = new Float32Array(RAIN_N * 3);
  for (let i = 0; i < RAIN_N; i++) rainPos.set([(Math.random() - 0.5) * 70, Math.random() * 30, (Math.random() - 0.5) * 70], i * 3);
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xbfe3ff, size: 0.18, transparent: true, opacity: 0.8 }));
  rain.visible = false; scene.add(rain);

  // ---------- icons ----------
  const icons = renderIcons(ITEM_MODELS);
  const buildIcons = renderIcons(Object.fromEntries(Object.keys(BUILDS).map(k => [k, () => makeModel(k, 0).g])), { angle: [0.7, 0.55], dist: 3.8 });

  // ====================================================================
  // World: everything that belongs to one match
  // ====================================================================
  let W = null;          // { map, grass, critters, trees, objs, solids, structs, pads, anims }
  let rules = { ...DEFAULT_RULES };
  let playing = false, seed = 1, startedAt = performance.now();
  let clock = 9, dayNum = 1, raining = false, storm = false, weather = null, flash = 0;
  const inv = { ...START_INVENTORY };
  let coins = START_COINS, hunger = 100, hp = 100, dead = 0, sleeping = false;
  const players = new Map();   // id -> player
  let me = null, myLand = 0, isAuthority = true, sync = null;
  let myBuilds = [], myChops = {}, myHits = {}, harvests = {};
  let buildSeq = 0;

  function newWorld(teams) {
    if (W) { W.map.dispose(); W.grass.dispose(); }
    for (const p of players.values()) removePlayer(p);
    players.clear();
    const map = createMap(scene, teams);
    W = {
      map, trees: [], objs: new Map(), solids: [], structs: [], pads: [], anims: [],
      grass: createGrass(map.group, map.lands, 700 * teams),
      critters: createCritters(map.group, map.lands),
    };
    for (const land of map.lands) {
      const t = land.at(5, 8);
      addTree('T' + land.i, t.x, t.z, 1.1, rules.treeWood);
      const pad = land.at(9, -11);
      const { g, ring } = B.respawnPad(land.color);
      g.position.set(pad.x, 0.42, pad.z); map.group.add(g);
      W.pads.push({ ...pad, ring });
      W.structs.push({ x: pad.x, z: pad.z, hw: 1.8, hd: 1.8 });
      const fl = B.flag(land.color); const fp = land.at(-9, 9);
      fl.g.position.set(fp.x, 0.42, fp.z); map.group.add(fl.g); W.anims.push({ type: 'flag', ...fl });
    }
  }

  // ---------- trees ----------
  function addTree(id, x, z, s, wood) {
    const { g, top, trunk } = N.tree();
    g.position.set(x, 0.42, z); g.scale.setScalar(s); g.rotation.y = Math.random() * 6; W.map.group.add(g);
    const t = { id, g, top, trunk, x, z, max: wood, wood, grow: s < 1 ? s : 1, full: s < 1 ? 1 : s, shake: 0, cut: false };
    W.solids.push({ x, z, hw: 0.6, hd: 0.6 }); W.structs.push({ x, z, hw: 1, hd: 1 });
    W.trees.push(t); return t;
  }
  function treeWood(t) {
    let used = 0;
    for (const p of players.values()) used += (p.me ? myChops[t.id] : p.chops?.[t.id]) || 0;
    return Math.max(0, t.max - used);
  }

  // ---------- models for builds ----------
  function makeModel(key, landColor) {
    const def = BUILDS[key];
    if (def.crop) { const c = B.cropPatch(def.crop); return { g: c.g, crop: c }; }
    switch (key) {
      case 'tree': return { g: N.tree().g };
      case 'house': return { g: B.house() };
      case 'barn': return { g: B.barn() };
      case 'bed': return { g: B.bed() };
      case 'fence': return { g: B.fence() };
      case 'wall': return { g: B.wall() };
      case 'well': return { g: B.well() };
      case 'scarecrow': return { g: B.scarecrow() };
      case 'windmill': { const w = B.windmill(); return { g: w.g, anim: { type: 'spin', obj: w.blades } }; }
      case 'coop': { const c = B.chickenCoop(); return { g: c.g, anim: { type: 'chickens', list: c.chickens } }; }
      case 'beehive': { const b = B.beehive(); return { g: b.g, anim: { type: 'bees', list: b.bees } }; }
      case 'doghouse': { const d = B.doghouse(); return { g: d.g, anim: { type: 'dog', ...d } }; }
      case 'silo': return { g: B.silo() };
      case 'greenhouse': return { g: B.greenhouse() };
      case 'lamp': { const l = B.lampPost(); return { g: l.g, anim: { type: 'lamp', ...l } }; }
      case 'campfire': { const c = B.campfire(); return { g: c.g, anim: { type: 'fire', ...c } }; }
      case 'bench': return { g: B.bench() };
      case 'table': return { g: B.picnicTable() };
      case 'mailbox': return { g: B.mailbox() };
      case 'flowerBed': return { g: B.flowerBed() };
      case 'haystack': return { g: B.haystack() };
      case 'cart': return { g: B.cart() };
      case 'pond': { const p = B.pond(); return { g: p.g, anim: { type: 'duck', duck: p.duck } }; }
      case 'flag': { const f = B.flag(landColor || TEAM_COLORS[0]); return { g: f.g, anim: { type: 'flag', ...f } }; }
      case 'bridge': return { g: B.bridge(8) };
    }
    return { g: new THREE.Group() };
  }

  // Put a build into the world. entry: { id, k, x, z, r } or a bridge { id, k:'bridge', x, z, ux, uz, hl }
  function placeEntry(entry, owner) {
    if (W.objs.has(entry.id)) return W.objs.get(entry.id);
    const def = BUILDS[entry.k]; if (!def) return null;
    if (def.bridge) {
      W.map.addBridge({ x: entry.x, z: entry.z, ux: entry.ux, uz: entry.uz, hl: entry.hl, hw: 1.2 });
      const o = { ...entry, owner }; W.objs.set(entry.id, o); return o;
    }
    if (entry.k === 'tree') { const t = addTree(entry.id, entry.x, entry.z, 0.3, 6); const o = { ...entry, owner, tree: t }; W.objs.set(entry.id, o); return o; }
    const land = W.map.landAt(entry.x, entry.z);
    const { g, crop, anim } = makeModel(entry.k, TEAM_COLORS[Math.max(0, land)]);
    g.position.set(entry.x, def.crop ? 0 : 0.42, entry.z);
    g.rotation.y = (entry.r || 0) * Math.PI / 2;
    W.map.group.add(g);
    const turned = (entry.r || 0) % 2 === 1;
    const hw = (turned ? def.d : def.w) / 2, hd = (turned ? def.w : def.d) / 2;
    W.structs.push({ x: entry.x, z: entry.z, hw, hd });
    if (def.solid) W.solids.push({ x: entry.x, z: entry.z, hw, hd });
    const o = { ...entry, owner, def, g, hw, hd, growth: 0, harvested: entry.n || 0, made: 0, madeT: 0 };
    if (crop) o.crop = crop;
    if (anim) { anim.o = o; W.anims.push(anim); }
    W.objs.set(entry.id, o);
    popIn(g);
    return o;
  }
  // new builds grow out of the ground with a little bounce
  const pops = [];
  function popIn(g) { g.scale.setScalar(0.01); pops.push({ g, t: 0 }); }

  // ====================================================================
  // Players
  // ====================================================================
  function addPlayer({ id, name, look, land, team, isMe = false, bot = false }) {
    const f = buildFarmer(look);
    scene.add(f.g);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.1, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; scene.add(shadow); f.blob = shadow;
    const tag = document.createElement('div');
    tag.className = 'tag ' + (isMe ? 'me' : team === myLand ? 'mate' : 'enemy');
    tag.innerHTML = `<span></span><span class="hpbar"><i></i></span>`;
    tag.firstChild.textContent = (isMe ? 'You · ' : '') + name;
    $('tags').append(tag);
    const spawn = W.map.lands[land].at(-4 + Math.random() * 2, -6 + Math.random() * 4);
    f.x = spawn.x; f.z = spawn.z; f.face = Math.atan2(-W.map.lands[land].dir.x, -W.map.lands[land].dir.z);
    const p = { id, name, look, land, team, me: isMe, bot, f, tag, target: null, chops: {}, hits: {}, builds: [], hp: 100, dead: 0, lastSw: 0, lastSeen: performance.now(), botBrain: bot ? newBrain(land) : null };
    players.set(id, p);
    return p;
  }
  function removePlayer(p) { scene.remove(p.f.g); scene.remove(p.f.blob); p.tag.remove(); }

  // ---------- computer farmers ----------
  function newBrain(land) {
    const L = W.map.lands[land];
    const tree = L.at(5, 8), treeStand = L.at(3, 8), mid = L.at(-6, 0), crop = L.at(-2, -9);
    const toShop = { x: W.map.shopAt.x + (L.center.x - W.map.shopAt.x) * 0.12, z: W.map.shopAt.z + (L.center.z - W.map.shopAt.z) * 0.12 };
    void tree;
    return { plan: [['go', treeStand], ['chop', 4], ['go', mid], ['go', toShop], ['wait', 3], ['go', mid], ['build', 'wheatField', crop], ['go', treeStand], ['chop', 4], ['go', L.at(0, -2)], ['wait', 5]], i: 0, wait: 0 };
  }
  function runBot(p, dt) {
    const b = p.botBrain, f = p.f;
    if (b.wait > 0) { b.wait -= dt; animateP(p, false, dt); return; }
    const step = b.plan[b.i % b.plan.length];
    if (step[0] === 'go') {
      const dx = step[1].x - f.x, dz = step[1].z - f.z, d = Math.hypot(dx, dz);
      if (d < 0.35) { b.i++; animateP(p, false, dt); return; }
      const sp = Math.min(d, WALK * 0.85 * dt);
      f.face = Math.atan2(dx, dz); f.x += dx / d * sp; f.z += dz / d * sp;
      animateP(p, true, dt); return;
    }
    if (step[0] === 'chop') {
      const t = W.trees.find(t => t.id === 'T' + p.land);
      if (t && treeWood(t) > 0) { f.face = Math.atan2(t.x - f.x, t.z - f.z); f.swing = 1; t.shake = 0.3; p.chops[t.id] = (p.chops[t.id] || 0) + 1; }
      step._n = (step._n ?? step[1]) - 1; b.wait = 0.7;
      if (step._n <= 0) { step._n = undefined; b.i++; }
    } else if (step[0] === 'build') {
      const id = p.id + ':b' + p.builds.length;
      if (!p.builds.some(e => e.k === step[1])) { const e = { id, k: step[1], x: step[2].x, z: step[2].z, r: 0 }; p.builds.push(e); placeEntry(e, p.id); }
      b.i++; b.wait = 1;
    } else if (step[0] === 'wait') { b.wait = step[1]; b.i++; }
    animateP(p, false, dt);
  }

  function animateP(p, moving, dt) {
    animateFarmer(p.f, moving, dt * (moving ? WALK_ANIM : 1), reduceMotion);
    if (moving && (p.f.dustT = (p.f.dustT ?? 0) - dt) < 0) { p.f.dustT = 0.22; dust.puff(p.f.x, p.f.z); }
  }

  // ====================================================================
  // Moving
  // ====================================================================
  function hitsSolid(x, z, r = 0.7) {
    if (W.map.blocked(x, z, r)) return true;
    return W.solids.some(s => Math.abs(x - s.x) < s.hw + r && Math.abs(z - s.z) < s.hd + r);
  }
  function tryMove(f, dx, dz) {
    const nx = f.x + dx, nz = f.z + dz, ok = (x, z) => W.map.walkable(x, z) && !hitsSolid(x, z);
    if (ok(nx, nz)) { f.x = nx; f.z = nz; } else if (ok(nx, f.z)) f.x = nx; else if (ok(f.x, nz)) f.z = nz;
  }

  // ---------- input ----------
  const keys = {};
  addEventListener('keydown', e => {
    if (e.target.closest?.('input, select, textarea')) return;
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'e' || e.key === ' ') { e.preventDefault(); $('action').click(); }
    if (e.key === 'b') $('buildBtn').click();
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  const stick = { x: 0, y: 0, id: null }, stickEl = $('stick'), knob = $('knob');
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

  let yaw = 0, pitch = 0.95, camDist = 30, drag = null;
  const camFocus = new THREE.Vector3();
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    yaw = drag.yaw - (e.clientX - drag.x) * 0.006;
    pitch = Math.min(1.35, Math.max(0.45, drag.pitch + (e.clientY - drag.y) * 0.004));
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', e => { camDist = Math.min(60, Math.max(12, camDist + e.deltaY * 0.03)); }, { passive: true });

  // ====================================================================
  // HUD: toast, inventory, shop, build
  // ====================================================================
  let toastTimer;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.style.opacity = 1; t.classList.remove('pop'); void t.offsetWidth; t.classList.add('pop'); clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.style.opacity = 0; }, 2400); }
  const setHelp = t => { $('helpText').textContent = t; };

  function renderInv() {
    $('coins').textContent = coins;
    const order = Object.keys(ITEMS).sort((a, b) => (inv[b] > 0) - (inv[a] > 0));
    $('hotbar').innerHTML = order.map(k => `<div class="slot ${inv[k] ? '' : 'empty'}" data-item="${k}" title="${ITEMS[k].name}${FOOD[k] ? ' (tap to eat)' : ''}">
      <img class="ic" src="${icons[k]}" alt=""><span class="n">${inv[k]}</span><span class="l">${ITEMS[k].name}</span></div>`).join('');
  }
  $('hotbar').addEventListener('click', e => {
    const s = e.target.closest('.slot'); if (!s || !me) return;
    const k = s.dataset.item;
    if (FOOD[k] && inv[k] > 0) { inv[k]--; hunger = Math.min(100, hunger + FOOD[k]); toast(`Ate ${ITEMS[k].name.toLowerCase()}. Yum!`); renderInv(); }
    else if (k === 'sword' && inv.sword > 0) { me.f.sword.visible = !me.f.sword.visible; me.f.axe.visible = !me.f.sword.visible; toast(me.f.sword.visible ? 'Sword out. Walk up to an enemy and tap Hit.' : 'Axe out'); }
    else if (FOOD[k]) toast(`No ${ITEMS[k].name.toLowerCase()} left.`);
  });

  // Seeded dice so everyone in a match gets the same shop and weather
  const dice = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  let todayStock = [];
  function rollDay() {
    const r = dice(seed + dayNum * 7919);
    todayStock = STOCK_POOL.map(k => [k, r()]).sort((a, b) => a[1] - b[1]).slice(0, rules.shopItems).map(([k]) => ({ k, left: 2 + Math.floor(r() * 6) }));
    const w = r(), chance = RAIN_CHANCE[rules.weather];
    weather = w < chance ? { kind: rules.storms && w < chance * 0.28 ? 'storm' : 'rain', start: 8 + r() * 8 } : null;
    if (weather) weather.end = weather.start + 1.5 + r() * 3;
  }
  function renderShop() {
    $('shopNote').textContent = `${rules.shopItems} new items every day at midnight.`;
    $('buyGrid').innerHTML = todayStock.map((s, i) => `<div class="card"><img class="ic" src="${icons[s.k]}" alt=""><b>${ITEMS[s.k].name}</b>
      <div class="cost">${ITEMS[s.k].buy} coins · ${s.left} left</div>
      <button data-buy="${i}" ${coins >= ITEMS[s.k].buy && s.left ? '' : 'disabled'}>Buy</button></div>`).join('');
    const sellable = Object.keys(ITEMS).filter(k => ITEMS[k].sell && inv[k] > 0);
    $('sellGrid').innerHTML = sellable.length ? sellable.map(k => `<div class="card"><img class="ic" src="${icons[k]}" alt=""><b>${ITEMS[k].name}</b>
      <div class="cost">${ITEMS[k].sell} coins each · you have ${inv[k]}</div>
      <div class="two"><button class="wood" data-sell="${k}">Sell 1</button><button class="wood" data-sellall="${k}">All</button></div></div>`).join('')
      : '<p>Nothing to sell yet. Chop wood, grow crops, collect eggs and honey.</p>';
  }
  $('buyGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-buy]'); if (!b) return;
    const s = todayStock[b.dataset.buy], price = ITEMS[s.k].buy;
    if (coins < price || !s.left) return;
    coins -= price; s.left--; inv[s.k]++;
    toast(`Bought ${ITEMS[s.k].name}`); renderInv(); renderShop();
  });
  $('sellGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-sell],[data-sellall]'); if (!b) return;
    const k = b.dataset.sell || b.dataset.sellall; const n = b.dataset.sellall ? inv[k] : Math.min(1, inv[k]);
    inv[k] -= n; coins += ITEMS[k].sell * n; renderInv(); renderShop();
  });
  const openSheet = id => { closeSheets(); $(id).hidden = false; };
  const closeSheets = () => { $('shopSheet').hidden = true; $('buildSheet').hidden = true; };
  document.querySelectorAll('[data-close]').forEach(b => { b.onclick = closeSheets; });

  // ---------- building ----------
  const canPay = cost => Object.entries(cost).every(([k, n]) => inv[k] >= n);
  const pay = cost => Object.entries(cost).forEach(([k, n]) => { inv[k] -= n; });
  const costHtml = cost => Object.entries(cost).map(([k, n]) => `<span class="${inv[k] >= n ? '' : 'miss'}">${n} ${ITEMS[k].name}</span>`).join(' · ');
  let buildTab = 'farm', placing = null;
  function renderBuild() {
    $('buildTabs').innerHTML = BUILD_TABS.map(([k, n]) => `<button role="tab" aria-selected="${k === buildTab}" data-tab="${k}">${n}</button>`).join('');
    $('buildGrid').innerHTML = Object.entries(BUILDS).filter(([, b]) => b.tab === buildTab && !(b.bridge && !rules.bridge)).map(([k, b]) => `
      <div class="card"><img class="ic big" src="${buildIcons[k]}" alt=""><b>${b.name}</b><div class="cost">${costHtml(b.cost)}</div>
      ${b.note ? `<div class="cost note">${b.note}</div>` : ''}
      <button data-build="${k}" ${canPay(b.cost) ? '' : 'disabled'}>Place</button></div>`).join('');
  }
  $('buildTabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { buildTab = b.dataset.tab; renderBuild(); } });
  $('buildBtn').onclick = () => { if (placing || !playing) return; renderBuild(); openSheet('buildSheet'); };
  $('buildGrid').addEventListener('click', e => {
    const b = e.target.closest('[data-build]'); if (!b) return;
    const key = b.dataset.build, def = BUILDS[key];
    closeSheets();
    const size = def.bridge ? [8, 3] : [def.w, def.d];
    const ghost = new THREE.Mesh(new THREE.BoxGeometry(size[0], def.bridge ? 0.4 : 1.4, size[1]),
      new THREE.MeshBasicMaterial({ color: 0x5cff5c, transparent: true, opacity: 0.35, depthWrite: false }));
    scene.add(ghost);
    placing = { key, rot: 0, ghost };
    $('placebar').hidden = false; $('buildBtn').disabled = true;
    toast(def.bridge ? 'Walk to your river bank' : 'Walk to move it, then tap Place');
  });
  function ghostSpot() {
    const def = BUILDS[placing.key], f = me.f;
    if (def.bridge) return W.map.bridgeSpot(f.x, f.z, myLand);
    const dist = Math.max(def.w, def.d) / 2 + 1.5;
    const x = Math.round((f.x + Math.sin(f.face) * dist) * 2) / 2, z = Math.round((f.z + Math.cos(f.face) * dist) * 2) / 2;
    const turned = placing.rot % 2 === 1, hw = (turned ? def.d : def.w) / 2, hd = (turned ? def.w : def.d) / 2;
    const inside = [[-1, -1], [1, -1], [1, 1], [-1, 1]].every(([a, b]) => W.map.onLand(x + a * hw, z + b * hd, myLand, 0.2));
    const free = !W.structs.some(s => Math.abs(x - s.x) < s.hw + hw && Math.abs(z - s.z) < s.hd + hd);
    const notOnMe = Math.abs(f.x - x) > hw + 0.6 || Math.abs(f.z - z) > hd + 0.6;
    return { x, z, ok: inside && free && notOnMe };
  }
  function updateGhost() {
    const s = ghostSpot(); placing.spot = s;
    const def = BUILDS[placing.key];
    placing.ghost.position.set(s.x, def.bridge ? 0.4 : 1.1, s.z);
    placing.ghost.rotation.y = def.bridge ? Math.atan2(-s.uz, s.ux) : placing.rot * Math.PI / 2;
    if (def.bridge) placing.ghost.scale.x = s.hl * 2 / 8;
    placing.ghost.material.color.set(s.ok ? 0x5cff5c : 0xff4a3a);
    $('placeBtn').disabled = !s.ok;
  }
  function endPlacing() { scene.remove(placing.ghost); placing = null; $('placebar').hidden = true; $('buildBtn').disabled = false; }
  $('rotBtn').onclick = () => { if (placing) placing.rot = (placing.rot + 1) % 4; };
  $('cancelBtn').onclick = () => { if (placing) endPlacing(); };
  $('placeBtn').onclick = () => {
    if (!placing || !placing.spot?.ok) return;
    const key = placing.key, def = BUILDS[key], s = placing.spot;
    if (!canPay(def.cost)) { toast('Not enough materials'); endPlacing(); return; }
    pay(def.cost);
    const id = me.id + ':' + (++buildSeq);
    const entry = def.bridge ? { id, k: key, x: s.x, z: s.z, ux: s.ux, uz: s.uz, hl: s.hl } : { id, k: key, x: s.x, z: s.z, r: placing.rot };
    myBuilds.push(entry); placeEntry(entry, me.id);
    toast(def.bridge ? 'Bridge built! The lands are connected.' : `${def.name} built!`);
    if (def.crop) setHelp('Wait until it’s ripe, then tap Harvest. Rain and wells help it grow.');
    if (def.makes) setHelp(`Come back later and tap Collect.`);
    renderInv(); endPlacing();
  };

  // ====================================================================
  // Actions (the round button)
  // ====================================================================
  let actionFn = null, chopCd = 0, hitCd = 0;
  const near = (list, r) => list.filter(o => Math.hypot(o.x - me.f.x, o.z - me.f.z) < r).sort((a, b) => Math.hypot(a.x - me.f.x, a.z - me.f.z) - Math.hypot(b.x - me.f.x, b.z - me.f.z))[0];
  const isNight = () => clock < 5.5 || clock >= 20;
  function pickAction() {
    if (placing || dead) return [null, '…'];
    const f = me.f;
    if (sleeping) return [() => { sleeping = false; toast('Good morning!'); }, 'Wake up'];
    // fight: sword out and an enemy close by
    if (f.sword.visible) {
      const foe = [...players.values()].filter(p => p.team !== myLand && !p.dead && Math.hypot(p.f.x - f.x, p.f.z - f.z) < 2.4)[0];
      if (foe) return [() => { if (hitCd > 0) return; hitCd = 0.6; f.swing = 1; f.face = Math.atan2(foe.f.x - f.x, foe.f.z - f.z); myHits[foe.id] = (myHits[foe.id] || 0) + 1; }, 'Hit'];
    }
    if (W.map.nearShop(f.x, f.z)) return [() => { renderShop(); openSheet('shopSheet'); }, 'Shop'];
    const mine = [...W.objs.values()].filter(o => o.owner === me.id && o.def);
    const ripe = near(mine.filter(o => o.crop && o.growth >= 1), Math.max(3.5, 3.2));
    if (ripe) return [() => {
      const [item, n] = ripe.def.yield; inv[item] += n; ripe.growth = 0; ripe.harvested++; harvests[ripe.id] = ripe.harvested;
      toast(`+${n} ${ITEMS[item].name}`); renderInv(); setHelp('Sell your harvest at the shop, or eat it.');
    }, 'Harvest'];
    const prod = near(mine.filter(o => o.def.makes && o.made > 0), 3.2);
    if (prod) return [() => { const item = prod.def.makes[0]; inv[item] += prod.made; toast(`+${prod.made} ${ITEMS[item].name}`); prod.made = 0; renderInv(); }, 'Collect'];
    const bedHere = near(mine.filter(o => o.k === 'bed'), 2.6);
    if (bedHere && isNight()) return [() => { sleeping = true; toast('Zzz… hunger stops while you sleep.'); }, 'Sleep'];
    const t = near(W.trees.filter(t => W.map.landAt(t.x, t.z) === myLand), 3.2);
    if (t && t.grow >= 1 && treeWood(t) > 0) return [() => {
      if (chopCd > 0) return;
      chopCd = 0.55; f.swing = 1; t.shake = 0.3; f.face = Math.atan2(t.x - f.x, t.z - f.z);
      myChops[t.id] = (myChops[t.id] || 0) + 1; inv.wood++; renderInv();
      const left = treeWood(t);
      toast(`+1 Wood (${left} left in this tree)`);
      if (!left) setHelp('That tree is done. Sell wood at the shop, or buy a sapling and plant a new one.');
    }, 'Chop'];
    if (t && t.grow < 1) return [null, 'Growing'];
    return [null, '…'];
  }
  $('action').onclick = () => actionFn && actionFn();

  // ---------- health ----------
  function damage(p, amount) {
    p.hp = Math.max(0, p.hp - amount);
    if (p.hp <= 0 && !p.dead) { p.dead = 3; }
  }
  function respawnPoint(p) {
    const bed = [...W.objs.values()].find(o => o.owner === p.id && o.k === 'bed');
    if (bed) return { x: bed.x + 2, z: bed.z };
    const pad = W.pads[p.land]; return { x: pad.x + 2.2, z: pad.z };
  }
  let hitsTaken = 0;   // total hits other players have landed on me
  function checkHitsOnMe() {
    let total = 0;
    for (const p of players.values()) if (!p.me && p.team !== myLand) total += p.hits?.[me.id] || 0;
    if (total > hitsTaken) { hp = Math.max(0, hp - (total - hitsTaken) * 20); hitsTaken = total; flashRed(); }
    if (hp <= 0 && !dead) { dead = 3; $('deathScreen').hidden = false; sleeping = false; }
  }
  function flashRed() { document.body.classList.remove('hurt'); void document.body.offsetWidth; document.body.classList.add('hurt'); }

  // ====================================================================
  // Network state
  // ====================================================================
  function myState() {
    const f = me.f;
    return { p: [+f.x.toFixed(2), +f.z.toFixed(2), +f.face.toFixed(2), me.moving ? 1 : 0, f.swing > 0.5 ? 1 : 0, f.sword.visible ? 1 : 0, dead ? 1 : 0, sleeping ? 1 : 0, Math.round(hp)], b: myBuilds, c: myChops, k: myHits, h: harvests };
  }
  function botState(p) {
    const f = p.f;
    return { p: [+f.x.toFixed(2), +f.z.toFixed(2), +f.face.toFixed(2), p.moving ? 1 : 0, f.swing > 0.5 ? 1 : 0, 0, p.dead ? 1 : 0, 0, Math.round(p.hp)], b: p.builds, c: p.chops, k: {}, h: {} };
  }
  function applyState(id, s) {
    const p = players.get(id); if (!p || p.me || !s || !Array.isArray(s.p)) return;
    if (p.bot && isAuthority) return;
    p.lastSeen = performance.now();
    const [x, z, face, mv, sw, sword, isDead, , hpv] = s.p;
    p.target = { x, z, face, mv };
    if (sw && !p.lastSw) p.f.swing = 1;
    p.lastSw = sw; p.f.sword.visible = !!sword; p.f.axe.visible = !sword;
    p.dead = isDead; p.hp = hpv ?? 100; p.f.g.visible = !isDead;
    p.chops = s.c || {}; p.hits = s.k || {};
    if (Array.isArray(s.b)) for (const e of s.b) {
      if (!e || typeof e.id !== 'string' || !e.id.startsWith(id + ':')) continue;
      if (!W.objs.has(e.id)) placeEntry(e, id);
    }
    if (s.h) for (const [bid, n] of Object.entries(s.h)) { const o = W.objs.get(bid); if (o && n > o.harvested) { o.harvested = n; o.growth = 0; } }
  }
  let sendT = 0;
  function sendState(dt) {
    if (!sync) return;
    sendT -= dt; if (sendT > 0) return; sendT = 0.1;
    const out = { [me.id]: myState() };
    if (isAuthority) for (const p of players.values()) if (p.bot) out[p.id] = botState(p);
    sync.send(out);
  }

  // ====================================================================
  // Sky, time, weather
  // ====================================================================
  const SKY = { night: new THREE.Color(0x0f1830), dawn: new THREE.Color(0xf7a26b), day: new THREE.Color(0x8fd3ff), dusk: new THREE.Color(0xe0715a), rain: new THREE.Color(0x6f7f8e), white: new THREE.Color(0xffffff) };
  const bg = new THREE.Color();
  function skyAt(h) {
    if (h < 5 || h >= 20.5) return bg.copy(SKY.night);
    if (h < 7) return bg.copy(SKY.night).lerp(SKY.dawn, Math.min(1, (h - 5) / 1.2)).lerp(SKY.day, Math.max(0, h - 6));
    if (h < 17.5) return bg.copy(SKY.day);
    if (h < 19) return bg.copy(SKY.day).lerp(SKY.dusk, (h - 17.5) / 1.5);
    return bg.copy(SKY.dusk).lerp(SKY.night, (h - 19) / 1.5);
  }
  const phaseName = h => h >= 5 && h < 7.5 ? 'Sunrise' : h >= 7.5 && h < 17.5 ? 'Day' : h >= 17.5 && h < 20 ? 'Sunset' : 'Night';

  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  const v3 = new THREE.Vector3();
  function placeTag(el, obj, off) {
    obj.getWorldPosition(v3); v3.y += off; v3.project(camera);
    el.style.left = ((v3.x + 1) / 2 * innerWidth) + 'px';
    el.style.top = ((1 - v3.y) / 2 * innerHeight) + 'px';
    el.hidden = !playing || v3.z > 1 || Math.abs(v3.x) > 1.1 || Math.abs(v3.y) > 1.1;
  }

  // ====================================================================
  // Main loop
  // ====================================================================
  let last = performance.now(), tm = 0, lastAction = '';
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; tm += dt;
    chopCd = Math.max(0, chopCd - dt); hitCd = Math.max(0, hitCd - dt);

    // time of day
    clock += dt * 24 / (rules.dayMinutes * 60) * (sleeping ? 3 : 1);
    if (clock >= 24) {
      clock -= 24; dayNum++;
      if (rules.days && dayNum > rules.days) { dayNum = rules.days; toast('That was the last day of the match!'); }
      rollDay(); if (!$('shopSheet').hidden) renderShop();
      toast(`Day ${dayNum}. The shop has new stock!`);
    }
    if (sleeping && clock > 6.5 && clock < 7) { sleeping = false; toast('Good morning!'); }
    const wOn = !!weather && clock >= weather.start && clock < weather.end;
    if (wOn !== raining) { raining = wOn; storm = wOn && weather.kind === 'storm'; rain.visible = raining; if (wOn) toast(storm ? 'A storm is coming!' : 'It’s raining. Crops grow faster.'); }

    if (playing && rules.hunger && !sleeping && !dead) hunger = Math.max(0, hunger - dt * 0.35);
    if (playing && hunger <= 0 && !dead) { hp = Math.max(0, hp - dt * 1.5); if (hp <= 0) { dead = 3; $('deathScreen').hidden = false; } }
    $('hunger').style.width = hunger + '%'; $('hp').style.width = hp + '%';

    // you
    if (me) {
      if (dead) {
        dead -= dt; $('respawnIn').textContent = `Back in ${Math.max(1, Math.ceil(dead))}…`;
        me.f.g.visible = false;
        if (dead <= 0) { dead = 0; hp = 100; hunger = Math.max(hunger, 50); const s = respawnPoint(me); me.f.x = s.x; me.f.z = s.z; me.f.g.visible = true; $('deathScreen').hidden = true; toast('You’re back!'); }
      }
      let ix = stick.x + ((keys.d || keys.arrowright) ? 1 : 0) - ((keys.a || keys.arrowleft) ? 1 : 0);
      let iy = stick.y + ((keys.s || keys.arrowdown) ? 1 : 0) - ((keys.w || keys.arrowup) ? 1 : 0);
      const il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; }
      me.moving = playing && !dead && il > 0.12 && $('shopSheet').hidden && $('buildSheet').hidden;
      if (me.moving) {
        if (sleeping) sleeping = false;
        const speed = (hunger > 0 ? WALK : WALK_STARVING) * dt;
        const wx = ix * Math.cos(yaw) + iy * Math.sin(yaw), wz = -ix * Math.sin(yaw) + iy * Math.cos(yaw);
        tryMove(me.f, wx * speed, wz * speed); me.f.face = Math.atan2(wx, wz);
      }
      animateP(me, me.moving, dt);
      me.f.body.rotation.x = sleeping ? -1.2 : 0;
      checkHitsOnMe();
    }

    // everyone else
    for (const p of players.values()) {
      if (p.me) continue;
      if (p.bot && isAuthority) {
        // the host counts everyone's hits on its bots
        let total = 0;
        for (const q of players.values()) if (q !== p && q.team !== p.team) total += (q.me ? myHits : q.hits)?.[p.id] || 0;
        if (total > (p.hitsTaken || 0)) { damage(p, (total - (p.hitsTaken || 0)) * 20); p.hitsTaken = total; }
        if (p.dead) { p.dead -= dt; p.f.g.visible = false; if (p.dead <= 0) { p.dead = 0; p.hp = 100; const s = respawnPoint(p); p.f.x = s.x; p.f.z = s.z; p.f.g.visible = true; } continue; }
        runBot(p, dt); p.moving = p.f.walkT !== p._lastWalk; p._lastWalk = p.f.walkT;
        continue;
      }
      if (p.target) {
        const f = p.f, k = Math.min(1, dt * 10);
        const dx = p.target.x - f.x, dz = p.target.z - f.z;
        if (Math.hypot(dx, dz) > 6) { f.x = p.target.x; f.z = p.target.z; } else { f.x += dx * k; f.z += dz * k; }
        let da = p.target.face - f.face; da = Math.atan2(Math.sin(da), Math.cos(da)); f.face += da * k;
        animateP(p, !!p.target.mv, dt);
      } else animateP(p, false, dt);
    }
    for (const p of players.values()) {
      placeTag(p.tag, p.f.g, 3.4);
      p.tag.querySelector('.hpbar i').style.width = (p.me ? hp : p.hp) + '%';
    }
    if (placing) updateGhost();

    const [fn, label] = me ? pickAction() : [null, '…'];
    actionFn = fn;
    if (label !== lastAction) { $('action').textContent = label; lastAction = label; $('action').classList.toggle('ready', !!fn); }
    $('action').disabled = !fn;

    // world life
    const wind = storm ? 3 : raining ? 1.8 : 1;
    for (const t of W.trees) {
      if (t.grow < 1) { t.grow = Math.min(1, t.grow + dt * (raining ? 0.06 : 0.02)); t.g.scale.setScalar(Math.max(0.3, t.grow) * t.full); }
      if (t.shake > 0) { t.shake -= dt; t.top.rotation.z = Math.sin(t.shake * 60) * 0.06; } else t.top.rotation.z = Math.sin(tm * 1.3 + t.x) * 0.015 * wind;
      t.top.rotation.x = Math.sin(tm * 0.9 + t.z) * 0.012 * wind;
      const empty = t.grow >= 1 && treeWood(t) <= 0;
      if (empty !== t.cut) { t.cut = empty; t.top.visible = !empty; t.trunk.scale.y = empty ? 0.15 : 1; t.trunk.position.y = empty ? 0.25 : 1.6; }
    }
    const wells = [...W.objs.values()].filter(o => o.k === 'well');
    for (const o of W.objs.values()) {
      if (o.crop) {
        const wellBoost = wells.some(w => Math.hypot(w.x - o.x, w.z - o.z) < 7) ? 1.5 : 1;
        o.growth = Math.min(1, o.growth + dt * (raining ? 0.08 : 0.022) * wellBoost);
        const s = 0.3 + o.growth * 0.9;
        o.crop.crops.forEach(c => c.scale.setScalar(s));
        o.crop.parts.forEach(m => m.color.setHex(o.growth >= 1 ? o.crop.ripe : o.crop.young));
      }
      if (o.def?.makes && o.owner === me?.id) {
        o.madeT += dt;
        if (o.madeT >= o.def.makes[1] && o.made < 5) {
          if (o.def.needs && inv[o.def.needs] <= 0) continue;
          if (o.def.needs) { inv[o.def.needs]--; renderInv(); }
          o.madeT = 0; o.made++;
        }
      }
    }
    const nightLevel = isNight() ? 1 : clock < 7 ? (7 - clock) / 1.5 : clock > 18.5 ? (clock - 18.5) / 1.5 : 0;
    for (const a of W.anims) {
      if (a.type === 'spin') a.obj.rotation.z += dt * (0.6 + wind * 0.4);
      else if (a.type === 'chickens') a.list.forEach(c => { c.a += dt * 0.4; c.c.position.set(Math.cos(c.a) * c.r, 0, Math.sin(c.a) * c.r + 0.6); c.c.rotation.y = -c.a; c.c.children[1].position.y = 0.5 - Math.max(0, Math.sin(tm * 6 + c.r * 3)) * 0.12; });
      else if (a.type === 'bees') a.list.forEach(b => b.b.position.set(Math.cos(tm * 3 + b.p) * 0.8, 1.2 + Math.sin(tm * 5 + b.p) * 0.3, Math.sin(tm * 2.4 + b.p) * 0.8));
      else if (a.type === 'dog') { a.tail.rotation.z = Math.sin(tm * 12) * 0.5; a.head.rotation.y = Math.sin(tm * 0.7) * 0.4; }
      else if (a.type === 'lamp') { a.light.intensity = nightLevel * 1.4; a.bulb.material.emissiveIntensity = nightLevel * 2; }
      else if (a.type === 'fire') { a.flames.forEach((f, i) => { f.scale.set(1 + Math.sin(tm * 9 + i) * 0.12, 1 + Math.sin(tm * 11 + i * 2) * 0.2, 1); }); a.light.intensity = 0.8 + nightLevel * 1.4 + Math.sin(tm * 13) * 0.2; }
      else if (a.type === 'duck') { a.duck.position.set(Math.cos(tm * 0.3) * 0.8, 0.1, Math.sin(tm * 0.3) * 0.8); a.duck.rotation.y = -tm * 0.3; }
      else if (a.type === 'flag') {
        const pos = a.cloth.geometry.attributes.position, base = a.cloth.userData.base;
        for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(base[i * 3] * 3 - tm * 5) * 0.12 * (base[i * 3] / 1.6) * wind);
        pos.needsUpdate = true;
      }
    }
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i]; p.t += dt * 2.4;
      const s = p.t >= 1 ? 1 : 1 + Math.sin(p.t * Math.PI) * 0.25 * (1 - p.t) - (1 - p.t) * (1 - p.t);
      p.g.scale.setScalar(Math.max(0.01, s));
      if (p.t >= 1) pops.splice(i, 1);
    }
    W.pads.forEach((p, i) => { p.ring.rotation.z += dt * (i % 2 ? -1 : 1); p.ring.position.y = 0.4 + Math.sin(tm * 2) * 0.12; });
    W.map.update(dt, tm);

    // sun and sky
    const ang = (clock - 6) / 24 * Math.PI * 2, up = Math.max(0, Math.sin(ang));
    const fx = camFocus.x, fz = camFocus.z;
    sun.position.set(fx + Math.cos(ang) * 60, Math.max(4, Math.sin(ang) * 60), fz + 30);
    sun.target.position.set(fx, 0, fz);
    sun.intensity = Math.min(1, up * 2.2) * (raining ? 0.8 : 2.4);
    sun.color.setHSL(0.08, 0.7 - up * 0.4, 0.6 + up * 0.3);
    moon.intensity = (1 - Math.min(1, up * 4)) * 0.35;
    hemi.intensity = 0.3 + Math.min(1, up * 2) * 0.45;
    fill.intensity = 0.1 + up * 0.2;
    skyAt(clock);
    if (raining) bg.lerp(SKY.rain, storm ? 0.7 : 0.45);
    if (storm) { if (flash <= 0 && Math.random() < 0.006) flash = 0.25; if (flash > 0) { flash -= dt; bg.lerp(SKY.white, 0.6); hemi.intensity += 1.2; } }
    scene.fog.color.copy(bg);
    const night = 1 - Math.min(1, Math.max(0, Math.sin(ang) + 0.15) * 4);
    sky.update(v3.set(Math.cos(ang), Math.sin(ang), 0.4), bg, night);
    W.grass.update(tm, wind); W.critters.update(tm, raining ? Math.max(night, 0.6) : night); dust.update(dt);

    const p = seaGeo.attributes.position.array, amp = storm ? 0.9 : 0.22;
    for (let i = 0; i < p.length; i += 3) p[i + 2] = seaBase[i + 2] + Math.sin(seaBase[i] * 0.15 + tm * (storm ? 2.5 : 1.2)) * amp + Math.cos(seaBase[i + 1] * 0.2 + tm) * amp * 0.6;
    seaGeo.attributes.position.needsUpdate = true;
    if (raining) {
      const rp = rainGeo.attributes.position.array, speed = storm ? 50 : 28, drift = storm ? 10 : 2;
      for (let i = 0; i < RAIN_N; i++) {
        rp[i * 3 + 1] -= speed * dt; rp[i * 3] += drift * dt;
        if (rp[i * 3 + 1] < 0) { rp[i * 3 + 1] = 30; rp[i * 3] = fx + (Math.random() - 0.5) * 70; rp[i * 3 + 2] = fz + (Math.random() - 0.5) * 70; }
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
    clouds.forEach(c => { c.position.x += c.userData.speed * dt; if (c.position.x > 90) c.position.x = -90; });

    // camera: circles the island in the menu, follows you in a match
    if (!playing) yaw += dt * 0.05;
    const dist = playing ? camDist : W.map.teams > 2 ? 88 : 66;
    camFocus.lerp(v3.set(playing && me ? me.f.x : 0, 0, playing && me ? me.f.z : 0), playing ? Math.min(1, dt * 6) : 1);
    camera.position.set(camFocus.x + Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, camFocus.z + Math.cos(yaw) * Math.cos(pitch) * dist);
    camera.lookAt(camFocus.x, 1, camFocus.z);
    renderer.render(scene, camera);

    if (playing && me) sendState(dt);
    const hh = Math.floor(clock), mm = Math.floor((clock - hh) * 60);
    $('day').textContent = 'Day ' + dayNum + (rules.days ? ' / ' + rules.days : '');
    $('time').textContent = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    $('phase').textContent = raining ? (storm ? 'Storm' : 'Rain') : phaseName(clock);
    requestAnimationFrame(frame);
  }

  // ---------- menu world: two lands, two computer farmers at work ----------
  if (import.meta.env.DEV) window.__rf = { scene, camera, get W() { return W; }, players };
  newWorld(2);
  for (const [i, k] of [[0, 'zino'], [1, 'copper']]) addPlayer({ id: 'menu' + i, name: PRESETS[k].name, look: k, land: i, team: i, bot: true });
  rollDay();
  requestAnimationFrame(frame);

  return {
    portraits: () => renderIcons(Object.fromEntries(Object.keys(PRESETS).map(k => [k, () => buildFarmer(k).g])), { size: 200, angle: [0.35, 0.25], dist: 4.2 }),
    portrait: look => renderIcons({ p: () => buildFarmer(look).g }, { size: 256, angle: [0.35, 0.25], dist: 4.2 }).p,

    // Start a match. match (online) = { settings, lobby, land, you, looks, host, sync }
    play(lookIn, match = null) {
      const look = sanitizeLook(lookIn);
      rules = { ...DEFAULT_RULES, ...(match?.settings || {}) };
      const teams = match ? match.lobby.teams.length : 2;
      myLand = match ? match.land : 0;
      seed = match?.lobby.match?.seed ?? Math.floor(Math.random() * 1e9);
      isAuthority = !match || match.host;
      sync = match?.sync || null;
      myBuilds = []; myChops = {}; myHits = {}; harvests = {}; buildSeq = 0; hitsTaken = 0;
      Object.assign(inv, START_INVENTORY); coins = rules.startCoins; hunger = 100; hp = 100; dead = 0; sleeping = false;
      clock = 8.5; dayNum = 1; raining = false; storm = false; rain.visible = false;
      newWorld(teams);
      if (match) {
        match.lobby.teams.forEach((team, land) => team.forEach(pl => addPlayer({
          id: pl.id, name: pl.name, look: match.looks?.[pl.id] || 'zino', land, team: land, isMe: pl.id === match.you, bot: !!pl.bot,
        })));
        me = players.get(match.you);
        sync?.onState((id, s) => applyState(id, s));
        const mates = match.lobby.teams[myLand].filter(p => p.id !== match.you).map(p => p.name);
        toast(`${match.settings.mode.replace(/v/g, ' v ')} started! You’re team ${TEAM_NAMES[myLand]}${mates.length ? ' with ' + mates.join(', ') : ''}.`);
      } else {
        me = addPlayer({ id: 'me', name: look.name, look, land: 0, team: 0, isMe: true });
        const others = Object.keys(PRESETS).filter(k => PRESETS[k].name !== look.name);
        const rival = others[Math.floor(Math.random() * others.length)];
        addPlayer({ id: 'bot1', name: PRESETS[rival].name, look: rival, land: 1, team: 1, bot: true });
      }
      const L = W.map.lands[myLand];
      yaw = Math.atan2(L.dir.x, L.dir.z);
      camFocus.set(me.f.x, 0, me.f.z);
      $('helpTitle').textContent = `Your land: team ${TEAM_NAMES[myLand]}`;
      setHelp('Walk to your tree and tap Chop to get wood.');
      rollDay(); renderInv();
      playing = true;
      document.body.classList.remove('in-menu');
    },
  };
}
