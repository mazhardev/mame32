import type { DifficultySetting } from '@/types';

/**
 * Kakuro. The board is a square of cells; white cells take digits 1–9.
 * Every horizontal or vertical run of white cells has a sum clue, and no
 * digit may repeat within a run. Row 0 and column 0 are always black.
 */
export const SIZES: Record<DifficultySetting, number> = { easy: 6, normal: 8, hard: 10 };

export interface Run {
  cells: number[];
  sum: number;
  dir: 'across' | 'down';
  /** The black cell whose triangle shows this run's sum. */
  clue: number;
}

export interface Board {
  n: number;
  white: boolean[];
  runs: Run[];
  /** Run indices per cell: [across, down]. */
  cellRuns: [number, number][];
  solution: number[];
  /** Pre-filled digits (0 = none) that make the solution unique. */
  givens: number[];
}

/** All digit sets (as bitmasks over 1–9) keyed by `${length}:${sum}`. */
const COMBOS = new Map<string, number[]>();
for (let mask = 1; mask < 1 << 9; mask++) {
  let len = 0;
  let sum = 0;
  for (let d = 1; d <= 9; d++)
    if (mask & (1 << (d - 1))) {
      len++;
      sum += d;
    }
  const key = `${len}:${sum}`;
  if (!COMBOS.has(key)) COMBOS.set(key, []);
  COMBOS.get(key)!.push(mask);
}

export function combos(length: number, sum: number): number[][] {
  return (COMBOS.get(`${length}:${sum}`) ?? []).map((mask) =>
    Array.from({ length: 9 }, (_, i) => i + 1).filter((d) => mask & (1 << (d - 1))),
  );
}

export function runsFor(n: number, white: boolean[]): { runs: Omit<Run, 'sum'>[]; cellRuns: [number, number][] } {
  const runs: Omit<Run, 'sum'>[] = [];
  const cellRuns: [number, number][] = white.map(() => [-1, -1]);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const i = r * n + c;
      if (white[i]) continue;
      const across: number[] = [];
      for (let x = c + 1; x < n && white[r * n + x]; x++) across.push(r * n + x);
      if (across.length) {
        across.forEach((cell) => (cellRuns[cell][0] = runs.length));
        runs.push({ cells: across, dir: 'across', clue: i });
      }
      const down: number[] = [];
      for (let y = r + 1; y < n && white[y * n + c]; y++) down.push(y * n + c);
      if (down.length) {
        down.forEach((cell) => (cellRuns[cell][1] = runs.length));
        runs.push({ cells: down, dir: 'down', clue: i });
      }
    }
  }
  return { runs, cellRuns };
}

export const MAX_RUN: Record<number, number> = { 6: 4, 8: 5, 10: 6 };

/** Every white cell sits in an across run and a down run of at least 2 cells. */
function layoutValid(n: number, white: boolean[]): boolean {
  for (let r = 1; r < n; r++) {
    for (let c = 1; c < n; c++) {
      const i = r * n + c;
      if (!white[i]) continue;
      let across = 1;
      for (let x = c - 1; x >= 1 && white[r * n + x]; x--) across++;
      for (let x = c + 1; x < n && white[r * n + x]; x++) across++;
      let down = 1;
      for (let y = r - 1; y >= 1 && white[y * n + c]; y--) down++;
      for (let y = r + 1; y < n && white[y * n + c]; y++) down++;
      if (across < 2 || down < 2) return false;
    }
  }
  return true;
}

function longestRun(n: number, white: boolean[]): number {
  let best = 0;
  for (let r = 1; r < n; r++) {
    let run = 0;
    for (let c = 1; c < n; c++) {
      run = white[r * n + c] ? run + 1 : 0;
      best = Math.max(best, run);
    }
  }
  for (let c = 1; c < n; c++) {
    let run = 0;
    for (let r = 1; r < n; r++) {
      run = white[r * n + c] ? run + 1 : 0;
      best = Math.max(best, run);
    }
  }
  return best;
}

function connected(n: number, white: boolean[]): boolean {
  const cells = white.flatMap((w, i) => (w ? [i] : []));
  if (!cells.length) return false;
  const seen = new Set([cells[0]]);
  const stack = [cells[0]];
  while (stack.length) {
    const i = stack.pop()!;
    const r = Math.floor(i / n);
    for (const j of [i - n, i + n, i % n > 0 ? i - 1 : -1, i % n < n - 1 ? i + 1 : -1]) {
      if (j < 0 || j >= n * n || !white[j] || seen.has(j)) continue;
      if (Math.abs(Math.floor(j / n) - r) > 1) continue;
      seen.add(j);
      stack.push(j);
    }
  }
  return seen.size === cells.length;
}

/**
 * Builds a layout by blacking out cells (and their 180° mirror images) one
 * pair at a time, keeping only changes that leave every run 2+ cells long
 * and the white area connected, until runs are short enough.
 */
