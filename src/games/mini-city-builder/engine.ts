import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';

/**
 * Mini City Builder: a month-by-month zoning sim on a small grid.
 *
 * Buildings only work when they touch a road and sit inside a power plant's
 * range. Shops and factories create jobs; houses fill up while there is work,
 * and grow taller (more residents) when their neighbourhood is pleasant:
 * parks and shops nearby help, factory smoke hurts.
 */
export type Kind =
  'empty' | 'tree' | 'water' | 'road' | 'house' | 'shop' | 'factory' | 'park' | 'power';
export type Tool =
  'road' | 'house' | 'shop' | 'factory' | 'park' | 'power' | 'upgrade' | 'bulldoze';

export interface Tile {
  kind: Kind;
  /** Residents (houses only). */
  pop: number;
  /** Building level 1–3 (houses grow by themselves; shops and factories are upgraded). */
  level: number;
  happy: number;
}

export interface City {
  size: number;
  tiles: Tile[];
  money: number;
  month: number;
  report: Report | null;
  peakPop: number;
  savedAt?: number;
}

export interface Report {
  taxes: number;
  business: number;
  upkeep: number;
  moved: number;
  jobs: number;
  pop: number;
}

export const COST: Record<Tool, number> = {
  road: 10,
  house: 50,
  shop: 90,
  factory: 140,
  park: 40,
  power: 300,
  upgrade: 0,
  bulldoze: 5,
};
export const TREE_CLEAR = 15;
export const UPKEEP: Partial<Record<Kind, number>> = { road: 1, park: 3, power: 20 };
/** Jobs by building level (index 1–3). Shops and factories are upgraded by the player. */
export const JOBS: Partial<Record<Kind, number[]>> = {
  shop: [0, 10, 22, 36],
  factory: [0, 25, 45, 70],
};
export const UPGRADE: Partial<Record<Kind, number[]>> = {
  shop: [0, 250, 600],
  factory: [0, 400, 900],
};
export const CAPACITY = [0, 12, 30, 60];
export const POWER_RANGE = 3;
export const TAX = 2;
/** A small grant from the region every month, so a struggling town can always recover. */
export const GRANT = 30;
export const FAMILY = 2;

export const TUNING: Record<
  DifficultySetting,
  { money: number; goal: number; months: number; growth: number }
> = {
  easy: { money: 1600, goal: 600, months: 48, growth: 6 },
  normal: { money: 1200, goal: 800, months: 48, growth: 5 },
  hard: { money: 900, goal: 900, months: 48, growth: 4 },
};

const blank = (kind: Kind): Tile => ({
  kind,
  pop: 0,
  level: kind === 'house' || kind === 'shop' || kind === 'factory' ? 1 : 0,
  happy: 50,
});

/** A seeded map with a winding river and some woods, leaving the middle mostly open. */
export function newCity(seed: number, difficulty: DifficultySetting, size = 10): City {
  const rng = createRng(seed);
  const tiles = Array.from({ length: size * size }, () => blank('empty'));
  // River down one side.
  let x = rng.next() < 0.5 ? 0 : size - 1;
  for (let y = 0; y < size; y++) {
    tiles[y * size + x].kind = 'water';
    if (rng.next() < 0.3)
      x = Math.max(
        0,
        Math.min(size - 1, x + (x === 0 ? 1 : x === size - 1 ? -1 : rng.next() < 0.5 ? -1 : 1)),
      );
    tiles[y * size + x].kind = 'water';
  }
  for (let i = 0; i < size * size; i++) {
    const cx = (i % size) - size / 2;
    const cy = Math.floor(i / size) - size / 2;
    const edge = Math.hypot(cx, cy) / (size / 2);
    if (tiles[i].kind === 'empty' && rng.next() < 0.25 * edge) tiles[i].kind = 'tree';
  }
  return { size, tiles, money: TUNING[difficulty].money, month: 1, report: null, peakPop: 0 };
}

export const xy = (c: City, i: number) => [i % c.size, Math.floor(i / c.size)] as const;

function around(c: City, i: number, r: number, kind: Kind) {
  const [x, y] = xy(c, i);
  let n = 0;
  for (let dy = -r; dy <= r; dy++)
    for (let dx = -r; dx <= r; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (
        (dx || dy) &&
        nx >= 0 &&
        ny >= 0 &&
        nx < c.size &&
        ny < c.size &&
        c.tiles[ny * c.size + nx].kind === kind
      )
        n++;
    }
  return n;
}

export function hasRoad(c: City, i: number) {
  const [x, y] = xy(c, i);
  return (
    (x > 0 && c.tiles[i - 1].kind === 'road') ||
    (x < c.size - 1 && c.tiles[i + 1].kind === 'road') ||
    (y > 0 && c.tiles[i - c.size].kind === 'road') ||
    (y < c.size - 1 && c.tiles[i + c.size].kind === 'road')
  );
}

export const powered = (c: City, i: number) => around(c, i, POWER_RANGE, 'power') > 0;

const BUILDING: Kind[] = ['house', 'shop', 'factory'];
export function working(c: City, i: number) {
  const t = c.tiles[i];
  return BUILDING.includes(t.kind) && hasRoad(c, i) && powered(c, i);
}

/** Why a building is not working, for the info line. */
export function problem(c: City, i: number): string | null {
  if (!BUILDING.includes(c.tiles[i].kind)) return null;
  if (!hasRoad(c, i)) return 'needs a road next to it';
  if (!powered(c, i)) return 'needs power';
  return null;
}

