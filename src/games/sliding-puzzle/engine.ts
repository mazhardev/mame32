import type { Direction } from '@/game-engine/InputManager';
import type { DifficultySetting } from '@/types';

/**
 * The n×n sliding-tile puzzle. `tiles[i]` is the number on square i, with 0
 * as the blank. Solved means 1..n²-1 in reading order with the blank last.
 */
export type Tiles = number[];

export const SIZES: Record<DifficultySetting, number> = { easy: 3, normal: 4, hard: 5 };

export function solvedTiles(n: number): Tiles {
  return Array.from({ length: n * n }, (_, i) => (i === n * n - 1 ? 0 : i + 1));
}

export function isSolved(tiles: Tiles): boolean {
  const last = tiles.length - 1;
  return tiles[last] === 0 && tiles.every((t, i) => i === last || t === i + 1);
}

/**
 * Classic parity test. Odd widths: solvable iff the inversion count is even.
 * Even widths: add the blank's row counted from the bottom (1-based); the sum
 * must be odd.
 */
export function isSolvable(tiles: Tiles, n: number): boolean {
  const nums = tiles.filter((t) => t !== 0);
  let inversions = 0;
  for (let i = 0; i < nums.length; i++)
    for (let j = i + 1; j < nums.length; j++) if (nums[i] > nums[j]) inversions++;
  if (n % 2 === 1) return inversions % 2 === 0;
  const blankRowFromBottom = n - Math.floor(tiles.indexOf(0) / n);
  return (inversions + blankRowFromBottom) % 2 === 1;
}

/**
 * Clicking a tile in the blank's row or column slides every tile between
 * them one step towards the blank, like a physical puzzle.
 */
export function slideFrom(tiles: Tiles, n: number, index: number): Tiles | null {
  const blank = tiles.indexOf(0);
  if (index === blank || index < 0 || index >= tiles.length) return null;
  const [br, bc] = [Math.floor(blank / n), blank % n];
  const [r, c] = [Math.floor(index / n), index % n];
  if (br !== r && bc !== c) return null;
  const step = br === r ? (c > bc ? 1 : -1) : c === bc && r > br ? n : -n;
  const next = tiles.slice();
  for (let at = blank; at !== index; at += step) next[at] = next[at + step];
  next[index] = 0;
  return next;
}

/** Arrow keys move the tile next to the blank *in* that direction. */
export function slideDirection(tiles: Tiles, n: number, dir: Direction): Tiles | null {
  const blank = tiles.indexOf(0);
  const [r, c] = [Math.floor(blank / n), blank % n];
  // Pressing "left" moves the tile to the right of the blank leftwards.
  const from =
    dir === 'left'
      ? c < n - 1
        ? blank + 1
        : -1
      : dir === 'right'
        ? c > 0
          ? blank - 1
          : -1
        : dir === 'up'
          ? r < n - 1
            ? blank + n
            : -1
          : r > 0
            ? blank - n
            : -1;
  return from < 0 ? null : slideFrom(tiles, n, from);
}

/**
 * Shuffles by a long random walk of legal moves, so the result is always
 * solvable. Immediate back-steps are skipped to mix faster.
 */
export function shuffleTiles(n: number, random: () => number = Math.random): Tiles {
  let tiles = solvedTiles(n);
  let prev = -1;
  const steps = n * n * 30;
  for (let i = 0; i < steps; i++) {
    const blank = tiles.indexOf(0);
    const [r, c] = [Math.floor(blank / n), blank % n];
    const options = [
      r > 0 ? blank - n : -1,
      r < n - 1 ? blank + n : -1,
      c > 0 ? blank - 1 : -1,
      c < n - 1 ? blank + 1 : -1,
    ].filter((o) => o >= 0 && o !== prev);
    const pick = options[Math.floor(random() * options.length)];
    tiles = slideFrom(tiles, n, pick)!;
    prev = blank;
  }
  // Rare, but a walk can wander back home.
  return isSolved(tiles) ? shuffleTiles(n, random) : tiles;
}

/** Sum of each tile's distance from home; a lower bound on moves left. */
export function manhattan(tiles: Tiles, n: number): number {
  let sum = 0;
  tiles.forEach((t, i) => {
    if (t === 0) return;
    const home = t - 1;
    sum += Math.abs(Math.floor(home / n) - Math.floor(i / n)) + Math.abs((home % n) - (i % n));
  });
  return sum;
}

/** Share of tiles already on their home square, for the progress label. */
export function percentPlaced(tiles: Tiles): number {
  const placed = tiles.filter((t, i) => t !== 0 && t === i + 1).length;
  return Math.round((placed / (tiles.length - 1)) * 100);
}

export const BASE_SCORE: Record<number, number> = { 3: 1000, 4: 2500, 5: 5000 };

/** Fewer moves and less time score higher; a solve is always worth at least 100. */
export function scoreFor(n: number, moves: number, ms: number): number {
  const base = BASE_SCORE[n] ?? 1000;
  return Math.max(100, Math.round(base - moves * 3 - ms / 1000));
}

export function validSave(v: unknown): v is { n: number; tiles: Tiles; moves: number; ms: number } {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  const n = s.n;
  if (n !== 3 && n !== 4 && n !== 5) return false;
  if (!Array.isArray(s.tiles) || s.tiles.length !== n * n) return false;
  const seen = new Set(s.tiles);
  if (seen.size !== n * n || ![...seen].every((t) => Number.isInteger(t) && t >= 0 && t < n * n))
    return false;
  if (!isSolvable(s.tiles as Tiles, n)) return false;
  return Number.isInteger(s.moves) && (s.moves as number) >= 0 && typeof s.ms === 'number' && s.ms >= 0;
}