export function makeLayout(n: number, random: () => number): boolean[] | null {
  const maxRun = MAX_RUN[n] ?? 6;
  const white = Array.from({ length: n * n }, (_, i) => i >= n && i % n !== 0);
  const inner = white.flatMap((w, i) => (w ? [i] : []));
  for (let i = inner.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [inner[i], inner[j]] = [inner[j], inner[i]];
  }
  const targetBlack = Math.round(inner.length * 0.22);
  let blacks = 0;
  const mirror = (i: number) => (n - Math.floor(i / n)) * n + (n - (i % n));
  const tryBlack = (i: number) => {
    const m = mirror(i);
    if (!white[i] || !white[m]) return false;
    white[i] = false;
    white[m] = false;
    if (layoutValid(n, white) && connected(n, white)) {
      blacks += i === m ? 1 : 2;
      return true;
    }
    white[i] = true;
    white[m] = true;
    return false;
  };
  for (const i of inner) {
    if (blacks >= targetBlack && longestRun(n, white) <= maxRun) break;
    tryBlack(i);
  }
  // Keep chopping any run that is still too long.
  for (let pass = 0; pass < 3 && longestRun(n, white) > maxRun; pass++) {
    for (const i of inner) if (longestRun(n, white) > maxRun) tryBlack(i);
  }
  if (longestRun(n, white) > maxRun || !layoutValid(n, white)) return null;
  return white;
}

/** Fills the white cells with digits so no run repeats a digit. */
export function fillDigits(n: number, white: boolean[], random: () => number): number[] | null {
  const { runs, cellRuns } = runsFor(n, white);
  const used = runs.map(() => 0);
  const grid = Array<number>(n * n).fill(0);
  const order = white.flatMap((w, i) => (w ? [i] : []));
  let steps = 0;
  const place = (k: number): boolean => {
    if (k === order.length) return true;
    if (++steps > 20000) return false;
    const cell = order[k];
    const [a, d] = cellRuns[cell];
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = 8; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    for (const v of digits) {
      const bit = 1 << (v - 1);
      if (used[a] & bit || used[d] & bit) continue;
      used[a] |= bit;
      used[d] |= bit;
      grid[cell] = v;
      if (place(k + 1)) return true;
      used[a] &= ~bit;
      used[d] &= ~bit;
    }
    grid[cell] = 0;
    return false;
  };
  return place(0) ? grid : null;
}

/**
 * Finds up to `limit` solutions, with some cells optionally fixed by
 * `givens` (0 = free). Each free cell's candidates are the digits that
 * appear in a sum-combination of both its runs that is compatible with the
 * digits already placed; the most constrained cell is branched on first.
 * `exhausted` is true if the node budget ran out before the search ended.
 */
export function findSolutions(
  board: Pick<Board, 'white' | 'runs' | 'cellRuns'>,
  givens: number[],
  limit = 2,
  budget = 200_000,
): { solutions: number[][]; exhausted: boolean } {
  const { white, runs, cellRuns } = board;
  const grid = white.map((w, i) => (w ? givens[i] || 0 : 0));
  const runMasks = runs.map((r) => COMBOS.get(`${r.cells.length}:${r.sum}`) ?? []);
  const used = runs.map((r) => r.cells.reduce((m, c) => (grid[c] ? m | (1 << (grid[c] - 1)) : m), 0));
  const cells = white.flatMap((w, i) => (w ? [i] : []));
  const solutions: number[][] = [];
  let nodes = 0;

  const allowed = (run: number): number => {
    let out = 0;
    for (const m of runMasks[run]) if ((m & used[run]) === used[run]) out |= m;
    return out & ~used[run];
  };

  const search = (): boolean => {
    if (++nodes > budget) return true;
    let best = -1;
    let bestMask = 0;
    let bestCount = 10;
    for (const c of cells) {
      if (grid[c]) continue;
      const mask = allowed(cellRuns[c][0]) & allowed(cellRuns[c][1]);
      let count = 0;
      for (let m = mask; m; m &= m - 1) count++;
      if (count === 0) return false;
      if (count < bestCount) {
        best = c;
        bestMask = mask;
        bestCount = count;
        if (count === 1) break;
      }
    }
    if (best < 0) {
      // Every run's used digits form a valid combination by construction.
      if (runs.every((_, k) => runMasks[k].includes(used[k]))) solutions.push(grid.slice());
      return solutions.length >= limit;
    }
    const [a, d] = cellRuns[best];
    for (let v = 1; v <= 9; v++) {
      const bit = 1 << (v - 1);
      if (!(bestMask & bit)) continue;
      grid[best] = v;
      used[a] |= bit;
      used[d] |= bit;
      const stop = search();
      used[a] &= ~bit;
      used[d] &= ~bit;
      grid[best] = 0;
      if (stop) return true;
    }
    return false;
  };
  search();
  return { solutions, exhausted: nodes > budget };
}

/** How ambiguous a fill's sums are: the log of the number of digit sets per run. */
function ambiguity(runs: Omit<Run, 'sum'>[], sol: number[]): number {
  return runs.reduce((acc, r) => {
    const sum = r.cells.reduce((a, c) => a + sol[c], 0);
    return acc + Math.log((COMBOS.get(`${r.cells.length}:${sum}`) ?? [0]).length);
  }, 0);
}

