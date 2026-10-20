import { createRng } from '@/utils/random';
import { COLS, FLOOR, ROWS, SOFT, baseGrid, idx } from './maze';

/**
 * Blast Maze adventure: 40 stages in five areas of eight. The eighth stage
 * of each area is a boss arena. Stages are generated from a fixed seed, so
 * a stage always has the same layout.
 */
export type EnemyKind = 'puffle' | 'bouncer' | 'ghostie' | 'chaser' | 'zapper' | 'splitter' | 'mini' | 'hurry';
export type ItemKind = 'bomb' | 'fire' | 'speed' | 'remote' | 'kick' | 'pass' | 'bombpass' | 'vest' | 'life';

export const ITEM_KINDS: ItemKind[] = ['bomb', 'fire', 'speed', 'remote', 'kick', 'pass', 'bombpass', 'vest', 'life'];

export interface Area {
  name: string;
  floor: [string, string];
  wall: [string, string];
  soft: [string, string];
  boss: string;
}

export const AREAS: Area[] = [
  { name: 'Garden Grove', floor: ['#4d8f3a', '#478636'], wall: ['#7c8796', '#5a6472'], soft: ['#3f7a2c', '#2f5e21'], boss: 'King Puffle' },
  { name: 'Desert Dig', floor: ['#d9b26f', '#d0a862'], wall: ['#9c7a4f', '#7a5c38'], soft: ['#b9773b', '#8f5627'], boss: 'Sandwing' },
  { name: 'Crystal Mine', floor: ['#3b3557', '#36304f'], wall: ['#5b5478', '#433d5e'], soft: ['#7c5cd6', '#5a3fb0'], boss: 'Phantom Lord' },
  { name: 'Frost Fort', floor: ['#cfe6f5', '#c4ddef'], wall: ['#7ea3c2', '#5f84a3'], soft: ['#eef7ff', '#b9d6ec'], boss: 'Gearhead' },
  { name: 'Lava Lab', floor: ['#4b4f57', '#454950'], wall: ['#2d3036', '#1e2024'], soft: ['#b5452c', '#8a2f1c'], boss: 'Dread Reactor' },
];

export const PER_AREA = 8;
export const STAGES = AREAS.length * PER_AREA;

/** The power-up hidden on each stage (boss stages have none). */
const STAGE_ITEMS: (ItemKind | null)[] = [
  'fire', 'bomb', 'fire', 'speed', 'bomb', 'kick', 'fire', null,
  'bomb', 'remote', 'fire', 'speed', 'bombpass', 'bomb', 'vest', null,
  'fire', 'pass', 'bomb', 'life', 'speed', 'fire', 'bomb', null,
  'remote', 'fire', 'bomb', 'vest', 'kick', 'life', 'fire', null,
  'bomb', 'fire', 'speed', 'pass', 'bomb', 'vest', 'life', null,
];

const POOLS: EnemyKind[][] = [
  ['puffle', 'puffle', 'bouncer'],
  ['puffle', 'bouncer', 'ghostie', 'bouncer'],
  ['bouncer', 'ghostie', 'chaser', 'splitter'],
  ['ghostie', 'chaser', 'splitter', 'zapper'],
  ['chaser', 'splitter', 'zapper', 'ghostie', 'zapper'],
];

export interface StagePlan {
  index: number;
  area: number;
  boss: number | null;
  density: number;
  enemies: EnemyKind[];
  item: ItemKind | null;
  time: number;
}

export function stagePlan(index: number): StagePlan {
  const area = Math.floor(index / PER_AREA);
  const k = index % PER_AREA;
  if (k === PER_AREA - 1) return { index, area, boss: area, density: 0, enemies: [], item: null, time: 240 };
  const rng = createRng(`blast-${index}`);
  const pool = POOLS[area];
  const count = Math.min(9, 3 + Math.floor(k / 2) + area);
  const enemies: EnemyKind[] = [];
  for (let i = 0; i < count; i++) enemies.push(i === 0 && k < 2 ? pool[0] : pool[rng.int(0, pool.length)]);
  return { index, area, boss: null, density: Math.min(0.68, 0.4 + 0.03 * k + 0.025 * area), enemies, item: STAGE_ITEMS[index], time: 200 };
}

