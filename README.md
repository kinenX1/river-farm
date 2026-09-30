# River Farm

An online farm-versus game for Android. You and your team start on a flat piece of
land with one tree. Another team lives on the land across the river. Chop, sell at
the river shop, build a farm, a house, a barn, a bridge (if you want one), and
build your life before they do.

Farmers: **Mr. Zino** (old farmer, straw hat) and **Mr. Copper**. They're fat and
they waddle. Nobody runs.

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm run dev        # the game, at http://localhost:5173
npm run server     # the online server, at ws://localhost:8787
npm test           # server tests
```

`npm run dev` also prints a Network address. Open it on your phone (same Wi-Fi),
turn the phone sideways, and play.

## Folders

```
client/              the game (Three.js + Vite)
  index.html         HUD: stats, hotbar, joystick, shop and build sheets
  src/game.js        world rules: shop, building, weather, day/night, the bot
  src/menu.js        start menu: pick your farmer, Play
  src/models/        3D models: farmers, buildings, trees/rocks/flowers, items
  src/gfx/           painted textures, materials, 3D item icons
  src/data/items.js  every item and its shop price
  src/style.css
  src/online/        online menus: friends, Play steps, lobby; server connection
shared/hub.js        the online brain: players, friends, invites, lobbies,
                     matchmaking, lobby timers (used by server AND the demo)
server/src/index.js  WebSocket server, saves players to server/data/
server/test/         online tests
```

## Game rules so far

- Landscape only. Joystick to walk, one action button (Chop / Harvest / Shop).
- One starting tree per land (8 wood). After that you buy wood or saplings.
- The shop sits on an island in the river. 6 random items, restocked at midnight.
- Build: farm, fence, house, barn, stone wall, tree (from a sapling), bridge.
- Days and nights pass on their own. Rain is rare and random; it makes crops and
  trees grow faster. Storms are rarer.
- Online: every player gets an ID (like RF-KAYA7). Search IDs, add friends, see
  who's online, invite them.
- Play → Solo / Duo / Trio / Squad → mode (1v1, 1v1v1v1, 2v2, 2v2v2, 3v3, 3v3v3,
  4v4, 4v4v4v4) → Random online lobby or Create a lobby.
- Lobbies: host has a crown and starts the match. In random lobbies, if the host
  waits 1 minute a 2-minute countdown starts and the match starts by itself.
  Empty spots get bots.
- Custom lobbies: the host sets name, mode, who can join, match length, day
  length, starting coins, wood per tree, shop size, rain, storms, disasters,
  bridge, hunger, and bots.
- No server running? The Online button still works in demo mode with pretend
  players.

## Next up

- [ ] Real-time match sync (see teammates and enemies move and build)
- [ ] More than two lands for 3- and 4-team modes
- [ ] Server runs the match (time, weather, shop, everyone's land)
- [ ] Sword fighting, dying and the respawn pads
- [ ] Trading between teammates
- [ ] Disasters
- [ ] Android app for Google Play (Capacitor), landscape locked
- [ ] Offline mini-game