/**
 * Generates a puzzle with exactly one solution. Among many random fills of
 * a layout, the one with the least ambiguous sums is kept; then, while a
 * second solution exists, one cell where the two solutions differ is
 * revealed as a given. Usually only a few givens are needed.
 */
export function generate(n: number, random: () => number = Math.random): Board {
  for (let attempt = 0; attempt < 60; attempt++) {
    const white = makeLayout(n, random);
    if (!white) continue;
    const { runs: bare, cellRuns } = runsFor(n, white);
    let solution: number[] | null = null;
    let cost = Infinity;
    for (let f = 0; f < 40; f++) {
      const sol = fillDigits(n, white, random);
      if (!sol) continue;
      const c = ambiguity(bare, sol);
      if (c < cost) {
        cost = c;
        solution = sol;
      }
    }
    if (!solution) continue;
    const sol = solution;
    const runs = bare.map((r) => ({ ...r, sum: r.cells.reduce((s, c) => s + sol[c], 0) }));
    const givens = white.map(() => 0);
    const whites = white.flatMap((w, i) => (w ? [i] : []));
    const maxGivens = Math.ceil(whites.length * 0.2);
    for (let g = 0; g <= maxGivens; g++) {
      const res = findSolutions({ white, runs, cellRuns }, givens, 2, 60_000);
      if (!res.exhausted && res.solutions.length === 1) {
        return { n, white, runs, cellRuns, solution: sol, givens };
      }
      const [x, y] = res.solutions;
      const diff = x && y ? whites.filter((c) => x[c] !== y[c] && !givens[c]) : whites.filter((c) => !givens[c]);
      if (!diff.length) break;
      const c = diff[Math.floor(random() * diff.length)];
      givens[c] = sol[c];
    }
  }
  throw new Error('Could not generate a Kakuro puzzle');
}

/** Cells whose digit repeats within one of its runs. */
export function duplicates(board: Board, entries: number[]): Set<number> {
  const out = new Set<number>();
  for (const run of board.runs) {
    const seen = new Map<number, number>();
    for (const c of run.cells) {
      const v = entries[c];
      if (!v) continue;
      if (seen.has(v)) {
        out.add(c);
        out.add(seen.get(v)!);
      } else seen.set(v, c);
    }
  }
  return out;
}

/** Status of each run: complete-and-correct, complete-but-wrong, or open. */
export function runStatus(board: Board, entries: number[]): ('ok' | 'bad' | 'open')[] {
  return board.runs.map((run) => {
    const vals = run.cells.map((c) => entries[c]);
    if (vals.some((v) => !v)) return 'open';
    const sum = vals.reduce((a, b) => a + b, 0);
    return sum === run.sum && new Set(vals).size === vals.length ? 'ok' : 'bad';
  });
}

export function isSolved(board: Board, entries: number[]): boolean {
  return runStatus(board, entries).every((s) => s === 'ok');
}

export function scoreFor(n: number, ms: number, checks: number): number {
  const whites = (n - 1) * (n - 1) * 0.7;
  const base = Math.round(whites * 30);
  return Math.max(50, Math.round(base - Math.max(0, ms / 1000 - whites * 8) - checks * 80));
}

export interface KakuroSave {
  n: number;
  white: boolean[];
  solution: number[];
  givens: number[];
  entries: number[];
  ms: number;
  checks: number;
}

/** Rebuilds a board from a validated save. */
export function boardFromSave(save: KakuroSave): Board {
  const { runs: bare, cellRuns } = runsFor(save.n, save.white);
  const runs = bare.map((r) => ({ ...r, sum: r.cells.reduce((s, c) => s + save.solution[c], 0) }));
  return { n: save.n, white: save.white, runs, cellRuns, solution: save.solution, givens: save.givens };
}

export function validSave(v: unknown): v is KakuroSave {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  const n = s.n;
  if (n !== 6 && n !== 8 && n !== 10) return false;
  const size = n * n;
  if (!Array.isArray(s.white) || s.white.length !== size || !s.white.every((w) => typeof w === 'boolean'))
    return false;
  const white = s.white as boolean[];
  const digits = (arr: unknown, min: number) =>
    Array.isArray(arr) &&
    arr.length === size &&
    arr.every((d, i) => Number.isInteger(d) && d <= 9 && (white[i] ? d >= min : d === 0));
  if (!digits(s.solution, 1) || !digits(s.entries, 0) || !digits(s.givens, 0)) return false;
  const sol = s.solution as number[];
  const givens = s.givens as number[];
  if (givens.some((g, i) => g !== 0 && g !== sol[i])) return false;
  const { runs } = runsFor(n, white);
  if (!layoutValid(n, white)) return false;
  for (const run of runs) {
    if (run.cells.length > 9) return false;
    if (new Set(run.cells.map((c) => sol[c])).size !== run.cells.length) return false;
  }
  return typeof s.ms === 'number' && s.ms >= 0 && Number.isInteger(s.checks) && (s.checks as number) >= 0;
}