export function happinessAt(c: City, i: number) {
  let h = 50;
  h += 15 * Math.min(2, around(c, i, 2, 'park'));
  h -= 25 * around(c, i, 2, 'factory');
  if (around(c, i, 3, 'shop') > 0) h += 10;
  if (!powered(c, i)) h -= 20;
  return Math.max(0, Math.min(100, h));
}

export function population(c: City) {
  return c.tiles.reduce((a, t) => a + (t.kind === 'house' ? t.pop : 0), 0);
}

export function jobs(c: City) {
  let j = 0;
  c.tiles.forEach((t, i) => {
    if (working(c, i)) j += JOBS[t.kind]?.[t.level] ?? 0;
  });
  return j;
}

export function costOf(c: City, i: number, tool: Tool): number | null {
  const t = c.tiles[i];
  if (t.kind === 'water') return null;
  if (tool === 'upgrade') return UPGRADE[t.kind]?.[t.level] ?? null;
  if (tool === 'bulldoze')
    return t.kind === 'empty' ? null : t.kind === 'tree' ? TREE_CLEAR : COST.bulldoze;
  if (t.kind === 'empty') return COST[tool];
  if (t.kind === 'tree') return COST[tool] + TREE_CLEAR;
  return null;
}

export function build(c: City, i: number, tool: Tool): boolean {
  const cost = costOf(c, i, tool);
  if (cost === null || c.money < cost) return false;
  c.money -= cost;
  if (tool === 'upgrade') c.tiles[i].level += 1;
  else c.tiles[i] = blank(tool === 'bulldoze' ? 'empty' : tool);
  return true;
}

/** Advances one month: money in and out, then people move in or out. */
export function nextMonth(c: City, difficulty: DifficultySetting): Report {
  const t = TUNING[difficulty];
  const j = jobs(c);
  let pop = population(c);
  const taxes = Math.round(pop * TAX * Math.min(1, (j * FAMILY) / Math.max(1, pop)));
  let business = 0;
  let upkeep = 0;
  c.tiles.forEach((tile, i) => {
    upkeep += UPKEEP[tile.kind] ?? 0;
    if (!working(c, i)) return;
    // Shops need customers nearby; factories just need to run.
    if (tile.kind === 'shop')
      business += Math.min(15 * tile.level, 5 * tile.level + Math.floor(pop / 40));
    if (tile.kind === 'factory') business += 15 * tile.level;
  });
  c.money += GRANT + taxes + business - upkeep;

  // People follow jobs: each job supports about two residents (workers and their families).
  let demand = j * FAMILY + 20 - pop;
  let moved = 0;
  c.tiles.forEach((tile, i) => {
    if (tile.kind !== 'house') return;
    tile.happy = happinessAt(c, i);
    const ok = working(c, i);
    if (
      ok &&
      tile.pop >= CAPACITY[tile.level] &&
      tile.level < 3 &&
      tile.happy >= 55 + tile.level * 5
    ) {
      tile.level += 1;
    } else if (tile.level > 1 && tile.happy < 30) {
      tile.level -= 1;
    }
    const cap = ok ? CAPACITY[tile.level] : 0;
    if (tile.pop > cap) {
      const out = Math.min(tile.pop - cap, 6);
      tile.pop -= out;
      moved -= out;
    } else if (demand > 0 && tile.happy >= 25) {
      const add = Math.min(cap - tile.pop, t.growth + Math.floor(tile.level * 1.5), demand);
      tile.pop += add;
      demand -= add;
      moved += add;
    }
  });
  if (demand < -20) {
    // Too few jobs: some families leave.
    let leave = Math.ceil((-demand - 20) / 4);
    for (const tile of c.tiles) {
      if (leave <= 0) break;
      if (tile.kind === 'house' && tile.pop > 0) {
        const out = Math.min(tile.pop, 3, leave);
        tile.pop -= out;
        leave -= out;
        moved -= out;
      }
    }
  }
  pop = population(c);
  c.peakPop = Math.max(c.peakPop, pop);
  c.month += 1;
  c.report = { taxes: taxes + GRANT, business, upkeep, moved, jobs: j, pop };
  return c.report;
}

export function finalScore(c: City, difficulty: DifficultySetting) {
  const t = TUNING[difficulty];
  return (
    population(c) + Math.max(0, t.months + 1 - c.month) * 25 + Math.floor(Math.max(0, c.money) / 10)
  );
}

const KINDS: Kind[] = [
  'empty',
  'tree',
  'water',
  'road',
  'house',
  'shop',
  'factory',
  'park',
  'power',
];

export function validCity(v: unknown): v is City {
  if (!v || typeof v !== 'object') return false;
  const c = v as City;
  return (
    Number.isInteger(c.size) &&
    c.size >= 6 &&
    c.size <= 14 &&
    Array.isArray(c.tiles) &&
    c.tiles.length === c.size * c.size &&
    c.tiles.every(
      (t) =>
        t &&
        KINDS.includes(t.kind) &&
        Number.isFinite(t.pop) &&
        t.pop >= 0 &&
        Number.isInteger(t.level) &&
        t.level >= 0 &&
        t.level <= 3 &&
        Number.isFinite(t.happy),
    ) &&
    Number.isFinite(c.money) &&
    Number.isInteger(c.month) &&
    c.month >= 1 &&
    Number.isFinite(c.peakPop)
  );
}
