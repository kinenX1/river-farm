// The online "brain": players, friends, invites, lobbies and matchmaking.
// It never touches the network. Whoever runs it (the real server, or the
// offline demo inside the game) passes a send(userId, message) function.
// The same code runs on the server and in the browser.
import { sanitizeLook, PRESETS } from './looks.js';

export const TEAM_SIZES = {
  solo:  { name: 'Solo',  size: 1, modes: ['1v1', '1v1v1v1'] },
  duo:   { name: 'Duo',   size: 2, modes: ['2v2', '2v2v2'] },
  trio:  { name: 'Trio',  size: 3, modes: ['3v3', '3v3v3'] },
  squad: { name: 'Squad', size: 4, modes: ['4v4', '4v4v4v4'] },
};

export const MODES = {
  '1v1':     { teamSize: 1, teams: 2 },
  '1v1v1v1': { teamSize: 1, teams: 4 },
  '2v2':     { teamSize: 2, teams: 2 },
  '2v2v2':   { teamSize: 2, teams: 3 },
  '3v3':     { teamSize: 3, teams: 2 },
  '3v3v3':   { teamSize: 3, teams: 3 },
  '4v4':     { teamSize: 4, teams: 2 },
  '4v4v4v4': { teamSize: 4, teams: 4 },
};

// Everything the host of a custom lobby can change
export const DEFAULT_SETTINGS = {
  name: '',
  mode: '1v1',
  visibility: 'private',   // private: invite only · public: random players can join too
  days: 10,                // how many in-game days the match lasts
  dayMinutes: 2,           // real minutes per in-game day
  startCoins: 15,
  treeWood: 8,             // wood in each team's starting tree
  shopItems: 6,            // items in the shop each day
  weather: 'rare',         // off · rare · normal · often
  storms: true,
  disasters: false,
  bridge: true,            // can teams build the bridge?
  hunger: true,
  fillBots: true,          // fill empty spots with bots when the match starts
};
export const SETTING_CHOICES = {
  days: [5, 10, 20, 30],
  dayMinutes: [1, 2, 4, 8],
  startCoins: [0, 15, 50, 100],
  treeWood: [4, 8, 16],
  shopItems: [4, 6, 8],
  weather: ['off', 'rare', 'normal', 'often'],
};

// A random lobby waits WAIT_BEFORE_TIMER for the host, then counts down AUTO_START_AFTER and starts by itself
export const WAIT_BEFORE_TIMER = 60_000;
export const AUTO_START_AFTER = 120_000;

const ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const BOT_NAMES = ['Farmer Bob', 'Old Mira', 'Big Tomo', 'Aunt Pip', 'Hank', 'Lulu', 'Grandpa Oz', 'Nell', 'Rusty', 'Dot', 'Barley Ben', 'Juniper'];

export class Hub {
  constructor({ send = () => {}, now = () => Date.now(), random = Math.random, users = [] } = {}) {
    this.send = send;
    this.now = now;
    this.random = random;
    this.users = new Map();     // id -> user
    this.lobbies = new Map();   // id -> lobby
    this.botCount = 0;
    for (const u of users) this.users.set(u.id, { ...u, look: sanitizeLook(u.look || 'zino'), friends: new Set(u.friends || []), requests: new Set(u.requests || []), online: false, lobby: null, bot: !!u.bot });
  }

  // ---------- players ----------
  newId(prefix = 'RF-') {
    let id;
    do id = prefix + Array.from({ length: 5 }, () => ID_CHARS[Math.floor(this.random() * ID_CHARS.length)]).join('');
    while (this.users.has(id) || this.lobbies.has(id));
    return id;
  }

  // Sign in with a saved id, or make a new player
  login({ id, name, look, create = false } = {}) {
    let u = id && this.users.get(id);
    if (!u) {
      u = { id: create && id ? id : this.newId(), name: 'Farmer', look: sanitizeLook('zino'), friends: new Set(), requests: new Set(), online: false, lobby: null, bot: false };
      this.users.set(u.id, u);
    }
    if (name) u.name = String(name).trim().slice(0, 16) || u.name;
    if (look) u.look = sanitizeLook(look);
    u.online = true;
    this.send(u.id, { type: 'me', user: this.publicUser(u, true) });
    this.pushFriends(u);
    this.notifyFriends(u);
    if (u.lobby) this.pushLobby(this.lobbies.get(u.lobby));
    return u;
  }

  logout(id) {
    const u = this.users.get(id);
    if (!u) return;
    if (u.lobby) this.leave(id);
    u.online = false;
    this.notifyFriends(u);
  }

  status(u) {
    if (!u.online) return 'offline';
    const l = u.lobby && this.lobbies.get(u.lobby);
    if (l?.state === 'playing') return 'in match';
    if (l) return 'in lobby';
    return 'online';
  }

