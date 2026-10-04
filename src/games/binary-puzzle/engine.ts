/**
 * Binary Puzzle (Takuzu / Binairo).
 *
 * Fill an even-sized grid with 0s and 1s so that:
 *  - no row or column has three equal digits next to each other,
 *  - every row and column has as many 0s as 1s,
 *  - no two rows are identical, and no two columns are identical.
 *
 * Cells hold 0, 1 or -1 (empty). Puzzles are generated from a random full
 * solution by removing clues while the solution stays unique.
 */
export type Cell = -1 | 0 | 1;
export type Grid = Cell[];

export const SIZES = { easy: 6, normal: 8, hard: 10 } as const;

const at = (g: Grid, n: number, r: number, c: number) => g[r * n + c];

function line(g: Grid, n: number, index: number, isRow: boolean): Cell[] {
  return Array.from({ length: n }, (_, k) => (isRow ? at(g, n, index, k) : at(g, n, k, index)));
}

/** Whether a (possibly partial) line breaks a rule on its own. */
function lineBroken(cells: Cell[]): boolean {
  const n = cells.length;
  let zeros = 0;
  let ones = 0;
  for (let i = 0; i < n; i++) {
    if (cells[i] === 0) zeros++;
    if (cells[i] === 1) ones++;
    if (i >= 2 && cells[i] !== -1 && cells[i] === cells[i - 1] && cells[i] === cells[i - 2]) return true;
  }
  return zeros > n / 2 || ones > n / 2;
}

const complete = (cells: Cell[]) => cells.every((c) => c !== -1);
const same = (a: Cell[], b: Cell[]) => a.every((v, i) => v === b[i]);

/** Lists the rule violations in a grid, for highlighting. */
export function conflicts(g: Grid, n: number): Set<number> {
  const bad = new Set<number>();
  for (let i = 0; i < n; i++) {
    for (const isRow of [true, false]) {
      const cells = line(g, n, i, isRow);
      const idx = (k: number) => (isRow ? i * n + k : k * n + i);
      for (let k = 2; k < n; k++) {
        if (cells[k] !== -1 && cells[k] === cells[k - 1] && cells[k] === cells[k - 2]) [k, k - 1, k - 2].forEach((x) => bad.add(idx(x)));
      }
      for (const v of [0, 1] as const) {
        if (cells.filter((c) => c === v).length > n / 2) cells.forEach((c, k) => c === v && bad.add(idx(k)));
      }
      if (complete(cells)) {
        for (let j = 0; j < i; j++) {
          const other = line(g, n, j, isRow);
          if (complete(other) && same(cells, other)) {
            for (let k = 0; k < n; k++) {
              bad.add(idx(k));
              bad.add(isRow ? j * n + k : k * n + j);
            }
          }
        }
      }
    }
  }
  return bad;
}

export function isSolved(g: Grid, n: number): boolean {
  return g.every((c) => c !== -1) && conflicts(g, n).size === 0;
}

/** Fill forced cells (pairs, gaps and full counts). Returns false on contradiction. */
function propagate(g: Grid, n: number): boolean {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < n; i++) {
      for (const isRow of [true, false]) {
        const idx = (k: number) => (isRow ? i * n + k : k * n + i);
        const cells = line(g, n, i, isRow);
        if (lineBroken(cells)) return false;
        for (let k = 0; k < n; k++) {
          if (cells[k] !== -1) continue;
          for (const v of [0, 1] as const) {
            const opp = (1 - v) as Cell;
            // Two equal neighbours (on either side, or around the gap) force the opposite.
            const pairBefore = k >= 2 && cells[k - 1] === v && cells[k - 2] === v;
            const pairAfter = k + 2 < n && cells[k + 1] === v && cells[k + 2] === v;
            const sandwich = k >= 1 && k + 1 < n && cells[k - 1] === v && cells[k + 1] === v;
            if (pairBefore || pairAfter || sandwich) {
              g[idx(k)] = opp;
              cells[k] = opp;
              changed = true;
            }
          }
        }
        for (const v of [0, 1] as const) {
          if (cells.filter((c) => c === v).length === n / 2 && cells.includes(-1)) {
            cells.forEach((c, k) => {
              if (c === -1) {
                g[idx(k)] = (1 - v) as Cell;
                changed = true;
              }
            });
            break;
          }
        }
      }
    }
  }
  // Duplicate complete lines are a contradiction too.
  for (const isRow of [true, false]) {
    const full = Array.from({ length: n }, (_, i) => line(g, n, i, isRow)).filter(complete).map((l) => l.join(''));
    if (new Set(full).size !== full.length) return false;
  }
  return true;
}

/** Counts solutions up to `limit` with propagation and backtracking. */
export function countSolutions(start: Grid, n: number, limit = 2): number {
  let found = 0;
  const solve = (g: Grid) => {
    if (found >= limit) return;
    if (!propagate(g, n)) return;
    const empty = g.indexOf(-1);
    if (empty < 0) {
      if (isSolved(g, n)) found++;
      return;
    }
    for (const v of [0, 1] as const) {
      const next = [...g];
      next[empty] = v;
      solve(next);
    }
  };
  solve([...start]);
  return found;
}

/** A random valid full grid, built with randomised backtracking. */
export function randomSolution(n: number, random: () => number): Grid {
  const solve = (g: Grid): Grid | null => {
    if (!propagate(g, n)) return null;
    const empty = g.indexOf(-1);
    if (empty < 0) return isSolved(g, n) ? g : null;
    const first = (random() < 0.5 ? 0 : 1) as Cell;
    for (const v of [first, (1 - first) as Cell]) {
      const next = [...g];
      next[empty] = v;
      const r = solve(next);
      if (r) return r;
    }
    return null;
  };
  for (;;) {
    const r = solve(Array(n * n).fill(-1));
    if (r) return r;
  }
}

export interface Puzzle {
  n: number;
  givens: Grid;
  solution: Grid;
}

/** Removes clues in random order, keeping only those needed for uniqueness. */
export function generate(n: number, random: () => number): Puzzle {
  const solution = randomSolution(n, random);
  const givens = [...solution];
  const order = givens.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  for (const i of order) {
    const keep = givens[i];
    givens[i] = -1;
    if (countSolutions(givens, n) !== 1) givens[i] = keep;
  }
  return { n, givens, solution };
}
