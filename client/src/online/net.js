import { Hub } from '../../../shared/hub.js';

// Connection to the online part. Three ways, tried in this order:
//  1. room:   inside the shared game link (claude.ai), everyone who has the link
//             open is in one "room". One of them runs the online rules for all.
//  2. server: the WebSocket server (`npm run server`, or VITE_SERVER_URL).
//  3. demo:   nobody to talk to; the same online code runs in the browser with
//             pretend players, so every menu still works.
// Each returns { mode, send(msg), close(), matchSync(match) }.

const SERVER_URL = import.meta.env.VITE_SERVER_URL || `ws://${location.hostname || 'localhost'}:8787`;
const timeout = ms => new Promise(r => setTimeout(() => r(null), ms));

export async function connect(profile, onMessage) {
  const room = window.claude?.use ? await Promise.race([window.claude.use('room'), timeout(6000)]).catch(() => null) : null;
  if (room) return roomNet(room, profile, onMessage);
  return serverNet(profile, onMessage);
}

function serverNet(profile, onMessage) {
  return new Promise(resolve => {
    let done = false;
    const finish = net => { if (!done) { done = true; resolve(net); } };
    let ws;
    try { ws = new WebSocket(SERVER_URL); } catch { return finish(demo(profile, onMessage)); }
    const timer = setTimeout(() => { try { ws.close(); } catch {} finish(demo(profile, onMessage)); }, 2500);
    const stateHandlers = [];
    ws.onopen = () => {
      clearTimeout(timer);
      ws.send(JSON.stringify({ type: 'login', ...profile }));
      const send = msg => ws.readyState === 1 && ws.send(JSON.stringify(msg));
      finish({
        mode: 'online', send, close: () => ws.close(),
        matchSync: () => ({ send: states => send({ type: 'mstate', states }), onState: fn => stateHandlers.push(fn) }),
      });
    };
    ws.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.type === 'mstate') { for (const [id, s] of Object.entries(m.states || {})) stateHandlers.forEach(h => h(id, s)); return; }
      onMessage(m);
    };
    ws.onerror = () => { clearTimeout(timer); finish(demo(profile, onMessage)); };
    ws.onclose = () => { if (done) onMessage({ type: 'disconnected' }); };
  });
}

