import { Hub } from '../../../shared/hub.js';

// Connection to the online server. If no server answers (for example the
// preview link, or you haven't run `npm run server`), the game runs the same
// online code in the browser with demo players, so every menu still works.

const SERVER_URL = import.meta.env.VITE_SERVER_URL || `ws://${location.hostname || 'localhost'}:8787`;

export function connect(profile, onMessage) {
  return new Promise(resolve => {
    let done = false;
    const finish = net => { if (!done) { done = true; resolve(net); } };
    let ws;
    try { ws = new WebSocket(SERVER_URL); } catch { return finish(demo(profile, onMessage)); }
    const timer = setTimeout(() => { try { ws.close(); } catch {} finish(demo(profile, onMessage)); }, 2500);
    ws.onopen = () => {
      clearTimeout(timer);
      ws.send(JSON.stringify({ type: 'login', ...profile }));
      finish({
        mode: 'online',
        send: msg => ws.readyState === 1 && ws.send(JSON.stringify(msg)),
        close: () => ws.close(),
      });
    };
    ws.onmessage = e => { try { onMessage(JSON.parse(e.data)); } catch {} };
    ws.onerror = () => { clearTimeout(timer); finish(demo(profile, onMessage)); };
    ws.onclose = () => { if (done) onMessage({ type: 'disconnected' }); };
  });
}

// ---------- offline demo ----------
const DEMO_PLAYERS = [
  { id: 'RF-KAYA7', name: 'Kaya', look: 'amara', friend: true, online: true },
  { id: 'RF-M1LO2', name: 'Milo', look: 'kenji', friend: true, online: true },
  { id: 'RF-SUNNY', name: 'Sunny', look: 'rosa', friend: true, online: false },
  { id: 'RF-TOMA5', name: 'Tomas', look: 'ivan', friend: false, online: true },
  { id: 'RF-NOOR9', name: 'Noor', look: 'layla', friend: false, online: true },
  { id: 'RF-BRAM3', name: 'Bram', look: 'copper', friend: false, online: true },
];

function demo(profile, onMessage) {
  const myId = profile.id && profile.id.startsWith('RF-') ? profile.id : null;
  const reply = [];
  let me = null;
  const hub = new Hub({
    users: DEMO_PLAYERS.map(p => ({ id: p.id, name: p.name + ' (demo)', look: p.look, friends: [], requests: [] })),
    send: (id, msg) => {
      if (!me || id === me.id) return setTimeout(() => onMessage(msg), 0);
      reply.push([id, msg]);
      setTimeout(demoReact, 900);
    },
  });
  me = hub.login({ id: myId, name: profile.name, look: profile.look, create: !!myId });
  // demo players: some are your friends, some are online
  for (const p of DEMO_PLAYERS) {
    const u = hub.users.get(p.id);
    u.online = p.online;
    if (p.friend) { u.friends.add(me.id); me.friends.add(u.id); }
  }
  hub.pushFriends(me);

  // demo players accept friend requests and invites, and hop into random lobbies
  function demoReact() {
    while (reply.length) {
      const [id, msg] = reply.shift();
      const u = hub.users.get(id);
      if (!u || !u.online) continue;
      if (msg.type === 'friends' && msg.requests.some(r => r.id === me.id)) hub.friendRespond(id, me.id, true);
      if (msg.type === 'invite') hub.handle(id, { type: 'acceptInvite', lobbyId: msg.lobbyId, team: msg.team });
    }
  }
  let joinTimer = null;
  const origHandle = hub.handle.bind(hub);
  hub.handle = (id, msg) => {
    origHandle(id, msg);
    if (id === me.id && msg.type === 'quickJoin') {
      clearInterval(joinTimer);
      const strangers = DEMO_PLAYERS.filter(p => !p.friend && p.online).map(p => p.id);
      joinTimer = setInterval(() => {
        const next = strangers.shift();
        const lobby = me.lobby && hub.lobbies.get(me.lobby);
        if (!next || !lobby || lobby.state !== 'waiting') return clearInterval(joinTimer);
        if (hub.members(lobby).length < hub.capacity(lobby)) { try { hub.addToLobby(lobby, hub.users.get(next)); hub.pushLobby(lobby); } catch {} }
      }, 4000);
    }
  };
  const tick = setInterval(() => hub.tick(), 1000);

  return {
    mode: 'demo',
    send: msg => { if (msg.type === 'login') return; setTimeout(() => hub.handle(me.id, msg), 60); },
    close: () => { clearInterval(tick); clearInterval(joinTimer); },
  };
}
