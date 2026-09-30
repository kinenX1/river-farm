import { connect } from './net.js';
import { TEAM_SIZES, MODES, DEFAULT_SETTINGS, SETTING_CHOICES } from '../../../shared/hub.js';

// Online menus: your ID and friends, Play → team size → mode → random or
// custom lobby, the lobby itself (crown, timer, invites), and match start.

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const store = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const modeLabel = m => m.replace(/v/g, ' v ');
const SETTING_LABELS = {
  days: ['Match length', v => `${v} days`],
  dayMinutes: ['Day length', v => `${v} min`],
  startCoins: ['Starting coins', v => `${v}`],
  treeWood: ['Wood per tree', v => `${v}`],
  shopItems: ['Shop items per day', v => `${v}`],
  weather: ['Rain', v => ({ off: 'Never', rare: 'Rare', normal: 'Normal', often: 'Often' })[v]],
};
const TOGGLES = { storms: 'Storms', disasters: 'Disasters', bridge: 'Bridge allowed', hunger: 'Hunger', fillBots: 'Fill empty spots with bots' };

export function startOnline({ getLook, onMatch }) {
  const root = $('online');
  let net = null, me = null, friends = [], requests = [], lobby = null, search = [], invites = [];
  let screen = 'home', size = 'solo', mode = '1v1', draft = { ...DEFAULT_SETTINGS }, showFriends = false, tickTimer = null;

  function toast(text) {
    const t = document.createElement('div'); t.className = 'ol-toast'; t.textContent = text;
    let box = $('olToasts');
    if (!box) { box = document.createElement('div'); box.id = 'olToasts'; document.body.append(box); }
    box.append(t); setTimeout(() => t.remove(), 3200);
  }

  function onMessage(m) {
    switch (m.type) {
      case 'me': me = m.user; store('rf-profile', { id: me.id, name: me.name }); break;
      case 'friends': friends = m.friends; requests = m.requests; break;
      case 'search': search = m.results; break;
      case 'lobby':
        lobby = m.lobby;
        if (lobby && screen !== 'lobby') screen = 'lobby';
        if (!lobby && screen === 'lobby') screen = 'home';
        break;
      case 'invite': invites = invites.filter(i => i.lobbyId !== m.lobbyId).concat(m); break;
      case 'match': finishMatch(m); return;
      case 'toast': toast(m.text); break;
      case 'error': toast(m.message); break;
      case 'disconnected': toast('Lost connection to the server'); break;
    }
    render();
  }

  async function open() {
    document.body.classList.add('in-online');
    root.hidden = false;
    if (!net) {
      root.innerHTML = '<div class="ol-loading">Connecting…</div>';
      const saved = load('rf-profile', {});
      net = await connect({ id: saved.id, name: saved.name || 'Farmer', look: getLook() }, onMessage);
      if (net.mode === 'demo') toast('No server found: you’re in demo mode with pretend players');
      clearInterval(tickTimer); tickTimer = setInterval(() => screen === 'lobby' && renderTimer(), 500);
    }
    screen = lobby ? 'lobby' : 'home';
    render();
  }
  function close() { root.hidden = true; document.body.classList.remove('in-online'); }

  function finishMatch(m) {
    const lobbyView = net.mode === 'demo'
      // demo players are pretend: the game runs them like bots
      ? { ...m.lobby, teams: m.lobby.teams.map(t => t.map(p => ({ ...p, bot: p.bot || p.id !== m.you }))) }
      : m.lobby;
    const team = lobbyView.teams[m.land].map(p => p.name);
    close();
    onMatch({ settings: m.lobby.settings, team, land: m.land, lobby: lobbyView, you: m.you, looks: m.looks, host: m.lobby.host === m.you, sync: net.matchSync(m) });
  }

  // ---------- rendering ----------
  function render() {
    if (root.hidden) return;
    const body = {
      home: homeScreen, size: sizeScreen, mode: modeScreen, how: howScreen, create: createScreen, lobby: lobbyScreen,
    }[screen]();
    root.innerHTML = `
      <div class="ol-top">
        <button class="wood" data-act="back">${screen === 'home' ? 'Menu' : 'Back'}</button>
        <div class="ol-me panel">
          <input id="olName" value="${esc(me?.name ?? '')}" maxlength="16" aria-label="Your farmer name">
          <span class="ol-id">ID <b>${esc(me?.id ?? '…')}</b></span>
          <button class="x" data-act="copy">Copy</button>
        </div>
        ${net?.mode === 'demo' ? '<span class="ol-demo">Demo mode</span>' : '<span class="ol-live">Online</span>'}
      </div>
      <div class="ol-body ${showFriends || screen === 'home' ? 'with-friends' : ''}">
        <section class="ol-main">${body}</section>
        ${showFriends || screen === 'home' ? `<aside class="ol-friends panel">${friendsPanel()}</aside>` : ''}
      </div>
      ${invites.map(inviteCard).join('')}`;
    renderTimer();
  }

  function friendsPanel() {
    const dot = s => `<i class="dot ${s.replace(' ', '-')}"></i>`;
    const canInvite = lobby && lobby.state === 'waiting';
    return `
      <h3>Find players</h3>
      <form class="ol-search" data-form="search"><input id="olSearch" placeholder="Player ID, like RF-KAYA7" autocomplete="off"><button>Search</button></form>
      ${search.map(u => `<div class="ol-row">${dot(u.status)}<span class="nm">${esc(u.name)} <small>${esc(u.id)}</small></span>
        ${friends.some(f => f.id === u.id) ? '<small>Friend</small>' : `<button class="x" data-act="add" data-id="${u.id}">Add</button>`}</div>`).join('')}
      ${requests.length ? `<h3>Friend requests</h3>` + requests.map(u => `<div class="ol-row">${dot(u.status)}<span class="nm">${esc(u.name)}</span>
        <button class="x" data-act="accept" data-id="${u.id}">Accept</button><button class="x red" data-act="decline" data-id="${u.id}">No</button></div>`).join('') : ''}
      <h3>Friends <small>${friends.filter(f => f.status !== 'offline').length} online</small></h3>
      ${friends.length ? friends.map(f => `<div class="ol-row ${f.status === 'offline' ? 'off' : ''}">${dot(f.status)}
        <span class="nm">${esc(f.name)} <small>${f.status}</small></span>
        ${canInvite && f.status !== 'offline' && !lobby.teams.flat().some(p => p.id === f.id) ? `<button class="x" data-act="invite" data-id="${f.id}">Invite</button>` : ''}</div>`).join('')
        : '<p class="ol-empty">No friends yet. Search a player ID above and tap Add.</p>'}`;
  }

  function homeScreen() {
    return `<div class="ol-hero">
      <h2>Play online</h2>
      <p>Pick Solo, Duo, Trio or Squad, choose a mode, then jump into a random lobby or make your own and invite friends.</p>
      <button class="big" data-act="play">Play</button>
    </div>`;
  }

  function sizeScreen() {
    return `<h2>How many on your team?</h2><div class="ol-cards">
      ${Object.entries(TEAM_SIZES).map(([k, t]) => `<button class="ol-card ${k === size ? 'on' : ''}" data-act="size" data-v="${k}">
        <span class="farmers">${'<i></i>'.repeat(t.size)}</span><b>${t.name}</b><small>${t.size} player${t.size > 1 ? 's' : ''}</small></button>`).join('')}
    </div>`;
  }

  function modeScreen() {
    const t = TEAM_SIZES[size];
    return `<h2>${t.name}: pick a mode</h2><div class="ol-cards">
      ${t.modes.map(m => `<button class="ol-card wide" data-act="mode" data-v="${m}">
        <b class="mode">${modeLabel(m)}</b><small>${MODES[m].teams} teams of ${MODES[m].teamSize}</small></button>`).join('')}
    </div>`;
  }

  function howScreen() {
    return `<h2>${modeLabel(mode)}: how do you want to play?</h2><div class="ol-cards">
      <button class="ol-card wide" data-act="random"><b>Random online lobby</b><small>Join players from anywhere. Starts by itself if the host waits too long.</small></button>
      <button class="ol-card wide" data-act="custom"><b>Create a lobby</b><small>Your match, your rules. Invite friends.</small></button>
    </div>`;
  }

  function settingsForm(s, editable) {
    const dis = editable ? '' : 'disabled';
    return `<div class="ol-settings">
      <label class="full">Lobby name <input id="set-name" value="${esc(s.name)}" maxlength="24" placeholder="${esc((me?.name ?? 'My') + '’s match')}" ${dis}></label>
      <label>Mode <select id="set-mode" ${dis}>${Object.keys(MODES).map(m => `<option ${m === s.mode ? 'selected' : ''} value="${m}">${modeLabel(m)}</option>`).join('')}</select></label>
      <label>Who can join <select id="set-visibility" ${dis}><option value="private" ${s.visibility === 'private' ? 'selected' : ''}>Friends I invite</option><option value="public" ${s.visibility === 'public' ? 'selected' : ''}>Anyone</option></select></label>
      ${Object.entries(SETTING_LABELS).map(([k, [label, fmt]]) => `<label>${label} <select id="set-${k}" ${dis}>
        ${SETTING_CHOICES[k].map(v => `<option value="${v}" ${v === s[k] ? 'selected' : ''}>${fmt(v)}</option>`).join('')}</select></label>`).join('')}
      ${Object.entries(TOGGLES).map(([k, label]) => `<label class="tog"><input type="checkbox" id="set-${k}" ${s[k] ? 'checked' : ''} ${dis}> ${label}</label>`).join('')}
    </div>`;
  }
  function readSettings() {
    const s = { name: $('set-name').value, mode: $('set-mode').value, visibility: $('set-visibility').value };
    for (const k of Object.keys(SETTING_LABELS)) { const v = $('set-' + k).value; s[k] = isNaN(v) ? v : Number(v); }
    for (const k of Object.keys(TOGGLES)) s[k] = $('set-' + k).checked;
    return s;
  }

  function createScreen() {
    return `<h2>Create your lobby</h2>${settingsForm(draft, true)}
      <div class="ol-actions"><button class="big" data-act="create">Create lobby</button></div>`;
  }

  function lobbyScreen() {
    if (!lobby) return '<p>Leaving…</p>';
    const host = lobby.host === me?.id;
    const myTeam = lobby.teams.findIndex(t => t.some(p => p.id === me?.id));
    const size = MODES[lobby.settings.mode].teamSize;
    return `
      <div class="ol-lobby-head">
        <div><h2>${esc(lobby.settings.name)}</h2>
          <small>${lobby.kind === 'random' ? 'Random lobby' : lobby.settings.visibility === 'public' ? 'Custom lobby · anyone can join' : 'Custom lobby · invite only'} · ${modeLabel(lobby.settings.mode)}</small></div>
        <div class="ol-timer" id="olTimer"></div>
      </div>
      <div class="ol-teams" style="--n:${lobby.teams.length}">
        ${lobby.teams.map((t, i) => `<div class="ol-team ${i === myTeam ? 'mine' : ''}">
          <h4>Team ${i + 1}${i === myTeam ? ' · you' : ''}</h4>
          ${t.map(p => `<div class="ol-player ${p.id === me?.id ? 'me' : ''}">
            ${p.id === lobby.host ? '<span class="crown" title="Host">♛</span>' : ''}
            <span class="nm">${esc(p.name)}</span>${p.bot ? '<small>bot</small>' : ''}
            ${host && p.id !== me.id && !p.bot ? `<button class="x red" data-act="kick" data-id="${p.id}">Kick</button>` : ''}</div>`).join('')}
          ${Array.from({ length: size - t.length }, () => `<div class="ol-player empty">${i !== myTeam ? `<button class="x" data-act="team" data-v="${i}">Join team</button>` : 'Open spot'}</div>`).join('')}
        </div>`).join('')}
      </div>
      ${lobby.kind === 'custom' ? `<details class="ol-rules" ${host ? 'open' : ''}><summary>Match rules${host ? ' (you can change these)' : ''}</summary>${settingsForm(lobby.settings, host)}</details>` : ''}
      <div class="ol-actions">
        ${host ? '<button class="big" data-act="start">Start</button>' : '<span class="ol-wait">Waiting for the host to start…</span>'}
        <button class="wood" data-act="friends">${showFriends ? 'Hide friends' : 'Invite friends'}</button>
        <button class="red" data-act="leave">Leave</button>
      </div>`;
  }

  function renderTimer() {
    const el = $('olTimer'); if (!el || !lobby) return;
    if (lobby.kind !== 'random') { el.textContent = ''; return; }
    const now = Date.now();
    if (lobby.countdownEndsAt) {
      const s = Math.max(0, Math.ceil((lobby.countdownEndsAt - now) / 1000));
      el.innerHTML = `Starts in <b>${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}</b>`;
      el.className = 'ol-timer hot';
    } else {
      const s = Math.max(0, Math.ceil((lobby.createdAt + lobby.waitBeforeTimer - now) / 1000));
      el.innerHTML = `Host has <b>${s}s</b> to start`;
      el.className = 'ol-timer';
    }
  }

  function inviteCard(inv) {
    return `<div class="ol-invite panel"><b>${esc(inv.from.name)}</b> invited you to <b>${esc(inv.name)}</b> (${modeLabel(inv.mode)})
      <div><button data-act="joinInvite" data-id="${inv.lobbyId}">Join</button><button class="red x" data-act="dropInvite" data-id="${inv.lobbyId}">No thanks</button></div></div>`;
  }

  // ---------- actions ----------
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const { act, id, v } = b.dataset;
    const send = msg => net?.send(msg);
    switch (act) {
      case 'back':
        if (screen === 'home') return close();
        if (screen === 'lobby') { send({ type: 'leave' }); screen = 'home'; }
        else screen = { size: 'home', mode: 'size', how: 'mode', create: 'how' }[screen];
        break;
      case 'copy': navigator.clipboard?.writeText(me.id).then(() => toast('ID copied'), () => toast(me.id)); return;
      case 'play': screen = 'size'; break;
      case 'size': size = v; screen = 'mode'; break;
      case 'mode': mode = v; screen = 'how'; break;
      case 'random': send({ type: 'quickJoin', mode }); break;
      case 'custom': draft = { ...DEFAULT_SETTINGS, mode }; screen = 'create'; break;
      case 'create': draft = readSettings(); send({ type: 'createLobby', settings: draft }); break;
      case 'start': send({ type: 'start' }); break;
      case 'leave': send({ type: 'leave' }); showFriends = false; break;
      case 'friends': showFriends = !showFriends; break;
      case 'team': send({ type: 'switchTeam', team: Number(v) }); break;
      case 'kick': send({ type: 'kick', id }); break;
      case 'add': send({ type: 'friendRequest', id }); break;
      case 'accept': send({ type: 'friendRespond', id, accept: true }); break;
      case 'decline': send({ type: 'friendRespond', id, accept: false }); break;
      case 'invite': send({ type: 'invite', id }); break;
      case 'joinInvite': { const inv = invites.find(i => i.lobbyId === id); invites = invites.filter(i => i.lobbyId !== id); send({ type: 'acceptInvite', lobbyId: id, team: inv?.team }); break; }
      case 'dropInvite': invites = invites.filter(i => i.lobbyId !== id); break;
    }
    render();
  });
  root.addEventListener('submit', e => {
    e.preventDefault();
    if (e.target.dataset.form === 'search') net?.send({ type: 'search', query: $('olSearch').value });
  });
  root.addEventListener('change', e => {
    if (e.target.id === 'olName') { net?.send({ type: 'profile', name: e.target.value, look: getLook() }); return; }
    if (e.target.id?.startsWith('set-') && screen === 'lobby' && lobby?.host === me?.id) net?.send({ type: 'updateSettings', settings: readSettings() });
  });

  return { open, leave: async () => { net?.send({ type: 'leave' }); await new Promise(r => setTimeout(r, 300)); } };
}
