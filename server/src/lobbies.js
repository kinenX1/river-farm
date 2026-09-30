// Lobbies and matchmaking. No networking in here, so it's easy to test.
//
// A lobby is a team: the host creates it, friends join with its code,
// the host picks a mode and starts searching. When enough teams of the
// same size are searching, they're put into one match.

export const MODES = {
  '1v1':     { teamSize: 1, teams: 2 },
  '1v1v1v1': { teamSize: 1, teams: 4 },
  '2v2':     { teamSize: 2, teams: 2 },
  '3v3':     { teamSize: 3, teams: 2 },
  '3v3v3':   { teamSize: 3, teams: 3 },
  '4v4':     { teamSize: 4, teams: 2 },
  '4v4v4':   { teamSize: 4, teams: 3 },
};

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export class Lobbies {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.lobbies = new Map();   // code -> lobby
    this.queue = new Map();     // mode -> [lobby codes], oldest first
    this.matches = [];
  }

  newCode() {
    let code;
    do {
      code = Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(this.random() * CODE_CHARS.length)]).join('');
    } while (this.lobbies.has(code));
    return code;
  }

  create(player) {
    const lobby = { code: this.newCode(), host: player.id, players: [player], mode: '1v1', searching: false };
    this.lobbies.set(lobby.code, lobby);
    return lobby;
  }

  join(code, player) {
    const lobby = this.lobbies.get(code?.toUpperCase());
    if (!lobby) throw new Error('No lobby with that code');
    if (lobby.searching) throw new Error('That lobby is already searching for a match');
    if (lobby.players.length >= 4) throw new Error('That lobby is full (4 players max)');
    if (!lobby.players.some(p => p.id === player.id)) lobby.players.push(player);
    return lobby;
  }

  leave(code, playerId) {
    const lobby = this.lobbies.get(code);
    if (!lobby) return null;
    lobby.players = lobby.players.filter(p => p.id !== playerId);
    this.stopSearch(code);
    if (!lobby.players.length) { this.lobbies.delete(code); return null; }
    if (lobby.host === playerId) lobby.host = lobby.players[0].id;
    return lobby;
  }

  setMode(code, playerId, mode) {
    const lobby = this.lobbies.get(code);
    if (!lobby) throw new Error('No lobby with that code');
    if (lobby.host !== playerId) throw new Error('Only the host can pick the mode');
    if (!MODES[mode]) throw new Error('Unknown mode');
    lobby.mode = mode;
    return lobby;
  }

  // Host presses Start. Returns a match if this completed one, else null.
  startSearch(code, playerId) {
    const lobby = this.lobbies.get(code);
    if (!lobby) throw new Error('No lobby with that code');
    if (lobby.host !== playerId) throw new Error('Only the host can start');
    const { teamSize, teams } = MODES[lobby.mode];
    if (lobby.players.length !== teamSize) throw new Error(`${lobby.mode} needs exactly ${teamSize} player${teamSize > 1 ? 's' : ''} in your lobby`);
    lobby.searching = true;
    const q = this.queue.get(lobby.mode) ?? [];
    if (!q.includes(code)) q.push(code);
    this.queue.set(lobby.mode, q);
    if (q.length < teams) return null;
    const codes = q.splice(0, teams);
    const match = {
      id: `m${this.matches.length + 1}`,
      mode: lobby.mode,
      seed: Math.floor(this.random() * 2 ** 31),
      teams: codes.map((c, i) => {
        const l = this.lobbies.get(c);
        l.searching = false;
        return { land: i, lobby: c, players: l.players.map(p => ({ id: p.id, name: p.name, skin: p.skin })) };
      }),
    };
    this.matches.push(match);
    return match;
  }

  stopSearch(code) {
    const lobby = this.lobbies.get(code);
    if (lobby) lobby.searching = false;
    for (const [mode, q] of this.queue) this.queue.set(mode, q.filter(c => c !== code));
  }
}
