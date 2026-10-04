import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';
import { isRecord } from '../_shared/puzzle/useSavedGame';

/**
 * Farm Simulator: a turn-based farm. Every day you have a limited amount of
 * energy for planting, watering and harvesting; crops grow overnight only if
 * they were watered (or it rained). Three ten-day seasons change which crops
 * will grow, and market prices shift daily.
 */
export type Season = 'spring' | 'summer' | 'autumn';
export const SEASONS: Season[] = ['spring', 'summer', 'autumn'];
export const DAYS_PER_SEASON = 10;
export const LAST_DAY = DAYS_PER_SEASON * SEASONS.length;

export interface Crop {
  id: string;
  name: string;
  icon: string;
  seed: number;
  sell: number;
  days: number;
  seasons: Season[];
  /** Days to regrow after a harvest (perennials), if any. */
  regrow?: number;
}

export const CROPS: Crop[] = [
  {
    id: 'radish',
    name: 'Radish',
    icon: '🫛',
    seed: 4,
    sell: 12,
    days: 2,
    seasons: ['spring', 'summer'],
  },
  {
    id: 'carrot',
    name: 'Carrot',
    icon: '🥕',
    seed: 8,
    sell: 25,
    days: 3,
    seasons: ['spring', 'autumn'],
  },
  { id: 'lettuce', name: 'Lettuce', icon: '🥬', seed: 10, sell: 30, days: 3, seasons: ['spring'] },
  {
    id: 'strawberry',
    name: 'Strawberry',
    icon: '🍓',
    seed: 30,
    sell: 22,
    days: 4,
    seasons: ['spring', 'summer'],
    regrow: 2,
  },
  { id: 'tomato', name: 'Tomato', icon: '🍅', seed: 18, sell: 55, days: 4, seasons: ['summer'] },
  {
    id: 'corn',
    name: 'Corn',
    icon: '🌽',
    seed: 25,
    sell: 80,
    days: 5,
    seasons: ['summer', 'autumn'],
  },
  { id: 'pumpkin', name: 'Pumpkin', icon: '🎃', seed: 40, sell: 150, days: 6, seasons: ['autumn'] },
  {
    id: 'grape',
    name: 'Grapes',
    icon: '🍇',
    seed: 50,
    sell: 45,
    days: 5,
    seasons: ['autumn'],
    regrow: 2,
  },
];

export interface Plot {
  crop: string | null;
  age: number;
  watered: boolean;
  dry: number;
  dead: boolean;
  /** For regrowing crops: harvested at least once. */
  harvested: boolean;
  sprinkler: boolean;
}

export interface Tuning {
  energy: number;
  goal: number;
  rain: number;
}

export const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { energy: 40, goal: 3000, rain: 0.3 },
  normal: { energy: 32, goal: 2800, rain: 0.22 },
  hard: { energy: 28, goal: 2500, rain: 0.15 },
};

export const SPRINKLER_COST = 150;
export const EXPAND_COST = (cols: number) => 120 * cols;

export interface Farm {
  v: 1;
  seed: number;
  day: number;
  coins: number;
  energy: number;
  cols: number;
  rows: number;
  plots: Plot[];
  raining: boolean;
  prices: Record<string, number>;
  harvested: number;
  earned: number;
  best: string[];
  savedAt: number;
}

const emptyPlot = (): Plot => ({
  crop: null,
  age: 0,
  watered: false,
  dry: 0,
  dead: false,
  harvested: false,
  sprinkler: false,
});

export const seasonOf = (day: number): Season =>
  SEASONS[Math.min(SEASONS.length - 1, Math.floor((day - 1) / DAYS_PER_SEASON))];

function rollDay(f: Farm, t: Tuning) {
  const r = createRng(`${f.seed}-${f.day}`);
  f.raining = r.next() < t.rain * (seasonOf(f.day) === 'summer' ? 0.6 : 1.2);
  f.prices = Object.fromEntries(
    CROPS.map((c) => [c.id, Math.round(c.sell * (0.85 + r.next() * 0.3))]),
  );
}

export function newFarm(seed: number, t: Tuning): Farm {
  const f: Farm = {
    v: 1,
    seed,
    day: 1,
    coins: 100,
    energy: t.energy,
    cols: 5,
    rows: 4,
    plots: Array.from({ length: 20 }, emptyPlot),
    raining: false,
    prices: {},
    harvested: 0,
    earned: 0,
    best: [],
    savedAt: Date.now(),
  };
  rollDay(f, t);
  return f;
}

export const cropOf = (id: string | null) => CROPS.find((c) => c.id === id) ?? null;

export function ripe(p: Plot): boolean {
  const c = cropOf(p.crop);
  if (!c || p.dead) return false;
  return p.age >= (p.harvested && c.regrow ? c.regrow : c.days);
}

export type Action = 'plant' | 'water' | 'harvest' | 'clear' | null;

