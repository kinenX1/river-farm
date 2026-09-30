// River Farm online server: friends, lobbies and matchmaking over WebSocket.
// Messages are JSON: { type, ...data }. Run with `npm run server` from the repo root.
import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
import { Lobbies } from './lobbies.js';

const PORT = Number(process.env.PORT) || 8787;
const wss = new WebSocketServer({ port: PORT });
const lobbies = new Lobbies();
const sockets = new Map(); // playerId -> socket

const send = (ws, msg) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg));
const sendLobby = lobby => lobby?.players.forEach(p => sockets.get(p.id) && send(sockets.get(p.id), { type: 'lobby', lobby }));

wss.on('connection', ws => {
  const player = { id: randomUUID(), name: 'Farmer', skin: 'zino' };
  let lobbyCode = null;
  sockets.set(player.id, ws);
  send(ws, { type: 'hello', id: player.id });

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    try {
      switch (msg.type) {
        case 'profile':
          player.name = String(msg.name ?? '').slice(0, 16) || 'Farmer';
          player.skin = msg.skin === 'copper' ? 'copper' : 'zino';
          break;
        case 'create':
          if (lobbyCode) sendLobby(lobbies.leave(lobbyCode, player.id));
          lobbyCode = lobbies.create(player).code;
          sendLobby(lobbies.lobbies.get(lobbyCode));
          break;
        case 'join':
          if (lobbyCode) sendLobby(lobbies.leave(lobbyCode, player.id));
          lobbyCode = lobbies.join(msg.code, player).code;
          sendLobby(lobbies.lobbies.get(lobbyCode));
          break;
        case 'mode':
          sendLobby(lobbies.setMode(lobbyCode, player.id, msg.mode));
          break;
        case 'start': {
          const match = lobbies.startSearch(lobbyCode, player.id);
          sendLobby(lobbies.lobbies.get(lobbyCode));
          if (match) for (const t of match.teams) for (const p of t.players) {
            const s = sockets.get(p.id);
            if (s) send(s, { type: 'match', match, land: t.land });
          }
          break;
        }
        case 'cancel':
          lobbies.stopSearch(lobbyCode);
          sendLobby(lobbies.lobbies.get(lobbyCode));
          break;
      }
    } catch (e) {
      send(ws, { type: 'error', message: e.message });
    }
  });

  ws.on('close', () => {
    sockets.delete(player.id);
    if (lobbyCode) sendLobby(lobbies.leave(lobbyCode, player.id));
  });
});

console.log(`River Farm server listening on ws://localhost:${PORT}`);