// ---------- the shared link ("room") ----------
// Players talk to the host through their presence (a small outbox of recent
// messages); the host answers on the "rfh" topic. The host is the first player
// (by the room's own ordering) who is allowed to send on that topic.
function roomNet(room, profile, onMessage) {
  const loadFriends = () => { try { return JSON.parse(localStorage.getItem('rf-friends')) || []; } catch { return []; } };
  const myId = profile.id && /^RF-[A-Z0-9]{5}$/.test(profile.id) ? profile.id : 'RF-' + Array.from({ length: 5 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');
  let seq = 0, outbox = [], canHost = false, hubPeer = null, hub = null, tick = null;
  const seen = new Map(), peerUser = new Map();

  const deliver = m => {
    if (m.type === 'friends') { try { localStorage.setItem('rf-friends', JSON.stringify(m.friends.map(f => f.id))); } catch {} }
    onMessage(m);
  };
  const publish = () => room.presence({ rf: { id: myId, host: canHost, o: outbox } }).catch(() => {});
  function send(msg) {
    outbox = outbox.concat([[++seq, msg]]).slice(-10);
    publish();
  }
  const login = () => send({ type: 'login', id: myId, name: profile.name, look: profile.look, friends: loadFriends() });

  // answers from the host
  room.on('rfh', msg => {
    if (!msg.data || msg.peer !== hubPeer) return;
    const batch = Array.isArray(msg.data) ? msg.data : [msg.data];
    for (const d of batch) if (d && d.to === myId && d.m) deliver(d.m);
  });

  // running the online rules when this player is the host
  function becomeHost() {
    hub = new Hub({
      send: (uid, m) => {
        if (uid === myId) return setTimeout(() => deliver(m), 0);
        room.emit('rfh', { to: uid, m }).catch(() => {});
      },
    });
    seen.clear(); peerUser.clear();
    // skip old messages (they were for the previous host), but sign everyone in again
    for (const p of room.peers()) {
      const rf = p.presence?.rf; if (!rf || !Array.isArray(rf.o)) continue;
      const lastLogin = [...rf.o].reverse().find(([, m]) => m?.type === 'login');
      if (lastLogin && /^RF-[A-Z0-9]{5}$/.test(rf.id)) hub.login({ id: rf.id, name: lastLogin[1].name, look: lastLogin[1].look, friends: lastLogin[1].friends, create: true });
      seen.set(p.peer, Math.max(0, ...rf.o.map(([n]) => n)));
    }
    tick = setInterval(() => hub.tick(), 1000);
    processPeers(room.peers());
  }
  function stopHost() { hub = null; clearInterval(tick); }
  function processPeers(peers) {
    if (!hub) return;
    const present = new Set();
    for (const p of peers) {
      const rf = p.presence?.rf; if (!rf || typeof rf.id !== 'string' || !/^RF-[A-Z0-9]{5}$/.test(rf.id)) continue;
      present.add(p.peer); peerUser.set(p.peer, rf.id);
      const last = seen.get(p.peer) || 0;
      for (const [n, m] of Array.isArray(rf.o) ? rf.o : []) {
        if (typeof n !== 'number' || n <= last || !m || typeof m.type !== 'string') continue;
        seen.set(p.peer, n);
        if (m.type === 'login') hub.login({ id: rf.id, name: m.name, look: m.look, friends: m.friends, create: !hub.users.has(rf.id) });
        else hub.handle(rf.id, m);
      }
    }
    for (const [peer, uid] of peerUser) if (!present.has(peer)) { peerUser.delete(peer); seen.delete(peer); hub.logout(uid); }
  }

  function electHost(peers) {
    const candidates = peers.filter(p => p.presence?.rf?.host).map(p => p.peer).sort();
    const next = candidates[0] || null;
    if (next !== hubPeer) {
      hubPeer = next;
      const mine = peers.find(p => p.peer === next)?.sameTab;
      if (mine && !hub) becomeHost(); else if (!mine && hub) stopHost();
      if (next) login();
    }
  }
  room.onPeers(ch => { electHost(ch.peers); processPeers(ch.peers); });

  // Can this viewer host? (people the link was shared with as viewers can play, not host)
  room.emit('rfh', { ping: 1 }).then(() => { canHost = true; publish(); }, () => { canHost = false; publish(); });
  publish();

  // live match state: a named room per match, everyone's state in presence
  function matchSync(match) {
    const handlers = [];
    let sub = null, pending = null;
    const name = 'm-' + String(match.lobby.match?.id || match.lobby.id).toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    room.join(name).then(r => {
      sub = r;
      r.onPeers(ch => {
        for (const p of ch.peers) if (!p.sameTab && p.presence?.s) for (const [id, s] of Object.entries(p.presence.s)) handlers.forEach(h => h(id, s));
      });
      if (pending) r.presence({ s: pending }).catch(() => {});
    }).catch(() => onMessage({ type: 'toast', text: 'Couldn’t join the match room. Try again.' }));
    return {
      send: states => {
        pending = states;
        if (sub) sub.presence({ s: states }).catch(() => {
          // too big: drop the build lists but keep positions
          const slim = Object.fromEntries(Object.entries(states).map(([k, v]) => [k, { ...v, b: (v.b || []).slice(-20) }]));
          sub.presence({ s: slim }).catch(() => {});
        });
      },
      onState: fn => handlers.push(fn),
    };
  }

  setTimeout(() => { if (!hubPeer) onMessage({ type: 'toast', text: 'Waiting for someone who can host (the owner of the link, or a friend with edit access)…' }); }, 5000);
  return { mode: 'room', send, close: () => {}, matchSync, myId };
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
    matchSync: () => ({ send: () => {}, onState: () => {} }),
  };
}
