// Everything a farmer can carry, with shop prices in coins.
// sell: what the shop pays you · buy: what it costs (only items the shop can stock)
export const ITEMS = {
  wood:        { name: 'Wood',        sell: 3,  buy: 5 },
  stone:       { name: 'Stone',       sell: 2,  buy: 4 },
  iron:        { name: 'Iron',        sell: 6,  buy: 10 },
  steel:       { name: 'Steel',       sell: 12, buy: 22 },
  glass:       { name: 'Glass',       sell: 4,  buy: 8 },
  door:        { name: 'Door',        buy: 12 },
  seeds:       { name: 'Wheat seeds', buy: 3 },
  carrotSeeds: { name: 'Carrot seeds', buy: 4 },
  pumpkinSeeds:{ name: 'Pumpkin seeds', buy: 6 },
  cornSeeds:   { name: 'Corn seeds',  buy: 5 },
  sunSeeds:    { name: 'Sunflower seeds', buy: 5 },
  sapling:     { name: 'Sapling',     buy: 12 },
  wheat:       { name: 'Wheat',       sell: 4 },
  carrot:      { name: 'Carrot',      sell: 5 },
  pumpkin:     { name: 'Pumpkin',     sell: 14 },
  corn:        { name: 'Corn',        sell: 7 },
  sunflower:   { name: 'Sunflower',   sell: 8 },
  egg:         { name: 'Egg',         sell: 3 },
  honey:       { name: 'Honey',       sell: 9 },
  bread:       { name: 'Bread',       buy: 4 },
  apple:       { name: 'Apple',       sell: 1, buy: 2 },
  sword:       { name: 'Sword',       buy: 35 },
};
// Food and how much hunger it fills
export const FOOD = { bread: 35, apple: 15, carrot: 12, egg: 10, corn: 18, honey: 20 };
export const START_INVENTORY = Object.fromEntries(Object.keys(ITEMS).map(k => [k, 0]));
Object.assign(START_INVENTORY, { bread: 2, seeds: 1 });
export const START_COINS = 15;
// What the shop can put on its shelves each day
export const STOCK_POOL = ['wood', 'stone', 'iron', 'steel', 'glass', 'door', 'bread', 'apple', 'seeds', 'carrotSeeds', 'pumpkinSeeds', 'cornSeeds', 'sunSeeds', 'sapling', 'sword'];