/** What tapping this plot would do. */
export function actionFor(p: Plot): Action {
  if (p.sprinkler) return null;
  if (p.dead) return 'clear';
  if (!p.crop) return 'plant';
  if (ripe(p)) return 'harvest';
  if (!p.watered) return 'water';
  return null;
}

/** Water from sprinklers: the eight plots around each one. */
export function sprinklerCover(f: Farm): Set<number> {
  const out = new Set<number>();
  f.plots.forEach((p, i) => {
    if (!p.sprinkler) return;
    const c = i % f.cols;
    const r = Math.floor(i / f.cols);
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const cc = c + dc;
        const rr = r + dr;
        if (cc >= 0 && rr >= 0 && cc < f.cols && rr < f.rows) out.add(rr * f.cols + cc);
      }
  });
  return out;
}

export function act(f: Farm, i: number, seedId: string): Action {
  const p = f.plots[i];
  const a = actionFor(p);
  if (!a || f.energy <= 0) return null;
  if (a === 'plant') {
    const c = cropOf(seedId);
    if (!c || f.coins < c.seed || !c.seasons.includes(seasonOf(f.day))) return null;
    f.coins -= c.seed;
    Object.assign(p, emptyPlot(), { crop: c.id, watered: f.raining || sprinklerCover(f).has(i) });
  } else if (a === 'water') p.watered = true;
  else if (a === 'harvest') {
    const c = cropOf(p.crop)!;
    const price = f.prices[c.id] ?? c.sell;
    f.coins += price;
    f.earned += price;
    f.harvested += 1;
    if (!f.best.includes(c.id)) f.best.push(c.id);
    if (c.regrow) {
      p.harvested = true;
      p.age = 0;
    } else Object.assign(p, emptyPlot());
  } else if (a === 'clear') Object.assign(p, emptyPlot());
  f.energy -= 1;
  return a;
}

/** Foraging the hedgerows: a little income for energy when you have nothing else to do. */
export const FORAGE_PAY = 2;

export function forage(f: Farm, energy: number): number {
  const used = Math.min(energy, f.energy);
  f.energy -= used;
  f.coins += used * FORAGE_PAY;
  return used * FORAGE_PAY;
}

/** Can a crop planted today survive every night until it is ready? */
export function canFinish(c: Crop, day: number): boolean {
  if (!c.seasons.includes(seasonOf(day))) return false;
  for (let d = day + 1; d <= day + c.days; d++)
    if (d > LAST_DAY || !c.seasons.includes(seasonOf(d))) return false;
  return true;
}

export function placeSprinkler(f: Farm, i: number): boolean {
  const p = f.plots[i];
  if (f.coins < SPRINKLER_COST || p.crop || p.sprinkler) return false;
  f.coins -= SPRINKLER_COST;
  p.sprinkler = true;
  return true;
}

export function expand(f: Farm): boolean {
  const cost = EXPAND_COST(f.cols);
  if (f.cols >= 8 || f.coins < cost) return false;
  f.coins -= cost;
  const plots: Plot[] = [];
  for (let r = 0; r < f.rows; r++) {
    for (let c = 0; c < f.cols; c++) plots.push(f.plots[r * f.cols + c]);
    plots.push(emptyPlot());
  }
  f.cols += 1;
  f.plots = plots;
  return true;
}

/** Ends the day: crops that had water grow; dry ones may wither; out-of-season crops die. */
export function sleep(f: Farm, t: Tuning) {
  const cover = sprinklerCover(f);
  const nextSeason = seasonOf(f.day + 1);
  f.plots.forEach((p, i) => {
    const c = cropOf(p.crop);
    if (!c || p.dead) return;
    const wet = p.watered || f.raining || cover.has(i);
    if (wet) {
      p.age += 1;
      p.dry = 0;
    } else {
      p.dry += 1;
      if (p.dry >= 2) p.dead = true;
    }
    if (!c.seasons.includes(nextSeason)) p.dead = true;
    p.watered = false;
  });
  f.day += 1;
  f.energy = t.energy;
  rollDay(f, t);
  // Sprinklers and rain water the morning's crops straight away.
  f.plots.forEach((p, i) => {
    if (p.crop && !p.dead && (f.raining || cover.has(i))) p.watered = true;
  });
}

export function validFarm(v: unknown): v is Farm {
  if (!isRecord(v) || v.v !== 1) return false;
  for (const k of [
    'seed',
    'day',
    'coins',
    'energy',
    'cols',
    'rows',
    'harvested',
    'earned',
    'savedAt',
  ])
    if (typeof v[k] !== 'number' || !Number.isFinite(v[k] as number)) return false;
  if (!Array.isArray(v.plots) || v.plots.length !== (v.cols as number) * (v.rows as number))
    return false;
  if (
    !v.plots.every(
      (p) =>
        isRecord(p) &&
        (p.crop === null || CROPS.some((c) => c.id === p.crop)) &&
        typeof p.age === 'number',
    )
  )
    return false;
  return isRecord(v.prices) && Array.isArray(v.best) && typeof v.raining === 'boolean';
}
