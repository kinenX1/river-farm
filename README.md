# The Sides of the River

An online farm-versus game for Android. You and your team start on a flat
piece of land with one tree. The other team (or two teams) live across the
river. Chop, trade at the shop on the river island, grow crops, raise chickens
and bees, build a house, a barn, a windmill, a bridge if you want one, and
build your life before they do. Everyone is round and waddles. Nobody runs.

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm run dev        # the game, at http://localhost:5173 (also prints a link for your phone)
npm run server     # the online server, at ws://localhost:8787
npm test           # online tests
```

Turn the phone sideways: the game is landscape only.

## Website, phones and Google Play

`npm run build && npm start` runs the whole thing (website + online server) on
one address, port 8787. `render.yaml` puts it online for free on Render.
See [docs/GOOGLE_PLAY.md](docs/GOOGLE_PLAY.md) for the website, a test APK for
friends, and the Play Store steps. GitHub Actions builds the app on
every push to `main`.

## What's in it

- **Farmers**: 12 ready-made farmers from around the world (India, Oman,
  Jordan, Russia, Ghana, Nigeria, Japan, Mexico and more) or make your own:
  skin tone, hair, beard, headwear, clothes, colours and patterns.
- **Online**: player IDs, find players, friends with online status, invites.
  Play → Solo / Duo / Trio / Squad → 1v1, 1v1v1, 2v2, 2v2v2, 3v3, 3v3v3, 4v4,
  4v4v4 → random lobby or your own lobby with custom rules. The host (crown)
  starts; random lobbies start on their own after 1 + 2 minutes. Bots fill
  empty spots. In a match you see everyone move, build, chop and fight live.
- **Map**: 2 lands for two-team modes, 3 lands around a lake for three-team
  modes. Rivers, a spring, waterfalls into the sea, a shop island with docks.
- **Building**: 30 things in 5 tabs: wheat, carrot, pumpkin, corn and
  sunflower fields, apple trees, greenhouse, scarecrow, well, windmill, silo,
  house, bed, barn, mailbox, chicken coop, beehive, dog house, duck pond, lamp
  post, campfire, bench, picnic table, flower bed, haystack, cart, team flag,
  fences, stone walls, bridges.
- **Life**: day and night, rare rain that grows crops faster, storms, hunger,
  health, sleeping in your bed, sword fights, respawn at your bed or pad.
- **Shop**: 6 random items a day, the same for every player in a match.

## Folders

```
client/                the game (Three.js + Vite), and client/android (Capacitor app)
  src/game.js          the match: players, moving, actions, shop, building, sync
  src/world/map.js     the island with 2 or 3 lands, rivers, shop, bridges
  src/models/          3D models: farmers, buildings, nature, items
  src/gfx/             painted textures, materials, sky, grass, icons
  src/data/            items and the build catalog
  src/online/          online menus and the connection (server, shared link, demo)
  src/menu.js          start menu, farmer picker and creator
shared/                code used by both server and game
  hub.js               players, friends, invites, lobbies, matchmaking, timers
  looks.js             what a farmer looks like, and the 12 presets
server/                WebSocket server; saves players to server/data/
docs/GOOGLE_PLAY.md    how to ship it
render.yaml            free hosting for the website + server on Render
.github/workflows/     builds the Android app
```
