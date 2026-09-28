import type { DifficultySetting } from '@/types';

/**
 * Ball Sort: tubes hold up to CAPACITY balls; only the top ball moves, and
 * it may land in an empty tube or on a ball of the same colour.
 * `tubes[t]` lists colour indices from bottom to top.
 */
export type Tubes = number[][];
export type Move = [from: number, to: number];

export const CAPACITY = 4;

export const LEVELS: Record<DifficultySetting, { colors: number; empty: number }> = {
  easy: { colors: 4, empty: 2 },
  normal: { colors: 7, empty: 2 },
  hard: { colors: 10, empty: 2 },
};

const top = (t: number[]) => t[t.length - 1];

export function canMove(tubes: Tubes, from: number, to: number): boolean {
  if (from === to) return false;
  const src = tubes[from];
  const dst = tubes[to];
  if (!src?.length || !dst || dst.length >= CAPACITY) return false;
  return dst.length === 0 || top(dst) === top(src);
}

export function moveBall(tubes: Tubes, from: number, to: number): Tubes | null {
  if (!canMove(tubes, from, to)) return null;
  const next = tubes.map((t) => t.slice());
  next[to].push(next[from].pop()!);
  return next;
}

function complete(t: number[]): boolean {
  return t.length === CAPACITY && t.every((c) => c === t[0]);
}

export function isSolved(tubes: Tubes): boolean {
  return tubes.every((t) => t.length === 0 || complete(t));
}

export function sortedCount(tubes: Tubes): number {
  return tubes.filter(complete).length;
}

/** Order-independent key: tubes are interchangeable for search purposes. */
function key(tubes: Tubes): string {
  return tubes
    .map((t) => t.join(','))
    .sort()
    .join('|');
}

/** Moves worth trying, best first; obviously wasteful moves are dropped. */
function candidateMoves(tubes: Tubes): Move[] {
  const moves: { m: Move; rank: number }[] = [];
  for (let from = 0; from < tubes.length; from++) {
    const src = tubes[from];
    if (!src.length || complete(src)) continue;
    const uniform = src.every((c) => c === src[0]);
    let emptyTried = false;
    for (let to = 0; to < tubes.length; to++) {
      if (!canMove(tubes, from, to)) continue;
      const dst = tubes[to];
      if (dst.length === 0) {
        // Moving a single-colour tube into an empty one achieves nothing, and
        // all empty tubes are equivalent, so try only the first.
        if (uniform || emptyTried) continue;
        emptyTried = true;
        moves.push({ m: [from, to], rank: 2 });
      } else {
        const dstUniform = dst.every((c) => c === dst[0]);
        moves.push({ m: [from, to], rank: dstUniform ? 0 : 1 });
      }
    }
  }
  return moves.sort((a, b) => a.rank - b.rank).map((x) => x.m);
}

/**
 * Depth-first search with a visited set. Returns a list of moves that sorts
 * the tubes, or null if none was found within `limit` explored positions.
 * It is not guaranteed to be the shortest solution; it is used to prove
 * puzzles solvable and to suggest a hint.
 */
export function solve(start: Tubes, limit = 60_000): Move[] | null {
  const seen = new Set<string>();
  const path: Move[] = [];
  let explored = 0;
  const dfs = (tubes: Tubes): boolean => {
    if (isSolved(tubes)) return true;
    if (++explored > limit) return false;
    const k = key(tubes);
    if (seen.has(k)) return false;
    seen.add(k);
    for (const m of candidateMoves(tubes)) {
      path.push(m);
      if (dfs(moveBall(tubes, m[0], m[1])!)) return true;
      path.pop();
      if (explored > limit) return false;
    }
    return false;
  };
  return dfs(start) ? path : null;
}

/** Random deal, re-dealt until the solver proves it solvable. */
export function generate(
  colors: number,
  empty: number,
  random: () => number = Math.random,
): Tubes {
  for (let attempt = 0; attempt < 40; attempt++) {
    const balls: number[] = [];
    for (let c = 0; c < colors; c++) for (let i = 0; i < CAPACITY; i++) balls.push(c);
    for (let i = balls.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [balls[i], balls[j]] = [balls[j], balls[i]];
    }
    const tubes: Tubes = [];
    for (let t = 0; t < colors; t++) tubes.push(balls.slice(t * CAPACITY, (t + 1) * CAPACITY));
    for (let e = 0; e < empty; e++) tubes.push([]);
    if (tubes.some(complete)) continue;
    if (solve(tubes)) return tubes;
  }
  throw new Error('Could not generate a solvable ball sort puzzle');
}

export function scoreFor(colors: number, moves: number, hints: number, extraTube: boolean): number {
  return Math.max(50, colors * 150 - moves * 4 - hints * 50 - (extraTube ? 200 : 0));
}

export interface BallSortSave {
  tubes: Tubes;
  colors: number;
  moves: number;
  hints: number;
  undos: number;
  extraTube: boolean;
}

export function validSave(v: unknown): v is BallSortSave {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  const colors = s.colors;
  if (!Number.isInteger(colors) || (colors as number) < 2 || (colors as number) > 12) return false;
  if (!Array.isArray(s.tubes) || s.tubes.length < (colors as number) + 1 || s.tubes.length > 16)
    return false;
  const counts = new Map<number, number>();
  for (const t of s.tubes) {
    if (!Array.isArray(t) || t.length > CAPACITY) return false;
    for (const c of t) {
      if (!Number.isInteger(c) || c < 0 || c >= (colors as number)) return false;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  if (counts.size !== colors || ![...counts.values()].every((n) => n === CAPACITY)) return false;
  if (isSolved(s.tubes as Tubes)) return false;
  return (
    [s.moves, s.hints, s.undos].every((x) => Number.isInteger(x) && (x as number) >= 0) &&
    typeof s.extraTube === 'boolean'
  );
}
