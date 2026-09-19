/** Sea Battle rules on a 10×10 grid with a five-ship fleet. */
export const N = 10;
export const FLEET: { name: string; size: number }[] = [
  { name: 'Flagship', size: 5 },
  { name: 'Cruiser', size: 4 },
  { name: 'Frigate', size: 3 },
  { name: 'Submarine', size: 3 },
  { name: 'Patrol boat', size: 2 },
];

export interface Ship {
  name: string;
  cells: number[];
}
export type Mark = 'miss' | 'hit' | 'sunk';
export type Shots = Record<number, Mark>;

export function placement(start: number, size: number, vertical: boolean): number[] | null {
  const r = Math.floor(start / N);
  const c = start % N;
  if (vertical ? r + size > N : c + size > N) return null;
  return Array.from({ length: size }, (_, k) => (vertical ? start + k * N : start + k));
}

export function randomFleet(rand: () => number = Math.random): Ship[] {
  for (;;) {
    const used = new Set<number>();
    const ships: Ship[] = [];
    let ok = true;
    for (const { name, size } of FLEET) {
      let placed = false;
      for (let tries = 0; tries < 200 && !placed; tries++) {
        const cells = placement(Math.floor(rand() * N * N), size, rand() < 0.5);
        if (!cells || cells.some((i) => used.has(i))) continue;
        cells.forEach((i) => used.add(i));
        ships.push({ name, cells });
        placed = true;
      }
      if (!placed) {
        ok = false;
        break;
      }
    }
    if (ok) return ships;
  }
}

export interface ShotResult {
  shots: Shots;
  mark: Mark;
  sunk: Ship | null;
  allSunk: boolean;
}

/** Fires at `i`. When a ship's last cell is hit, every cell of it becomes 'sunk'. */
export function fire(ships: Ship[], shots: Shots, i: number): ShotResult {
  const next: Shots = { ...shots };
  const ship = ships.find((s) => s.cells.includes(i));
  if (!ship) {
    next[i] = 'miss';
    return { shots: next, mark: 'miss', sunk: null, allSunk: false };
  }
  next[i] = 'hit';
  const sunk = ship.cells.every((c) => next[c]);
  if (sunk) ship.cells.forEach((c) => (next[c] = 'sunk'));
  const allSunk = ships.every((s) => s.cells.every((c) => next[c]));
  return { shots: next, mark: sunk ? 'sunk' : 'hit', sunk: sunk ? ship : null, allSunk };
}

const neighbours = (i: number) => {
  const r = Math.floor(i / N);
  const c = i % N;
  const out: number[] = [];
  if (r > 0) out.push(i - N);
  if (r < N - 1) out.push(i + N);
  if (c > 0) out.push(i - 1);
  if (c < N - 1) out.push(i + 1);
  return out;
};

/**
 * Probability map: for every remaining ship size, count the placements that
 * fit around known misses and sunk ships. Placements covering unresolved hits
 * are weighted heavily so the computer finishes off damaged ships.
 */
export function heatMap(shots: Shots, remaining: number[]): number[] {
  const heat = new Array<number>(N * N).fill(0);
  for (const size of remaining) {
    for (let start = 0; start < N * N; start++) {
      for (const vertical of [false, true]) {
        const cells = placement(start, size, vertical);
        if (!cells || cells.some((c) => shots[c] === 'miss' || shots[c] === 'sunk')) continue;
        const hits = cells.filter((c) => shots[c] === 'hit').length;
        const weight = 1 + hits * 30;
        for (const c of cells) if (!shots[c]) heat[c] += weight;
      }
    }
  }
  return heat;
}

export type Level = 'easy' | 'normal' | 'hard';

export function chooseShot(shots: Shots, remaining: number[], level: Level, rand: () => number = Math.random): number {
  const open: number[] = [];
  for (let i = 0; i < N * N; i++) if (!shots[i]) open.push(i);
  const hits = Object.keys(shots)
    .map(Number)
    .filter((i) => shots[i] === 'hit');

  if (level === 'hard') {
    const heat = heatMap(shots, remaining);
    let best = open[0];
    for (const i of open) if (heat[i] > heat[best] || (heat[i] === heat[best] && rand() < 0.3)) best = i;
    return best;
  }

  // Hunt-and-target: follow up hits, otherwise search (on a checkerboard for Normal).
  const chaseChance = level === 'easy' ? 0.5 : 1;
  if (hits.length && rand() < chaseChance) {
    const around = [...new Set(hits.flatMap(neighbours))].filter((i) => !shots[i]);
    if (level === 'normal' && hits.length >= 2) {
      // Prefer cells that extend a line of hits.
      const inLine = around.filter((i) => hits.some((h) => neighbours(i).includes(h) && hits.some((h2) => h2 !== h && (h2 - h === h - i || h - h2 === i - h))));
      if (inLine.length) return inLine[Math.floor(rand() * inLine.length)];
    }
    if (around.length) return around[Math.floor(rand() * around.length)];
  }
  const pool = level === 'normal' ? open.filter((i) => (Math.floor(i / N) + (i % N)) % 2 === 0) : open;
  const from = pool.length ? pool : open;
  return from[Math.floor(rand() * from.length)];
}

/** Sizes of ships not yet sunk. */
export function remainingSizes(ships: Ship[], shots: Shots): number[] {
  return ships.filter((s) => !s.cells.every((c) => shots[c] === 'sunk')).map((s) => s.cells.length);
}
