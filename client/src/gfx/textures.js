import * as THREE from 'three';

// Hand-painted textures drawn on a canvas at startup, so the game ships
// with no image files and still gets wood grain, bark, tiles and stone.

const cache = new Map();
const rand = (a, b) => a + Math.random() * (b - a);

function canvasTexture(key, size, draw) {
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

// A copy of a cached texture with its own repeat, sharing the same image
export function tex(key, rx = 1, ry = 1) {
  const base = PAINTERS[key]();
  const t = base.clone();
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amt);
  return '#' + c.getHexString();
}

const PAINTERS = {
  // Horizontal boards with grain and dark gaps
  planks: () => canvasTexture('planks', 256, (g, s) => {
    const rows = 6, h = s / rows;
    for (let r = 0; r < rows; r++) {
      g.fillStyle = shade('#ffffff', rand(-0.12, 0));
      g.fillRect(0, r * h, s, h);
      g.strokeStyle = 'rgba(90,55,25,.25)';
      for (let i = 0; i < 7; i++) {
        g.beginPath();
        const y = r * h + rand(4, h - 4);
        g.moveTo(0, y);
        for (let x = 0; x <= s; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + i) * 1.5);
        g.lineWidth = rand(0.5, 1.6); g.stroke();
      }
      if (Math.random() < 0.5) { g.fillStyle = 'rgba(70,40,15,.35)'; g.beginPath(); g.ellipse(rand(20, s - 20), r * h + h / 2, 5, 3, 0, 0, 7); g.fill(); }
      g.fillStyle = 'rgba(40,20,5,.7)'; g.fillRect(0, r * h, s, 3);
      const seam = rand(40, s - 40); g.fillRect(seam, r * h, 3, h);
    }
  }),
  // Vertical bark ridges
  bark: () => canvasTexture('bark', 256, (g, s) => {
    g.fillStyle = '#6b4424'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      const x = rand(0, s), w = rand(2, 7);
      g.fillStyle = Math.random() < 0.5 ? 'rgba(40,22,8,.55)' : 'rgba(150,105,65,.35)';
      g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= s; y += 16) g.lineTo(x + Math.sin(y * 0.04 + i) * 4, y);
      g.lineTo(x + w, s); g.lineTo(x + w, 0); g.fill();
    }
  }),
  // Tree rings for cut log ends
  rings: () => canvasTexture('rings', 128, (g, s) => {
    g.fillStyle = '#d9a86a'; g.fillRect(0, 0, s, s);
    for (let r = 6; r < s / 2; r += rand(4, 8)) {
      g.strokeStyle = `rgba(120,70,30,${rand(0.3, 0.6)})`; g.lineWidth = rand(1, 2.5);
      g.beginPath(); g.arc(s / 2 + rand(-1, 1), s / 2 + rand(-1, 1), r, 0, 7); g.stroke();
    }
    g.strokeStyle = '#6b4424'; g.lineWidth = 8; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 4, 0, 7); g.stroke();
  }),
  // Roof shingles in offset rows
  shingles: () => canvasTexture('shingles', 256, (g, s) => {
    const rows = 8, h = s / rows, w = s / 6;
    for (let r = 0; r < rows; r++) for (let c = -1; c < 7; c++) {
      const x = c * w + (r % 2) * w / 2;
      g.fillStyle = shade('#ffffff', rand(-0.18, 0));
      g.fillRect(x + 1, r * h + 1, w - 2, h - 1);
      g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(x + 1, r * h + h - 5, w - 2, 5);
    }
  }),
  // Irregular cobbles with mortar
  stone: () => canvasTexture('stone', 256, (g, s) => {
    g.fillStyle = '#6f6f6f'; g.fillRect(0, 0, s, s);
    const rows = 5, h = s / rows;
    for (let r = 0; r < rows; r++) {
      let x = (r % 2) * -20;
      while (x < s) {
        const w = rand(36, 64), v = rand(-0.12, 0.08);
        g.fillStyle = shade('#a3a3a3', v);
        g.beginPath(); g.roundRect ? g.roundRect(x + 3, r * h + 3, w - 6, h - 6, 8) : g.rect(x + 3, r * h + 3, w - 6, h - 6); g.fill();
        g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x + 6, r * h + 5, w - 14, 4);
        x += w;
      }
    }
  }),
  // Tilled soil rows
  soil: () => canvasTexture('soil', 256, (g, s) => {
    g.fillStyle = '#5a3a1f'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 8; i++) {
      const y = i * s / 8;
      g.fillStyle = '#6e4827'; g.fillRect(0, y + 4, s, s / 16);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y + s / 16 + 4, s, 4);
    }
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${rand(20, 120)},${rand(10, 70)},0,.35)`; g.fillRect(rand(0, s), rand(0, s), 2, 2); }
  }),
  // Straw weave for Zino's hat
  straw: () => canvasTexture('straw', 128, (g, s) => {
    g.fillStyle = '#e3c877'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 8) for (let x = 0; x < s; x += 8) {
      g.fillStyle = (x + y) % 16 ? 'rgba(160,120,40,.35)' : 'rgba(255,240,180,.35)';
      g.fillRect(x, y, 8, 4);
    }
  }),
  // Plaid shirt for Copper
  plaid: () => canvasTexture('plaid', 128, (g, s) => {
    g.fillStyle = '#c8632b'; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(90,25,10,.45)';
    for (let i = 0; i < s; i += 32) { g.fillRect(i, 0, 12, s); g.fillRect(0, i, s, 12); }
    g.fillStyle = 'rgba(255,220,160,.35)';
    for (let i = 20; i < s; i += 32) { g.fillRect(i, 0, 2, s); g.fillRect(0, i, s, 2); }
  }),
  // Soft cloth weave (shirts, overalls)
  cloth: () => canvasTexture('cloth', 64, (g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) { g.fillStyle = `rgba(0,0,0,${y % 4 ? 0.05 : 0.1})`; g.fillRect(0, y, s, 1); }
    for (let x = 0; x < s; x += 3) { g.fillStyle = 'rgba(0,0,0,.04)'; g.fillRect(x, 0, 1, s); }
  }),
  // Flowing river water: soft light streaks, scrolled along the river
  water: () => canvasTexture('water', 256, (g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      const x = rand(0, s), y = rand(0, s), l = rand(20, 70);
      g.strokeStyle = `rgba(255,255,255,${rand(0.3, 0.8)})`; g.lineWidth = rand(1, 3);
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 4, y + l / 3, x - 4, y + l * 2 / 3, x, y + l); g.stroke();
      g.strokeStyle = 'rgba(0,60,90,.12)'; g.beginPath(); g.moveTo(x + 6, y); g.lineTo(x + 6, y + l); g.stroke();
    }
  }),
  // Grass speckle laid over the land colors
  grass: () => canvasTexture('grass', 256, (g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 2200; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(20,70,10,.16)' : 'rgba(255,255,200,.18)';
      const x = rand(0, s), y = rand(0, s);
      g.fillRect(x, y, 1.5, rand(3, 6));
    }
  }),
};
