import type { DifficultySetting } from '@/types';
import { areAdjacent, hamiltonianPath } from '../_shared/puzzle/hamilton';

/**
 * Connect the Dots: draw one continuous line through every square of the
 * grid, visiting the numbered dots in order and finishing on the last one.
 * Walls between some squares may not be crossed.
 */
export const LEVELS: Record<DifficultySetting, { n: number; dots: number; walls: number }> = {
  easy: { n: 5, dots: 7, walls: 0 },
  normal: { n: 6, dots: 8, walls: 4 },
  hard: { n: 7, dots: 9, walls: 8 },
};

export interface Puzzle {
  n: number;
  /** Dot number (1-based) at each cell, 0 where there is none. */
  dots: number[];
  /** Blocked edges as `min-max` cell pairs. */
  walls: string[];
  total: number;
}

export const edge = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export function generate(level: { n: number; dots: number; walls: number }, random: () => number): Puzzle {
  const { n } = level;
  const path = hamiltonianPath(n, n, random);
  const dots = Array<number>(n * n).fill(0);
  const last = path.length - 1;
  const indices = new Set([0, last]);
  // Spread the middle dots out, jittered so they do not look regular.
  for (let k = 1; k < level.dots - 1; k++) {
    const base = (k / (level.dots - 1)) * last;
    const jitter = Math.round((random() - 0.5) * (last / level.dots) * 0.8);
    let idx = Math.max(1, Math.min(last - 1, Math.round(base) + jitter));
    while (indices.has(idx) && idx < last - 1) idx++;
    indices.add(idx);
  }
  [...indices].sort((a, b) => a - b).forEach((idx, k) => (dots[path[idx]] = k + 1));

  // Walls only on edges the solution never uses, so it stays solvable.
  const used = new Set<string>();
  for (let i = 1; i < path.length; i++) used.add(edge(path[i - 1], path[i]));
  const candidates: string[] = [];
  for (let c = 0; c < n * n; c++) {
    if (c % n < n - 1 && !used.has(edge(c, c + 1))) candidates.push(edge(c, c + 1));
    if (c + n < n * n && !used.has(edge(c, c + n))) candidates.push(edge(c, c + n));
  }
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  return { n, dots, walls: candidates.slice(0, level.walls), total: indices.size };
}

/** The dot number the line must reach next. */
export function nextDot(puzzle: Puzzle, path: number[]): number {
  let reached = 0;
  for (const c of path) if (puzzle.dots[c]) reached = puzzle.dots[c];
  return reached + 1;
}

/**
 * Applies a step to `cell`. Stepping back onto the previous square retracts
 * the line; stepping onto an earlier square cuts the line back to it.
 * Returns the new path, or null if the move is not allowed.
 */
export function extend(puzzle: Puzzle, path: number[], cell: number): number[] | null {
  if (!path.length) return puzzle.dots[cell] === 1 ? [cell] : null;
  const idx = path.indexOf(cell);
  if (idx >= 0) return idx === path.length - 1 ? path : path.slice(0, idx + 1);
  const end = path[path.length - 1];
  if (puzzle.dots[end] === puzzle.total) return null;
  if (!areAdjacent(end, cell, puzzle.n)) return null;
  if (puzzle.walls.includes(edge(end, cell))) return null;
  const dot = puzzle.dots[cell];
  if (dot && dot !== nextDot(puzzle, path)) return null;
  return [...path, cell];
}

export function isComplete(puzzle: Puzzle, path: number[]): boolean {
  return (
    path.length === puzzle.n * puzzle.n && puzzle.dots[path[path.length - 1]] === puzzle.total
  );
}

export function scoreFor(n: number, ms: number): number {
  const base = n * n * 20;
  return Math.max(100, Math.round(base - Math.max(0, ms / 1000 - n * n * 1.2) * 3));
}
