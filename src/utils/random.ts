/**
 * Deterministic seeded PRNG utilities.
 * Uses mulberry32 seeded via a 32-bit string hash so the same seed always
 * produces the same sequence (daily challenges, procedural levels, puzzles).
 */

export function hashString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface Rng {
  next(): number;
  int(minInclusive: number, maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  bool(probability?: number): boolean;
  shuffle<T>(items: T[]): T[];
  range(min: number, max: number): number;
}

export function createRng(seed: number | string): Rng {
  let a = (typeof seed === 'string' ? hashString(seed) : seed >>> 0) || 1;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (min, max) => Math.floor(next() * (max - min)) + min,
    pick: (items) => items[Math.floor(next() * items.length)],
    bool: (probability = 0.5) => next() < probability,
    range: (min, max) => next() * (max - min) + min,
    shuffle: (items) => shuffleWith(items, next),
  };
  return rng;
}

/** In-place Fisher-Yates shuffle using the supplied random source. */
export function shuffleWith<T>(items: T[], rand: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

export function shuffle<T>(items: T[]): T[] {
  return shuffleWith(items.slice(), Math.random);
}

export function randomInt(minInclusive: number, maxExclusive: number): number {
  return Math.floor(Math.random() * (maxExclusive - minInclusive)) + minInclusive;
}

export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** YYYY-MM-DD in the user's local timezone — the daily challenge seed. */
export function todayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
