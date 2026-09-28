import type { Direction } from '@/game-engine/InputManager';
import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';

/**
 * Parking Puzzle: clear the lot. Every car faces one way and can only
 * drive forwards. If nothing is in its way it drives out of the lot;
 * otherwise it bumps the car or bollard in front and gets a dent.
 *
 * Levels come from a fixed seed per level, so "Normal level 7" is always
 * the same layout, and each one is checked to be clearable.
 */
export interface Car {
  /** Cells from rear to front. */
  cells: number[];
  dir: Direction;
  color: number;
}

export interface Lot {
  w: number;
  h: number;
  cars: Car[];
  bollards: number[];
}

export const LEVELS_PER_PACK = 20;

export const PACKS: Record<DifficultySetting, { w: number; h: number; cars: [number, number]; bollards: number; depth: [number, number] }> = {
  easy: { w: 5, h: 5, cars: [5, 9], bollards: 0, depth: [2, 4] },
  normal: { w: 6, h: 6, cars: [8, 13], bollards: 1, depth: [3, 6] },
  hard: { w: 7, h: 7, cars: [11, 17], bollards: 3, depth: [4, 8] },
};

const DELTA: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
};

/** Cells between a car's front and the edge of the lot, nearest first. */
export function exitPath(lot: Lot, car: Car): number[] {
  const front = car.cells[car.cells.length - 1];
  const [dx, dy] = DELTA[car.dir];
  const out: number[] = [];
  let x = (front % lot.w) + dx;
  let y = Math.floor(front / lot.w) + dy;
  while (x >= 0 && y >= 0 && x < lot.w && y < lot.h) {
    out.push(y * lot.w + x);
    x += dx;
    y += dy;
  }
  return out;
}

/** What stops car k: -1 if its way out is clear, else the blocking cell. */
export function blocker(lot: Lot, remaining: Set<number>, k: number): number {
  const occupied = new Set(lot.bollards);
  lot.cars.forEach((c, j) => {
    if (remaining.has(j) && j !== k) c.cells.forEach((cell) => occupied.add(cell));
  });
  return exitPath(lot, lot.cars[k]).find((c) => occupied.has(c)) ?? -1;
}

/**
 * Removes every free car in rounds. Returns the number of rounds needed to
 * empty the lot, or -1 if some cars can never leave.
 */
export function clearDepth(lot: Lot): number {
  const remaining = new Set(lot.cars.map((_, k) => k));
  let rounds = 0;
  while (remaining.size) {
    const free = [...remaining].filter((k) => blocker(lot, remaining, k) < 0);
    if (!free.length) return -1;
    free.forEach((k) => remaining.delete(k));
    rounds++;
  }
  return rounds;
}

function tryPlace(w: number, h: number, count: number, bollardCount: number, random: () => number): Lot {
  const taken = new Set<number>();
  const bollards: number[] = [];
  while (bollards.length < bollardCount) {
    // Bollards stay off the outer ring so they do not wall in a whole edge.
    const x = 1 + Math.floor(random() * (w - 2));
    const y = 1 + Math.floor(random() * (h - 2));
    const c = y * w + x;
    if (!taken.has(c)) {
      taken.add(c);
      bollards.push(c);
    }
  }
  const cars: Car[] = [];
  const dirs: Direction[] = ['up', 'down', 'left', 'right'];
  let attempts = 0;
  while (cars.length < count && attempts++ < 500) {
    const dir = dirs[Math.floor(random() * 4)];
    const len = random() < 0.2 ? 3 : 2;
    const horizontal = dir === 'left' || dir === 'right';
    const x = Math.floor(random() * (horizontal ? w - len + 1 : w));
    const y = Math.floor(random() * (horizontal ? h : h - len + 1));
    let cells = Array.from({ length: len }, (_, i) => (horizontal ? y * w + x + i : (y + i) * w + x));
    if (dir === 'left' || dir === 'up') cells = cells.reverse();
    if (cells.some((c) => taken.has(c))) continue;
    cells.forEach((c) => taken.add(c));
    cars.push({ cells, dir, color: Math.floor(random() * 8) });
  }
  return { w, h, cars, bollards };
}

export function generateLevel(pack: DifficultySetting, index: number): Lot {
  const spec = PACKS[pack];
  const rng = createRng(`parking-${pack}-${index}`);
  const t = index / (LEVELS_PER_PACK - 1);
  const count = Math.round(spec.cars[0] + (spec.cars[1] - spec.cars[0]) * t);
  const minDepth = Math.round(spec.depth[0] + (spec.depth[1] - spec.depth[0]) * t);
  let best: Lot | null = null;
  let bestDepth = -1;
  for (let attempt = 0; attempt < 400; attempt++) {
    const lot = tryPlace(spec.w, spec.h, count, spec.bollards, rng.next);
    if (lot.cars.length < count) continue;
    const depth = clearDepth(lot);
    if (depth < 0) continue;
    if (depth >= minDepth) return lot;
    if (depth > bestDepth) {
      best = lot;
      bestDepth = depth;
    }
  }
  return best ?? tryPlace(spec.w, spec.h, 2, 0, rng.next);
}

export function scoreFor(cars: number, dents: number, ms: number): number {
  return Math.max(50, Math.round(cars * 60 - dents * 45 - Math.max(0, ms / 1000 - cars * 3) * 2));
}

export function stars(dents: number): number {
  return dents === 0 ? 3 : dents <= 2 ? 2 : 1;
}