export interface Layout {
  grid: Uint8Array;
  /** Hidden power-up per tile (-1 for none), as an index into ITEM_KINDS. */
  hidden: Int8Array;
  exit: number;
  enemies: { kind: EnemyKind; c: number; r: number }[];
}

const manhattan = (c: number, r: number, c2: number, r2: number) => Math.abs(c - c2) + Math.abs(r - r2);

/** The fixed layout of an adventure stage. */
export function buildStage(plan: StagePlan): Layout {
  const rng = createRng(`blast-layout-${plan.index}`);
  const grid = baseGrid();
  const hidden = new Int8Array(COLS * ROWS).fill(-1);
  const safe = (c: number, r: number) => manhattan(c, r, 1, 1) <= 1;
  const floors: [number, number][] = [];
  for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) if (grid[idx(c, r)] === FLOOR && !safe(c, r)) floors.push([c, r]);

  const enemies: Layout['enemies'] = [];
  const far = rng.shuffle(floors.filter(([c, r]) => manhattan(c, r, 1, 1) >= 7));
  for (const kind of plan.enemies) {
    const spot = far.pop();
    if (spot) enemies.push({ kind, c: spot[0], r: spot[1] });
  }
  const taken = new Set(enemies.map((e) => idx(e.c, e.r)));
  for (const [c, r] of floors) if (!taken.has(idx(c, r)) && rng.next() < plan.density) grid[idx(c, r)] = SOFT;

  let exit = -1;
  if (plan.boss === null) {
    const softs = rng.shuffle(floors.filter(([c, r]) => grid[idx(c, r)] === SOFT));
    const exitSpot = softs.find(([c, r]) => manhattan(c, r, 1, 1) >= 6) ?? softs[0];
    if (!exitSpot) {
      // Very sparse stage: make sure the exit has a block to hide under.
      const [c, r] = far[0] ?? [COLS - 2, ROWS - 2];
      grid[idx(c, r)] = SOFT;
      exit = idx(c, r);
    } else exit = idx(exitSpot[0], exitSpot[1]);
    if (plan.item) {
      const spot = softs.find(([c, r]) => idx(c, r) !== exit);
      if (spot) hidden[idx(spot[0], spot[1])] = ITEM_KINDS.indexOf(plan.item);
    }
  }
  return { grid, hidden, exit, enemies };
}

/** Starting corners for battle mode. */
export const CORNERS: [number, number][] = [
  [1, 1],
  [COLS - 2, ROWS - 2],
  [COLS - 2, 1],
  [1, ROWS - 2],
];

const BATTLE_ITEMS: ItemKind[] = ['bomb', 'bomb', 'bomb', 'fire', 'fire', 'fire', 'speed', 'speed', 'kick', 'remote'];

/** A fresh battle arena: dense blocks, many power-ups, the corners kept clear. */
export function buildBattle(random: () => number): Layout {
  const grid = baseGrid();
  const hidden = new Int8Array(COLS * ROWS).fill(-1);
  const clear = (c: number, r: number) => CORNERS.some(([cc, rr]) => manhattan(c, r, cc, rr) <= 1);
  for (let r = 1; r < ROWS - 1; r++) {
    for (let c = 1; c < COLS - 1; c++) {
      if (grid[idx(c, r)] !== FLOOR || clear(c, r)) continue;
      if (random() < 0.78) {
        grid[idx(c, r)] = SOFT;
        if (random() < 0.3) hidden[idx(c, r)] = ITEM_KINDS.indexOf(BATTLE_ITEMS[Math.floor(random() * BATTLE_ITEMS.length)]);
      }
    }
  }
  return { grid, hidden, exit: -1, enemies: [] };
}
