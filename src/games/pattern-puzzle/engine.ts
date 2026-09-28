import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';

/**
 * Pattern Puzzle: a grid of coloured tiles must be made to match a target
 * mosaic. The only move is sliding a whole row left/right or a whole column
 * up/down; tiles that slide off one edge wrap round to the other. Puzzles
 * are scrambled with those same moves, so every one can be solved.
 */
export const LEVELS: Record<DifficultySetting, { n: number; colors: number; scramble: number }> = {
  easy: { n: 3, colors: 3, scramble: 6 },
  normal: { n: 4, colors: 4, scramble: 14 },
  hard: { n: 5, colors: 5, scramble: 30 },
};

export type Grid = number[];
export type Move = { axis: 'row' | 'col'; index: number; by: number };

export function shift(grid: Grid, n: number, move: Move): Grid {
  const next = grid.slice();
  const by = ((move.by % n) + n) % n;
  for (let k = 0; k < n; k++) {
    if (move.axis === 'row') next[move.index * n + ((k + by) % n)] = grid[move.index * n + k];
    else next[((k + by) % n) * n + move.index] = grid[k * n + move.index];
  }
  return next;
}

/** A mirror-symmetric mosaic using every colour at least once. */
export function makeTarget(n: number, colors: number, random: () => number): Grid {
  for (;;) {
    const grid = Array<number>(n * n).fill(0);
    const half = Math.ceil(n / 2);
    for (let r = 0; r < half; r++) {
      for (let c = 0; c < half; c++) {
        const v = Math.floor(random() * colors);
        for (const [rr, cc] of [[r, c], [r, n - 1 - c], [n - 1 - r, c], [n - 1 - r, n - 1 - c]]) grid[rr * n + cc] = v;
      }
    }
    if (new Set(grid).size === colors) return grid;
  }
}

export function matches(a: Grid, b: Grid): boolean {
  return a.every((v, i) => v === b[i]);
}

export function correctCount(a: Grid, target: Grid): number {
  return a.filter((v, i) => v === target[i]).length;
}

export function generate(difficulty: DifficultySetting, seed: string) {
  const { n, colors, scramble } = LEVELS[difficulty];
  const rng = createRng(seed);
  const target = makeTarget(n, colors, rng.next);
  for (;;) {
    let grid = target.slice();
    for (let k = 0; k < scramble; k++) {
      grid = shift(grid, n, {
        axis: rng.bool() ? 'row' : 'col',
        index: rng.int(0, n),
        by: rng.bool() ? 1 : -1,
      });
    }
    // Make sure it starts clearly scrambled.
    if (correctCount(grid, target) <= n * n * 0.7) return { n, target, grid };
  }
}

export function scoreFor(n: number, moves: number, ms: number): number {
  return Math.max(100, Math.round(n * n * 40 - moves * 6 - ms / 1000));
}
