// River Farm online server. Accounts, friends, invites, lobbies and
// matchmaking all live in shared/hub.js; this file only moves JSON
// messages over WebSockets and saves players to disk.
//
// Run with `npm run server` from the repo root. PORT defaults to 8787.
import { WebSocketServer } from 'ws';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, createReadStream } from 'node:fs';
import { dirname, join, normalize, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Hub } from '../../shared/hub.js';

const PORT = Number(process.env.PORT) || 8787;
const DATA = process.env.DATA_FILE || join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'players.json');

let saved = [];
try { saved = JSON.parse(readFileSync(DATA, 'utf8')); } catch {}

const sockets = new Map(); // playerId -> socket
const hub = new Hub({
  users: saved,
  send: (id, msg) => {
    const ws = sockets.get(id);
    if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
  },
});

let dirty = false;
function save() {
  if (!dirty) return;
  dirty = false;
  mkdirSync(dirname(DATA), { recursive: true });
  writeFileSync(DATA, JSON.stringify(hub.exportUsers(), null, 2));
}
setInterval(() => { hub.tick(); save(); }, 1000);

// The same server is the website: it serves the built game from client/dist
// (run `npm run build` first). Online play uses the same address.
const SITE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const http = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (path === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok'); }
  let file = normalize(join(SITE, path === '/' ? 'index.html' : path));
  if (!file.startsWith(SITE) || !existsSync(file) || statSync(file).isDirectory()) file = join(SITE, 'index.html');
  if (!existsSync(file)) { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('The Sides of the River server is running. Build the game with `npm run build` to serve the website here.'); }
  const long = file.includes(`${sep}assets${sep}`);
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': long ? 'public, max-age=31536000, immutable' : 'no-cache' });
  createReadStream(file).pipe(res);
});
const wss = new WebSocketServer({ server: http });
http.listen(PORT);
wss.on('connection', ws => {
  let me = null;
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (msg.type === 'login') {
      // the phone remembers its player ID and sends it back each time;
      // a new phone gets a fresh ID
      if (me) sockets.delete(me.id);
      const known = msg.id && hub.users.has(msg.id);
      const id = known ? msg.id : hub.newId();
      const old = sockets.get(id);
      if (old && old !== ws) old.close(4000, 'Signed in somewhere else');
      sockets.set(id, ws);
      me = hub.login({ id, name: msg.name, look: msg.look, create: !known });
      dirty = true;
      return;
    }
    if (!me) return ws.send(JSON.stringify({ type: 'error', message: 'Sign in first' }));
    hub.handle(me.id, msg);
    dirty = true;
  });
  ws.on('close', () => {
    if (me && sockets.get(me.id) === ws) { sockets.delete(me.id); hub.logout(me.id); dirty = true; }
  });
});

console.log(`River Farm server on ws://localhost:${PORT} (${saved.length} saved players)`);
