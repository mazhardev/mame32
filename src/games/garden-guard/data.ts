/**
 * Garden Guard data: the defenders you plant, the pests that march in, and
 * the 15 levels across three gardens. A new defender joins your seed bank as
 * the levels go on.
 */
export type PlantId = 'sunbloom' | 'spitter' | 'shell' | 'popberry' | 'mine' | 'frost' | 'twin';

export interface PlantDef {
  id: PlantId;
  name: string;
  cost: number;
  /** Seconds before the card can be used again. */
  recharge: number;
  hp: number;
  blurb: string;
}

export const PLANTS: Record<PlantId, PlantDef> = {
  sunbloom: { id: 'sunbloom', name: 'Sunbloom', cost: 50, recharge: 7.5, hp: 300, blurb: 'Makes sunlight to spend on more plants.' },
  spitter: { id: 'spitter', name: 'Seed Spitter', cost: 100, recharge: 7.5, hp: 300, blurb: 'Spits seeds at pests in its row.' },
  shell: { id: 'shell', name: 'Stone Shell', cost: 50, recharge: 30, hp: 4000, blurb: 'A tough shell that holds pests up.' },
  popberry: { id: 'popberry', name: 'Pop Berry', cost: 150, recharge: 45, hp: 300, blurb: 'Bursts after a moment, flattening pests nearby.' },
  mine: { id: 'mine', name: 'Root Mine', cost: 25, recharge: 30, hp: 300, blurb: 'Arms itself underground, then blasts the first pest to step on it.' },
  frost: { id: 'frost', name: 'Frost Fern', cost: 175, recharge: 7.5, hp: 300, blurb: 'Icy seeds that also slow pests down.' },
  twin: { id: 'twin', name: 'Twin Spitter', cost: 200, recharge: 7.5, hp: 300, blurb: 'Spits two seeds at a time.' },
};

/** The order defenders appear in the seed bank, and the level each is first offered. */
export const UNLOCKS: [PlantId, number][] = [
  ['sunbloom', 0],
  ['spitter', 0],
  ['shell', 1],
  ['popberry', 2],
  ['mine', 3],
  ['frost', 5],
  ['twin', 8],
];

export const plantsFor = (level: number): PlantId[] => UNLOCKS.filter(([, at]) => at <= level).map(([id]) => id);

export type PestId = 'snail' | 'helmet' | 'armor' | 'hopper' | 'boss';

export interface PestDef {
  id: PestId;
  name: string;
  hp: number;
  /** Walking speed in px/s. */
  speed: number;
  /** Damage per second while eating a plant. */
  bite: number;
  /** Wave budget cost. */
  cost: number;
}

export const PESTS: Record<PestId, PestDef> = {
  snail: { id: 'snail', name: 'Garden Snail', hp: 200, speed: 8, bite: 100, cost: 1 },
  helmet: { id: 'helmet', name: 'Acorn-cap Beetle', hp: 560, speed: 8, bite: 100, cost: 2 },
  armor: { id: 'armor', name: 'Pot-shell Beetle', hp: 1300, speed: 8, bite: 100, cost: 4 },
  hopper: { id: 'hopper', name: 'Hopper', hp: 340, speed: 17, bite: 100, cost: 2 },
  boss: { id: 'boss', name: 'Big Toad', hp: 3000, speed: 6, bite: 500, cost: 10 },
};

export const GARDENS = ['Front Lawn', 'Orchard', 'Moonlit Garden'];
export const PER_GARDEN = 5;

export interface LevelDef {
  index: number;
  garden: number;
  name: string;
  waves: number;
  /** Pests that may appear, with how often. */
  pool: [PestId, number][];
  /** Budget of the first and last ordinary waves. */
  budget: [number, number];
  /** Seconds between suns falling from the sky (moonlight at night is rarer). */
  skySun: number;
  startSun: number;
}

const NAMES = [
  'First Sprouts',
  'Shell Game',
  'Berry Good',
  'Mine Field',
  'Lawn Party',
  'Orchard Gate',
  'Frosty Morning',
  'Hop Along',
  'Twin Trouble',
  'Toad Hall',
  'Moonrise',
  'Night Shift',
  'Dark Rows',
  'Midnight March',
  'The Last Patch',
];

export const LEVELS: LevelDef[] = NAMES.map((name, i) => {
  const garden = Math.floor(i / PER_GARDEN);
  const pool: [PestId, number][] = [['snail', 10]];
  if (i >= 1) pool.push(['helmet', i >= 6 ? 5 : 3]);
  if (i >= 4) pool.push(['armor', i >= 10 ? 2 : 1.5]);
  if (i >= 7) pool.push(['hopper', 3]);
  if (i === 9 || i >= 12) pool.push(['boss', i === 14 ? 1.2 : 0.6]);
  return {
    index: i,
    garden,
    name,
    waves: 4 + Math.min(5, Math.floor(i / 2)),
    pool,
    budget: [1 + i * 0.2, 3 + i * 0.6],
    skySun: garden < 2 ? 7 : 10,
    startSun: garden < 2 ? 50 : 250,
  };
});

export const ROWS = 5;
export const COLS = 9;