  publicUser(u, self = false) {
    const out = { id: u.id, name: u.name, status: this.status(u), bot: u.bot };
    if (self) out.lobby = u.lobby;
    return out;
  }

  search(byId, query) {
    const q = String(query || '').trim().toUpperCase();
    if (q.length < 2) return [];
    const results = [...this.users.values()]
      .filter(u => u.id !== byId && !u.bot && (u.id.includes(q) || u.name.toUpperCase().includes(q)))
      .slice(0, 10).map(u => this.publicUser(u));
    this.send(byId, { type: 'search', query, results });
    return results;
  }

  // ---------- friends ----------
  friendRequest(fromId, toId) {
    const from = this.need(fromId), to = this.users.get(toId);
    if (!to || to.bot) throw new Error('No player with that ID');
    if (to.id === from.id) throw new Error('That’s you!');
    if (from.friends.has(to.id)) throw new Error('You’re already friends');
    if (from.requests.has(to.id)) return this.friendRespond(fromId, toId, true); // they already asked you
    to.requests.add(from.id);
    this.pushFriends(to);
    this.send(to.id, { type: 'toast', text: `${from.name} wants to be your friend` });
    this.send(from.id, { type: 'toast', text: `Friend request sent to ${to.name}` });
  }

  friendRespond(id, otherId, accept) {
    const u = this.need(id), other = this.users.get(otherId);
    u.requests.delete(otherId);
    if (accept && other) {
      u.friends.add(other.id); other.friends.add(u.id);
      other.requests.delete(u.id);
      this.send(other.id, { type: 'toast', text: `${u.name} accepted your friend request` });
      this.pushFriends(other);
    }
    this.pushFriends(u);
  }

  removeFriend(id, otherId) {
    const u = this.need(id), other = this.users.get(otherId);
    u.friends.delete(otherId); other?.friends.delete(id);
    this.pushFriends(u); if (other) this.pushFriends(other);
  }

  pushFriends(u) {
    if (u.bot) return;
    const list = [...u.friends].map(id => this.users.get(id)).filter(Boolean).map(f => this.publicUser(f));
    const order = { online: 0, 'in lobby': 1, 'in match': 2, offline: 3 };
    list.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
    const requests = [...u.requests].map(id => this.users.get(id)).filter(Boolean).map(f => this.publicUser(f));
    this.send(u.id, { type: 'friends', friends: list, requests });
  }

  notifyFriends(u) {
    for (const id of u.friends) { const f = this.users.get(id); if (f?.online) this.pushFriends(f); }
  }

  // ---------- lobbies ----------
  newLobby(host, { kind, settings }) {
    const s = { ...DEFAULT_SETTINGS, ...settings };
    if (!MODES[s.mode]) throw new Error('Unknown mode');
    const { teams } = MODES[s.mode];
    const lobby = {
      id: this.newId('L-'),
      kind,                                   // 'random' or 'custom'
      settings: s,
      host: host.id,
      teams: Array.from({ length: teams }, () => []),
      createdAt: this.now(),
      countdownEndsAt: null,
      state: 'waiting',
      match: null,
    };
    if (!s.name) s.name = kind === 'random' ? `Random ${s.mode}` : `${host.name}’s match`;
    this.lobbies.set(lobby.id, lobby);
    return lobby;
  }

  members(lobby) { return lobby.teams.flat(); }
  capacity(lobby) { const m = MODES[lobby.settings.mode]; return m.teamSize * m.teams; }

  addToLobby(lobby, u, preferTeam = null) {
    if (u.lobby === lobby.id) return;
    if (u.lobby) this.leave(u.id);
    if (lobby.state !== 'waiting') throw new Error('That match already started');
    const { teamSize } = MODES[lobby.settings.mode];
    let t = preferTeam;
    if (t == null || lobby.teams[t].length >= teamSize) {
      t = lobby.teams.map((m, i) => [m.length, i]).filter(([n]) => n < teamSize).sort((a, b) => a[0] - b[0])[0]?.[1];
    }
    if (t == null) throw new Error('That lobby is full');
    lobby.teams[t].push(u.id);
    u.lobby = lobby.id;
    this.notifyFriends(u);
  }

  // "Random online lobby": join a waiting public lobby for this mode, or open one
  quickJoin(id, mode) {
    const u = this.need(id);
    if (!MODES[mode]) throw new Error('Unknown mode');
    let lobby = [...this.lobbies.values()].find(l =>
      l.state === 'waiting' && l.settings.mode === mode && (l.kind === 'random' || l.settings.visibility === 'public') &&
      this.members(l).length < this.capacity(l) && !this.members(l).includes(id));
    if (!lobby) lobby = this.newLobby(u, { kind: 'random', settings: { mode, visibility: 'public' } });
    this.addToLobby(lobby, u);
    this.pushLobby(lobby);
    return lobby;
  }

