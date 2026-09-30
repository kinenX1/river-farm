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
  src/game.js        world, farmers, shop, building, weather, day/night
  src/data/items.js  every item and its shop price
  src/style.css
server/              online: lobbies, friend codes, matchmaking (WebSocket)
  src/lobbies.js     lobby + matchmaking rules (tested)
  src/index.js       the WebSocket server
```

## Game rules so far

- Landscape only. Joystick to walk, one action button (Chop / Harvest / Shop).
- One starting tree per land (8 wood). After that you buy wood or saplings.
- The shop sits on an island in the river. 6 random items, restocked at midnight.
- Build: farm, fence, house, barn, stone wall, tree (from a sapling), bridge.
- Days and nights pass on their own. Rain is rare and random; it makes crops and
  trees grow faster. Storms are rarer.
- Modes: 1v1, 1v1v1v1, 2v2, 3v3, 3v3v3, 4v4, 4v4v4. Friends join your lobby with
  a code, the host starts, and you get matched against another team.

## Next up

- [ ] Connect the game to the server: sign-in, lobby screen, real opponents
- [ ] Server runs the match (time, weather, shop, everyone's land)
- [ ] Sword fighting, dying and the respawn pads
- [ ] Trading between teammates
- [ ] Disasters
- [ ] Android app for Google Play (Capacitor), landscape locked
- [ ] Offline mini-game
