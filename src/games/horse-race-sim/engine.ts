import type { DifficultySetting } from '@/types';

/**
 * Horse racing simulation with virtual points. Each runner has hidden speed,
 * stamina and finishing kick; recent form is generated from those ratings,
 * and the odds come from simulating the race many times. Nothing here
 * involves real money.
 */
export const DISTANCE = 1200;
export const RACES = 8;
export const START_POINTS = 100;
export const FIELD = 6;

const FIRST = [
  'Copper',
  'Velvet',
  'Northern',
  'Silver',
  'Midnight',
  'Lucky',
  'Morning',
  'River',
  'Scarlet',
  'Thunder',
  'Golden',
  'Quiet',
  'Desert',
  'Hidden',
  'Rapid',
  'Willow',
];
const SECOND = [
  'Comet',
  'Lantern',
  'Breeze',
  'Arrow',
  'Meadow',
  'Echo',
  'Ember',
  'Harbour',
  'Clover',
  'Summit',
  'Ripple',
  'Falcon',
  'Mirage',
  'Pebble',
  'Thistle',
  'Sparrow',
];
export const SILKS = [
  '#dc2626',
  '#2563eb',
  '#16a34a',
  '#f59e0b',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#4b5563',
];

export interface Runner {
  name: string;
  silk: string;
  speed: number;
  stamina: number;
  kick: number;
  form: number[];
  odds: number;
}

export interface Tuning {
  /** Per-step randomness in the race. */
  noise: number;
  /** Day-to-day swing in a horse's performance. */
  day: number;
  /** Bookmaker's margin. */
  margin: number;
}

export const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { noise: 0.03, day: 0.008, margin: 1.05 },
  normal: { noise: 0.05, day: 0.016, margin: 1.12 },
  hard: { noise: 0.07, day: 0.026, margin: 1.2 },
};

export interface Race {
  runners: Runner[];
}

/** One race run: finishing order (runner indices) and positions over time. */
export interface RaceRun {
  order: number[];
  frames: number[][];
}

export function simulate(race: Race, t: Tuning, random: () => number, record = false): RaceRun {
  const n = race.runners.length;
  const pos = new Array(n).fill(0);
  const day = race.runners.map(() => 1 + (random() - 0.5) * 2 * t.day * 3);
  const finished: number[] = [];
  const frames: number[][] = [];
  for (let step = 0; step < 4000 && finished.length < n; step++) {
    for (let i = 0; i < n; i++) {
      if (finished.includes(i)) continue;
      const r = race.runners[i];
      const progress = pos[i] / DISTANCE;
      // Tiring: weaker stayers fade over the last third; the kick comes in the final 15%.
      const fade = progress > 0.65 ? 1 - (progress - 0.65) * (1 - r.stamina) * 0.6 : 1;
      const kick = progress > 0.85 ? 1 + r.kick * 0.06 : 1;
      const v = r.speed * fade * kick * day[i] * (1 + (random() - 0.5) * 2 * t.noise);
      pos[i] = Math.min(DISTANCE, pos[i] + v * 0.1);
      if (pos[i] >= DISTANCE) finished.push(i);
    }
    if (record) frames.push([...pos]);
  }
  return { order: finished, frames };
}

/** Estimated win chances from repeated simulations. */
export function winChances(race: Race, t: Tuning, random: () => number, runs = 400): number[] {
  const wins = new Array(race.runners.length).fill(0);
  for (let k = 0; k < runs; k++) wins[simulate(race, t, random).order[0]] += 1;
  return wins.map((w) => (w + 0.5) / (runs + race.runners.length * 0.5));
}

export function makeRace(t: Tuning, random: () => number): Race {
  const names = new Set<string>();
  const runners: Runner[] = [];
  const silks = [...SILKS].sort(() => random() - 0.5);
  while (runners.length < FIELD) {
    const name = `${FIRST[Math.floor(random() * FIRST.length)]} ${SECOND[Math.floor(random() * SECOND.length)]}`;
    if (names.has(name)) continue;
    names.add(name);
    runners.push({
      name,
      silk: silks[runners.length],
      speed: 16 + random() * 1.2,
      stamina: 0.3 + random() * 0.7,
      kick: random(),
      form: [],
      odds: 0,
    });
  }
  const race = { runners };
  // Recent form: three earlier races against similar fields.
  for (let k = 0; k < 3; k++) {
    const order = simulate(race, { ...t, noise: t.noise * 1.4 }, random).order;
    order.forEach((idx, place) => race.runners[idx].form.push(place + 1));
  }
  const chances = winChances(race, t, random);
  race.runners.forEach((r, i) => {
    r.odds = Math.max(1.2, Math.round((1 / (chances[i] * t.margin)) * 10) / 10);
  });
  return race;
}

export type BetKind = 'win' | 'place';

/** Points returned for a bet (0 if it lost). Place pays for a top-three finish. */
export function payout(kind: BetKind, odds: number, stake: number, finish: number): number {
  if (kind === 'win') return finish === 1 ? Math.round(stake * odds) : 0;
  return finish <= 3 ? Math.round(stake * (1 + (odds - 1) / 4)) : 0;
}