  createLobby(id, settings) {
    const u = this.need(id);
    const lobby = this.newLobby(u, { kind: 'custom', settings: sanitize(settings) });
    this.addToLobby(lobby, u, 0);
    this.pushLobby(lobby);
    return lobby;
  }

  updateSettings(id, settings) {
    const u = this.need(id), lobby = this.lobbyOf(u);
    if (lobby.host !== id) throw new Error('Only the host can change the match');
    if (lobby.kind !== 'custom') throw new Error('Random lobbies use the standard rules');
    const next = { ...lobby.settings, ...sanitize(settings) };
    if (next.mode !== lobby.settings.mode) {
      // re-seat everyone into the new team layout
      const everyone = this.members(lobby);
      const m = MODES[next.mode];
      if (everyone.length > m.teams * m.teamSize) throw new Error(`Too many players for ${next.mode}`);
      lobby.teams = Array.from({ length: m.teams }, () => []);
      everyone.forEach(pid => lobby.teams.reduce((a, b) => (b.length < a.length ? b : a)).push(pid));
    }
    lobby.settings = next;
    this.pushLobby(lobby);
  }

  switchTeam(id, team) {
    const u = this.need(id), lobby = this.lobbyOf(u);
    const { teamSize } = MODES[lobby.settings.mode];
    if (!lobby.teams[team]) throw new Error('No such team');
    if (lobby.teams[team].length >= teamSize) throw new Error('That team is full');
    lobby.teams = lobby.teams.map(t => t.filter(p => p !== id));
    lobby.teams[team].push(id);
    this.pushLobby(lobby);
  }

  kick(id, targetId) {
    const u = this.need(id), lobby = this.lobbyOf(u);
    if (lobby.host !== id) throw new Error('Only the host can kick');
    if (targetId === id) return;
    this.leave(targetId);
    this.send(targetId, { type: 'toast', text: 'The host removed you from the lobby' });
  }

  leave(id) {
    const u = this.users.get(id);
    const lobby = u?.lobby && this.lobbies.get(u.lobby);
    if (!lobby) return;
    lobby.teams = lobby.teams.map(t => t.filter(p => p !== id));
    u.lobby = null;
    this.send(id, { type: 'lobby', lobby: null });
    this.notifyFriends(u);
    const humans = this.members(lobby).filter(p => !this.users.get(p)?.bot);
    if (!humans.length) {
      for (const p of this.members(lobby)) { const b = this.users.get(p); if (b) b.lobby = null; }
      this.lobbies.delete(lobby.id);
      return;
    }
    if (lobby.host === id) lobby.host = humans[0];
    this.pushLobby(lobby);
  }

  // ---------- invites ----------
  invite(fromId, toId) {
    const from = this.need(fromId), to = this.users.get(toId);
    const lobby = this.lobbyOf(from);
    if (!to) throw new Error('No player with that ID');
    if (!from.friends.has(toId)) throw new Error('You can only invite friends');
    if (!to.online) throw new Error(`${to.name} is offline`);
    if (this.members(lobby).includes(toId)) throw new Error(`${to.name} is already here`);
    const team = lobby.teams.findIndex(t => t.includes(fromId));
    this.send(toId, { type: 'invite', from: this.publicUser(from), lobbyId: lobby.id, team, mode: lobby.settings.mode, name: lobby.settings.name });
    this.send(fromId, { type: 'toast', text: `Invite sent to ${to.name}` });
    if (to.bot) setTimeoutSafe(() => { try { this.acceptInvite(toId, lobby.id, team); } catch {} }, 1200);
  }

  acceptInvite(id, lobbyId, team = null) {
    const u = this.need(id), lobby = this.lobbies.get(lobbyId);
    if (!lobby) throw new Error('That lobby is gone');
    this.addToLobby(lobby, u, team);
    this.pushLobby(lobby);
  }

  // ---------- starting ----------
  start(id) {
    const u = this.need(id), lobby = this.lobbyOf(u);
    if (lobby.host !== id) throw new Error('Only the host (crown) can start');
    this.launch(lobby);
  }

