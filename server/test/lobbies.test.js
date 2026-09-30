import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Lobbies } from '../src/lobbies.js';

const p = (id, skin = 'zino') => ({ id, name: id, skin });

test('friends join by code and the host picks the mode', () => {
  const l = new Lobbies();
  const lobby = l.create(p('ana'));
  l.join(lobby.code.toLowerCase(), p('bo'));
  assert.equal(lobby.players.length, 2);
  assert.throws(() => l.setMode(lobby.code, 'bo', '2v2'), /Only the host/);
  l.setMode(lobby.code, 'ana', '2v2');
  assert.equal(lobby.mode, '2v2');
});

test('two 1v1 lobbies searching get matched on different lands', () => {
  const l = new Lobbies();
  const a = l.create(p('ana')), b = l.create(p('bo', 'copper'));
  assert.equal(l.startSearch(a.code, 'ana'), null);
  const match = l.startSearch(b.code, 'bo');
  assert.equal(match.mode, '1v1');
  assert.deepEqual(match.teams.map(t => t.land), [0, 1]);
  assert.equal(match.teams[1].players[0].skin, 'copper');
  assert.equal(a.searching, false);
});

test('team size must match the mode', () => {
  const l = new Lobbies();
  const a = l.create(p('ana'));
  l.setMode(a.code, 'ana', '2v2');
  assert.throws(() => l.startSearch(a.code, 'ana'), /needs exactly 2 players/);
});

test('3v3v3 waits for three full teams', () => {
  const l = new Lobbies();
  const make = n => { const lob = l.create(p(n + '1')); l.join(lob.code, p(n + '2')); l.join(lob.code, p(n + '3')); l.setMode(lob.code, n + '1', '3v3v3'); return lob; };
  const [x, y, z] = [make('x'), make('y'), make('z')];
  assert.equal(l.startSearch(x.code, 'x1'), null);
  assert.equal(l.startSearch(y.code, 'y1'), null);
  assert.equal(l.startSearch(z.code, 'z1').teams.length, 3);
});

test('host leaving hands the lobby to the next player', () => {
  const l = new Lobbies();
  const a = l.create(p('ana'));
  l.join(a.code, p('bo'));
  l.leave(a.code, 'ana');
  assert.equal(a.host, 'bo');
  l.leave(a.code, 'bo');
  assert.equal(l.lobbies.has(a.code), false);
});
