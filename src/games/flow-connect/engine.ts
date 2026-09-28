import type { DifficultySetting } from '@/types';
import { areAdjacent, hamiltonianPath } from '../_shared/puzzle/hamilton';

/**
 * Flow Connect: join each pair of same-coloured endpoints with a pipe.
 * Pipes may not cross, and the puzzle is solved when every pair is joined
 * and every square is filled.
 *
 * Puzzles are cut from a random Hamiltonian path, so a full-board solution
 * always exists.
 */
export const LEVELS: Record<DifficultySetting, { n: number; flows: number }> = {
  easy: { n: 5, flows: 5 },
  normal: { n: 7, flows: 7 },
  hard: { n: 9, flows: 10 },
};

export interface Puzzle {
  n: number;
  /** ends[k] = the two endpoint cells of flow k. */
  ends: [number, number][];
}

export function generate(level: { n: number; flows: number }, random: () => number): Puzzle {
  const { n, flows } = level;
  for (let attempt = 0; attempt < 200; attempt++) {
    const path = hamiltonianPath(n, n, random);
    // Random segment lengths of at least 3 that add up to the whole path.
    const lengths = Array<number>(flows).fill(3);
    let spare = n * n - flows * 3;
    while (spare > 0) {
      lengths[Math.floor(random() * flows)]++;
      spare--;
    }
    const ends: [number, number][] = [];
    let at = 0;
    for (const len of lengths) {
      ends.push([path[at], path[at + len - 1]]);
      at += len;
    }
    // Neighbouring endpoints make a pair trivial; try again.
    if (ends.some(([a, b]) => areAdjacent(a, b, n))) continue;
    return { n, ends };
  }
  throw new Error('Could not generate a flow puzzle');
}

export function endpointAt(puzzle: Puzzle, cell: number): number {
  return puzzle.ends.findIndex(([a, b]) => a === cell || b === cell);
}

export function isConnected(puzzle: Puzzle, k: number, path: number[]): boolean {
  if (path.length < 2) return false;
  const [a, b] = puzzle.ends[k];
  const first = path[0];
  const last = path[path.length - 1];
  return (first === a && last === b) || (first === b && last === a);
}

/** Which flow's pipe (if any) covers each cell. */
export function occupancy(puzzle: Puzzle, paths: number[][]): number[] {
  const occ = Array<number>(puzzle.n * puzzle.n).fill(-1);
  puzzle.ends.forEach(([a, b], k) => {
    occ[a] = k;
    occ[b] = k;
  });
  paths.forEach((p, k) => p.forEach((c) => (occ[c] = k)));
  return occ;
}

/**
 * Starts (or resumes) drawing flow k from `cell`: pressing an endpoint
 * starts a fresh pipe there; pressing a pipe cuts it back to that square.
 */
export function begin(puzzle: Puzzle, paths: number[][], cell: number): { paths: number[][]; active: number } | null {
  const end = endpointAt(puzzle, cell);
  if (end >= 0) {
    const next = paths.slice();
    next[end] = [cell];
    return { paths: next, active: end };
  }
  const owner = paths.findIndex((p) => p.includes(cell));
  if (owner < 0) return null;
  const next = paths.slice();
  next[owner] = paths[owner].slice(0, paths[owner].indexOf(cell) + 1);
  return { paths: next, active: owner };
}

/**
 * Extends the active flow into `cell`. Moving back along the pipe retracts
 * it; moving onto another flow's pipe cuts that pipe. Returns the new
 * paths, or null if the move is not allowed.
 */
export function advance(puzzle: Puzzle, paths: number[][], k: number, cell: number): number[][] | null {
  const path = paths[k];
  if (!path.length) return null;
  const idx = path.indexOf(cell);
  if (idx >= 0) {
    if (idx === path.length - 1) return null;
    const next = paths.slice();
    next[k] = path.slice(0, idx + 1);
    return next;
  }
  const head = path[path.length - 1];
  if (!areAdjacent(head, cell, puzzle.n)) return null;
  if (isConnected(puzzle, k, path)) return null;
  const end = endpointAt(puzzle, cell);
  if (end >= 0 && end !== k) return null;
  const next = paths.map((p, j) => {
    if (j === k || !p.includes(cell)) return p;
    return p.slice(0, p.indexOf(cell));
  });
  next[k] = [...path, cell];
  return next;
}

export function connectedCount(puzzle: Puzzle, paths: number[][]): number {
  return paths.filter((p, k) => isConnected(puzzle, k, p)).length;
}

export function filledCount(puzzle: Puzzle, paths: number[][]): number {
  return occupancy(puzzle, paths).filter((k) => k >= 0).length;
}

export function isSolved(puzzle: Puzzle, paths: number[][]): boolean {
  return (
    connectedCount(puzzle, paths) === puzzle.ends.length &&
    filledCount(puzzle, paths) === puzzle.n * puzzle.n
  );
}

export function scoreFor(n: number, flows: number, moves: number, ms: number): number {
  const base = n * n * 12;
  const extra = Math.max(0, moves - flows);
  return Math.max(100, Math.round(base - extra * 15 - Math.max(0, ms / 1000 - n * n) * 2));
}

export interface FlowSave {
  puzzle: Puzzle;
  paths: number[][];
  moves: number;
  ms: number;
}

export function validSave(v: unknown): v is FlowSave {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  const p = s.puzzle as Record<string, unknown> | undefined;
  if (!p || typeof p !== 'object') return false;
  const n = p.n;
  if (n !== 5 && n !== 7 && n !== 9) return false;
  const inRange = (c: unknown) => Number.isInteger(c) && (c as number) >= 0 && (c as number) < n * n;
  if (!Array.isArray(p.ends) || p.ends.length < 2 || p.ends.length > 12) return false;
  if (!p.ends.every((e) => Array.isArray(e) && e.length === 2 && e.every(inRange))) return false;
  if (!Array.isArray(s.paths) || s.paths.length !== p.ends.length) return false;
  if (!s.paths.every((path) => Array.isArray(path) && path.every(inRange))) return false;
  return Number.isInteger(s.moves) && typeof s.ms === 'number' && s.ms >= 0;
}