  launch(lobby) {
    if (lobby.state !== 'waiting') return;
    const { teamSize } = MODES[lobby.settings.mode];
    if (lobby.settings.fillBots) {
      for (const t of lobby.teams) while (t.length < teamSize) t.push(this.makeBot(lobby).id);
    }
    if (lobby.teams.filter(t => t.length).length < 2) throw new Error('You need at least 2 teams with players');
    lobby.state = 'playing';
    lobby.match = { id: this.newId('M-'), seed: Math.floor(this.random() * 2 ** 31), startedAt: this.now() };
    this.pushLobby(lobby);
    lobby.teams.forEach((t, land) => t.forEach(pid => {
      this.send(pid, { type: 'match', lobby: this.lobbyView(lobby), land, you: pid, looks: Object.fromEntries(this.members(lobby).map(id => [id, this.users.get(id).look])) });
    }));
    this.members(lobby).forEach(pid => { const p = this.users.get(pid); if (p && !p.bot) this.notifyFriends(p); });
  }

  // Called about once a second: runs the random-lobby timers
  tick() {
    const now = this.now();
    for (const lobby of this.lobbies.values()) {
      if (lobby.state !== 'waiting' || lobby.kind !== 'random') continue;
      if (!lobby.countdownEndsAt && now - lobby.createdAt >= WAIT_BEFORE_TIMER) {
        lobby.countdownEndsAt = now + AUTO_START_AFTER;
        this.pushLobby(lobby);
      }
      if (lobby.countdownEndsAt && now >= lobby.countdownEndsAt) {
        try { this.launch(lobby); } catch {}
      }
    }
  }

  makeBot(lobby) {
    const name = BOT_NAMES[this.botCount++ % BOT_NAMES.length];
    const keys = Object.keys(PRESETS);
    const bot = { id: this.newId('B-'), name, look: sanitizeLook(keys[Math.floor(this.random() * keys.length)]), friends: new Set(), requests: new Set(), online: true, lobby: lobby.id, bot: true };
    this.users.set(bot.id, bot);
    return bot;
  }

  // ---------- helpers ----------
  need(id) { const u = this.users.get(id); if (!u) throw new Error('Sign in first'); return u; }
  lobbyOf(u) { const l = u.lobby && this.lobbies.get(u.lobby); if (!l) throw new Error('You’re not in a lobby'); return l; }

  lobbyView(lobby) {
    return {
      id: lobby.id, kind: lobby.kind, host: lobby.host, state: lobby.state, settings: lobby.settings,
      createdAt: lobby.createdAt, countdownEndsAt: lobby.countdownEndsAt, match: lobby.match,
      waitBeforeTimer: WAIT_BEFORE_TIMER,
      teams: lobby.teams.map(t => t.map(id => this.publicUser(this.users.get(id)))),
    };
  }

  pushLobby(lobby) {
    if (!lobby) return;
    const view = this.lobbyView(lobby);
    for (const id of this.members(lobby)) if (!this.users.get(id)?.bot) this.send(id, { type: 'lobby', lobby: view });
  }

  // What the server saves to disk
  exportUsers() {
    return [...this.users.values()].filter(u => !u.bot).map(u => ({ id: u.id, name: u.name, look: u.look, friends: [...u.friends], requests: [...u.requests] }));
  }

  // Apply one message from a player. Errors go back to that player.
  handle(id, msg) {
    try {
      switch (msg.type) {
        case 'search': return this.search(id, msg.query);
        case 'friendRequest': return this.friendRequest(id, msg.id);
        case 'friendRespond': return this.friendRespond(id, msg.id, !!msg.accept);
        case 'removeFriend': return this.removeFriend(id, msg.id);
        case 'profile': { const u = this.need(id); return this.login({ id, name: msg.name ?? u.name, look: msg.look ?? u.look }); }
        case 'quickJoin': return this.quickJoin(id, msg.mode);
        case 'createLobby': return this.createLobby(id, msg.settings);
        case 'updateSettings': return this.updateSettings(id, msg.settings);
        case 'switchTeam': return this.switchTeam(id, msg.team);
        case 'kick': return this.kick(id, msg.id);
        case 'invite': return this.invite(id, msg.id);
        case 'acceptInvite': return this.acceptInvite(id, msg.lobbyId, msg.team);
        case 'start': return this.start(id);
        case 'leave': return this.leave(id);
      }
    } catch (e) {
      this.send(id, { type: 'error', message: e.message });
    }
  }
}

function sanitize(s = {}) {
  const out = {};
  if (typeof s.name === 'string') out.name = s.name.trim().slice(0, 24);
  if (MODES[s.mode]) out.mode = s.mode;
  if (s.visibility === 'public' || s.visibility === 'private') out.visibility = s.visibility;
  for (const [k, choices] of Object.entries(SETTING_CHOICES)) if (choices.includes(s[k])) out[k] = s[k];
  for (const k of ['storms', 'disasters', 'bridge', 'hunger', 'fillBots']) if (typeof s[k] === 'boolean') out[k] = s[k];
  return out;
}

function setTimeoutSafe(fn, ms) { if (typeof setTimeout === 'function') setTimeout(fn, ms); }
