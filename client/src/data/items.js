// Everything a farmer can carry, with shop prices in coins.
export const ITEMS = {
  wood:    { name: 'Wood',    color: '#a0682f', sell: 3,  buy: 5 },
  wheat:   { name: 'Wheat',   color: '#e3c04a', sell: 4 },
  stone:   { name: 'Stone',   color: '#9a9a9a', sell: 2,  buy: 4 },
  iron:    { name: 'Iron',    color: '#c9c9d1', sell: 6,  buy: 10 },
  steel:   { name: 'Steel',   color: '#7f95ab', sell: 12, buy: 22 },
  door:    { name: 'Door',    color: '#6b4423', buy: 12 },
  bread:   { name: 'Bread',   color: '#d99b4a', buy: 4 },
  apple:   { name: 'Apple',   color: '#d9453b', buy: 2 },
  seeds:   { name: 'Seeds',   color: '#8bbf3c', buy: 3 },
  sapling: { name: 'Sapling', color: '#3f9b3a', buy: 12 },
  sword:   { name: 'Sword',   color: '#d9e2ec', buy: 35 },
};
export const FOOD = { bread: 35, apple: 15 };
export const START_INVENTORY = { wood: 0, wheat: 0, stone: 0, iron: 0, steel: 0, door: 0, bread: 2, apple: 0, seeds: 1, sapling: 0, sword: 0 };
export const START_COINS = 15;
