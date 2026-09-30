// Everything you can build on your land. w/d: footprint (before rotating).
// solid: farmers can't walk through it. crop: a patch that grows that crop.
// makes: an animal building that produces an item every `every` seconds.
export const BUILD_TABS = [
  ['farm', 'Farming'],
  ['home', 'Home'],
  ['animals', 'Animals'],
  ['deco', 'Decor'],
  ['land', 'Land'],
];

export const BUILDS = {
  // farming
  wheatField:  { tab: 'farm', name: 'Wheat field',     cost: { wood: 3, seeds: 1 },        w: 6, d: 6, crop: 'wheat',     yield: ['wheat', 4] },
  carrotPatch: { tab: 'farm', name: 'Carrot patch',    cost: { wood: 3, carrotSeeds: 1 },  w: 5, d: 5, crop: 'carrot',    yield: ['carrot', 4] },
  pumpkinPatch:{ tab: 'farm', name: 'Pumpkin patch',   cost: { wood: 3, pumpkinSeeds: 1 }, w: 5, d: 5, crop: 'pumpkin',   yield: ['pumpkin', 2] },
  cornField:   { tab: 'farm', name: 'Corn field',      cost: { wood: 3, cornSeeds: 1 },    w: 5, d: 5, crop: 'corn',      yield: ['corn', 4] },
  sunflowers:  { tab: 'farm', name: 'Sunflowers',      cost: { wood: 3, sunSeeds: 1 },     w: 5, d: 5, crop: 'sunflower', yield: ['sunflower', 3] },
  tree:        { tab: 'farm', name: 'Apple tree',      cost: { sapling: 1 },               w: 2, d: 2, solid: true, note: 'Chop it for wood when it’s grown.' },
  greenhouse:  { tab: 'farm', name: 'Greenhouse',      cost: { wood: 6, glass: 6 },        w: 4.2, d: 3.2, solid: true, note: 'Makes carrots all year.', makes: ['carrot', 40] },
  scarecrow:   { tab: 'farm', name: 'Scarecrow',       cost: { wood: 2, wheat: 2 },        w: 1.2, d: 1.2, solid: true },
  well:        { tab: 'farm', name: 'Well',            cost: { stone: 6, wood: 2 },        w: 2.4, d: 2.4, solid: true, note: 'Crops next to it grow faster.' },
  windmill:    { tab: 'farm', name: 'Windmill',        cost: { wood: 12, stone: 4 },       w: 3.4, d: 3.4, solid: true, note: 'Turns wheat into bread.', makes: ['bread', 45], needs: 'wheat' },
  silo:        { tab: 'farm', name: 'Silo',            cost: { iron: 4, steel: 2 },        w: 3, d: 3, solid: true },
  // home
  house:       { tab: 'home', name: 'House',           cost: { wood: 10, door: 1 },        w: 4.6, d: 4.2, solid: true },
  bed:         { tab: 'home', name: 'Bed',             cost: { wood: 4, wheat: 1 },        w: 1.7, d: 2.7, solid: true, note: 'Sleep at night. You respawn here.' },
  barn:        { tab: 'home', name: 'Barn',            cost: { wood: 14, iron: 2 },        w: 6.2, d: 5.2, solid: true },
  mailbox:     { tab: 'home', name: 'Mailbox',         cost: { iron: 1, wood: 1 },         w: 0.8, d: 0.9 },
  // animals
  coop:        { tab: 'animals', name: 'Chicken coop', cost: { wood: 8, seeds: 2 },        w: 2.6, d: 2.4, solid: true, note: 'Chickens lay eggs.', makes: ['egg', 25] },
  beehive:     { tab: 'animals', name: 'Beehive',      cost: { wood: 3, sunflower: 1 },    w: 1, d: 1, solid: true, note: 'Bees make honey.', makes: ['honey', 35] },
  doghouse:    { tab: 'animals', name: 'Dog house',    cost: { wood: 5 },                  w: 1.6, d: 1.8, solid: true, note: 'A good dog.' },
  pond:        { tab: 'animals', name: 'Duck pond',    cost: { stone: 4 },                 w: 4, d: 4 },
  // decor
  lamp:        { tab: 'deco', name: 'Lamp post',       cost: { iron: 2, glass: 1 },        w: 0.6, d: 0.6, solid: true, note: 'Lights up at night.' },
  campfire:    { tab: 'deco', name: 'Campfire',        cost: { wood: 3, stone: 2 },        w: 1.6, d: 1.6, solid: true, note: 'Warm light at night.' },
  bench:       { tab: 'deco', name: 'Bench',           cost: { wood: 3, iron: 1 },         w: 2, d: 0.8 },
  table:       { tab: 'deco', name: 'Picnic table',    cost: { wood: 5 },                  w: 2.2, d: 1.8, solid: true },
  flowerBed:   { tab: 'deco', name: 'Flower bed',      cost: { wood: 2, seeds: 1 },        w: 2.4, d: 1.2 },
  haystack:    { tab: 'deco', name: 'Haystack',        cost: { wheat: 4 },                 w: 2.4, d: 2.4, solid: true },
  cart:        { tab: 'deco', name: 'Cart',            cost: { wood: 6, iron: 1 },         w: 2.2, d: 1.8, solid: true },
  flag:        { tab: 'deco', name: 'Team flag',       cost: { wood: 2 },                  w: 0.6, d: 0.6, solid: true },
  // land
  fence:       { tab: 'land', name: 'Fence',           cost: { wood: 1 },                  w: 3, d: 0.4, solid: true },
  wall:        { tab: 'land', name: 'Stone wall',      cost: { stone: 2 },                 w: 3, d: 0.8, solid: true },
  bridge:      { tab: 'land', name: 'Bridge',          cost: { wood: 12 },                 bridge: true, note: 'Stand at your river bank to build one across.' },
};
