import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Hub, WAIT_BEFORE_TIMER, AUTO_START_AFTER } from '../../shared/hub.js';

function setup() {
  let t = 0;
  const inbox = new Map();
  const hub = new Hub({ now: () => t, send: (id, m) => { if (!inbox.has(id)) inbox.set(id, []); inbox.get(id).push(m); } });
  const last = (id, type) => inbox.get(id)?.filter(m => m.type === type).at(-1);
  return { hub, last, advance: ms => { t += ms; hub.tick(); } };
}

test('new players get an ID and can find each other', () => {
  const { hub, last } = setup();
  const ana = hub.login({ name: 'Ana' }), bo = hub.login({ name: 'Bo' });
  assert.match(ana.id, /^RF-[A-Z0-9]{5}$/);
  hub.handle(ana.id, { type: 'search', query: bo.id.slice(3) });
  assert.equal(last(ana.id, 'search').results[0].name, 'Bo');
});

test('friend requests, accept, and online/offline status', () => {
  const { hub, last } = setup();
  const ana = hub.login({ name: 'Ana' }), bo = hub.login({ name: 'Bo' });
  hub.handle(ana.id, { type: 'friendRequest', id: bo.id });
  assert.equal(last(bo.id, 'friends').requests[0].name, 'Ana');
  hub.handle(bo.id, { type: 'friendRespond', id: ana.id, accept: true });
  assert.equal(last(ana.id, 'friends').friends[0].status, 'online');
  hub.logout(bo.id);
  assert.equal(last(ana.id, 'friends').friends[0].status, 'offline');
});

test('random lobby: first player is host, others fill in, timer auto-starts', () => {
  const { hub, last, advance } = setup();
  const ana = hub.login({ name: 'Ana' }), bo = hub.login({ name: 'Bo' });
  hub.handle(ana.id, { type: 'quickJoin', mode: '2v2' });
  hub.handle(bo.id, { type: 'quickJoin', mode: '2v2' });
  const lobby = last(bo.id, 'lobby').lobby;
  assert.equal(lobby.host, ana.id);
  assert.equal(lobby.teams.flat().length, 2);
  hub.handle(bo.id, { type: 'start' });
  assert.match(last(bo.id, 'error').message, /Only the host/);
  advance(WAIT_BEFORE_TIMER);
  assert.ok(last(ana.id, 'lobby').lobby.countdownEndsAt);
  advance(AUTO_START_AFTER);
  const match = last(ana.id, 'match');
  assert.ok(match, 'match started by itself');
  assert.equal(match.lobby.teams.flat().length, 4, 'empty spots filled with bots');
});

test('custom lobby: invite a friend onto your team, host changes settings and starts', () => {
  const { hub, last } = setup();
  const ana = hub.login({ name: 'Ana' }), bo = hub.login({ name: 'Bo' });
  hub.handle(ana.id, { type: 'friendRequest', id: bo.id });
  hub.handle(bo.id, { type: 'friendRespond', id: ana.id, accept: true });
  hub.handle(ana.id, { type: 'createLobby', settings: { mode: '2v2', startCoins: 50, weather: 'often' } });
  hub.handle(ana.id, { type: 'invite', id: bo.id });
  const inv = last(bo.id, 'invite');
  assert.equal(inv.from.name, 'Ana');
  hub.handle(bo.id, { type: 'acceptInvite', lobbyId: inv.lobbyId, team: inv.team });
  let lobby = last(ana.id, 'lobby').lobby;
  assert.deepEqual(lobby.teams[0].map(p => p.name), ['Ana', 'Bo']);
  assert.equal(lobby.settings.startCoins, 50);
  hub.handle(bo.id, { type: 'updateSettings', settings: { days: 5 } });
  assert.match(last(bo.id, 'error').message, /Only the host/);
  hub.handle(ana.id, { type: 'updateSettings', settings: { days: 5, startCoins: 9999 } });
  lobby = last(ana.id, 'lobby').lobby;
  assert.equal(lobby.settings.days, 5);
  assert.equal(lobby.settings.startCoins, 50, 'invalid values are ignored');
  hub.handle(ana.id, { type: 'start' });
  assert.equal(last(bo.id, 'match').land, 0);
});

test('you can only invite friends', () => {
  const { hub, last } = setup();
  const ana = hub.login({ name: 'Ana' }), cy = hub.login({ name: 'Cy' });
  hub.handle(ana.id, { type: 'createLobby', settings: {} });
  hub.handle(ana.id, { type: 'invite', id: cy.id });
  assert.match(last(ana.id, 'error').message, /only invite friends/);
});

test('host leaving passes the crown', () => {
  const { hub, last } = setup();
  const ana = hub.login({ name: 'Ana' }), bo = hub.login({ name: 'Bo' });
  hub.handle(ana.id, { type: 'quickJoin', mode: '1v1' });
  hub.handle(bo.id, { type: 'quickJoin', mode: '1v1' });
  hub.handle(ana.id, { type: 'leave' });
  assert.equal(last(bo.id, 'lobby').lobby.host, bo.id);
});

test('changing mode re-seats players into the new teams', () => {
  const { hub, last } = setup();
  const ana = hub.login({ name: 'Ana' });
  hub.handle(ana.id, { type: 'createLobby', settings: { mode: '1v1' } });
  hub.handle(ana.id, { type: 'updateSettings', settings: { mode: '3v3v3' } });
  const lobby = last(ana.id, 'lobby').lobby;
  assert.equal(lobby.teams.length, 3);
  assert.equal(lobby.teams.flat().length, 1);
});

test('saved players come back with their friends', () => {
  const { hub } = setup();
  const ana = hub.login({ name: 'Ana' }), bo = hub.login({ name: 'Bo' });
  hub.friendRequest(ana.id, bo.id); hub.friendRespond(bo.id, ana.id, true);
  const again = new Hub({ users: hub.exportUsers() });
  assert.ok(again.users.get(ana.id).friends.has(bo.id));
});
