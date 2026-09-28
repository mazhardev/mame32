import type { DifficultySetting } from '@/types';

/**
 * Nonograms. A solution is a boolean grid (row-major); each row and column
 * gets a clue listing the lengths of its filled runs. The line solver below
 * decides which cells are forced, which lets us accept only puzzles that can
 * be solved by pure logic — no guessing required.
 */
export const SIZES: Record<DifficultySetting, number> = { easy: 5, normal: 10, hard: 15 };

/** Player marks: 0 unknown, 1 filled, 2 crossed out (known empty). */
export type Mark = 0 | 1 | 2;
export const UNKNOWN = 0;
export const FILLED = 1;
export const EMPTY = 2;

export function lineClue(line: ArrayLike<boolean | number>): number[] {
  const out: number[] = [];
  let run = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === true || line[i] === 1) run++;
    else if (run) {
      out.push(run);
      run = 0;
    }
  }
  if (run) out.push(run);
  return out;
}

export function rowOf<T>(grid: T[], n: number, r: number): T[] {
  return grid.slice(r * n, r * n + n);
}

export function colOf<T>(grid: T[], n: number, c: number): T[] {
  return Array.from({ length: n }, (_, r) => grid[r * n + c]);
}

export function cluesFor(solution: boolean[], n: number) {
  return {
    rows: Array.from({ length: n }, (_, r) => lineClue(rowOf(solution, n, r))),
    cols: Array.from({ length: n }, (_, c) => lineClue(colOf(solution, n, c))),
  };
}

const sameClue = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * For one line, which cells can be filled and which can be empty in at
 * least one arrangement consistent with the clue and the known cells.
 * Returns null if no arrangement exists.
 *
 * `fits[i][j]` = clues j.. can be placed in cells i.. — computed right to
 * left. Then a forward sweep over reachable (i, j) states records which
 * choices (leave cell i empty, or start block j at i) stay feasible.
 */
export function lineOptions(clue: number[], known: Mark[]) {
  const L = known.length;
  const k = clue.length;
  const fits: boolean[][] = Array.from({ length: L + 2 }, () => Array<boolean>(k + 1).fill(false));
  // noFilledFrom[i]: no filled cell in i..L-1
  const noFilledFrom = Array<boolean>(L + 2).fill(true);
  for (let i = L - 1; i >= 0; i--) noFilledFrom[i] = noFilledFrom[i + 1] && known[i] !== FILLED;
  const blockOk = (i: number, len: number) => {
    if (i + len > L) return false;
    for (let x = i; x < i + len; x++) if (known[x] === EMPTY) return false;
    return i + len === L || known[i + len] !== FILLED;
  };
  for (let i = L; i >= 0; i--) {
    for (let j = k; j >= 0; j--) {
      if (j === k) {
        fits[i][j] = noFilledFrom[i];
        continue;
      }
      if (i >= L) {
        fits[i][j] = false;
        continue;
      }
      let ok = known[i] !== FILLED && fits[i + 1][j];
      if (!ok && blockOk(i, clue[j])) {
        const next = Math.min(L, i + clue[j] + 1);
        ok = fits[next][j + 1];
      }
      fits[i][j] = ok;
    }
  }
  if (!fits[0][0]) return null;

  const canFill = Array<boolean>(L).fill(false);
  const canEmpty = Array<boolean>(L).fill(false);
  const reach: boolean[][] = Array.from({ length: L + 2 }, () => Array<boolean>(k + 1).fill(false));
  reach[0][0] = true;
  for (let i = 0; i <= L; i++) {
    for (let j = 0; j <= k; j++) {
      if (!reach[i][j] || !fits[i][j]) continue;
      if (i >= L) continue;
      if (j === k) {
        for (let x = i; x < L; x++) canEmpty[x] = true;
        continue;
      }
      if (known[i] !== FILLED && fits[i + 1][j]) {
        canEmpty[i] = true;
        reach[i + 1][j] = true;
      }
      const len = clue[j];
      if (blockOk(i, len)) {
        const next = Math.min(L, i + len + 1);
        if (fits[next][j + 1]) {
          for (let x = i; x < i + len; x++) canFill[x] = true;
          if (i + len < L) canEmpty[i + len] = true;
          reach[next][j + 1] = true;
        }
      }
    }
  }
  return { canFill, canEmpty };
}

/**
 * Repeatedly solves rows and columns until nothing changes. Returns the
 * deduced grid, whether it is complete, and whether a contradiction appeared.
 */
export function logicSolve(rows: number[][], cols: number[][]) {
  const n = rows.length;
  const grid: Mark[] = Array<Mark>(n * n).fill(UNKNOWN);
  const dirty = new Set<string>();
  for (let i = 0; i < n; i++) {
    dirty.add(`r${i}`);
    dirty.add(`c${i}`);
  }
  while (dirty.size) {
    const id = dirty.values().next().value as string;
    dirty.delete(id);
    const isRow = id[0] === 'r';
    const idx = Number(id.slice(1));
    const cells = Array.from({ length: n }, (_, t) => (isRow ? idx * n + t : t * n + idx));
    const known = cells.map((c) => grid[c]);
    const opts = lineOptions(isRow ? rows[idx] : cols[idx], known);
    if (!opts) return { grid, complete: false, contradiction: true };
    cells.forEach((cell, t) => {
      if (grid[cell] !== UNKNOWN) return;
      const v = opts.canFill[t] && !opts.canEmpty[t] ? FILLED : !opts.canFill[t] ? EMPTY : UNKNOWN;
      if (v === UNKNOWN) return;
      grid[cell] = v;
      dirty.add(isRow ? `c${t}` : `r${t}`);
    });
  }
  return { grid, complete: grid.every((m) => m !== UNKNOWN), contradiction: false };
}

/** True when the puzzle has exactly one solution reachable by line logic. */
export function isLineSolvable(solution: boolean[], n: number): boolean {
  const { rows, cols } = cluesFor(solution, n);
  const res = logicSolve(rows, cols);
  return res.complete && res.grid.every((m, i) => (m === FILLED) === solution[i]);
}

/** Random blobby picture: noise smoothed by a majority-vote cellular automaton. */
export function randomPicture(n: number, random: () => number): boolean[] {
  let grid = Array.from({ length: n * n }, () => random() < 0.56);
  for (let pass = 0; pass < 2; pass++) {
    grid = grid.map((v, i) => {
      const r = Math.floor(i / n);
      const c = i % n;
      let on = 0;
      let total = 0;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
          total++;
          if (grid[rr * n + cc]) on++;
        }
      return on * 2 > total ? true : on * 2 < total ? false : v;
    });
  }
  return grid;
}

export function parsePicture(rows: string[]): boolean[] {
  return rows.join('').split('').map((ch) => ch === '#');
}

export interface Puzzle {
  n: number;
  name: string;
  solution: boolean[];
}

/** Every row and column matches its clue — any such grid counts as solved. */
export function matchesClues(marks: Mark[], rows: number[][], cols: number[][]): boolean {
  const n = rows.length;
  const filled = marks.map((m) => m === FILLED);
  for (let i = 0; i < n; i++) {
    if (!sameClue(lineClue(rowOf(filled, n, i)), rows[i])) return false;
    if (!sameClue(lineClue(colOf(filled, n, i)), cols[i])) return false;
  }
  return true;
}

/** Which clue lines the player's current fills already satisfy. */
export function doneLines(marks: Mark[], rows: number[][], cols: number[][]) {
  const n = rows.length;
  const filled = marks.map((m) => m === FILLED);
  return {
    rows: rows.map((clue, r) => sameClue(lineClue(rowOf(filled, n, r)), clue)),
    cols: cols.map((clue, c) => sameClue(lineClue(colOf(filled, n, c)), clue)),
  };
}

export function scoreFor(n: number, ms: number, checks: number): number {
  const base = n * n * 8;
  const par = n * n * 1.2; // seconds
  return Math.max(50, Math.round(base - Math.max(0, ms / 1000 - par) * 2 - checks * 100));
}

/** Picks a puzzle: a named picture when available, otherwise a generated pattern. */
export function makePuzzle(
  n: number,
  pictures: { name: string; rows: string[] }[],
  random: () => number,
  avoid?: string,
): Puzzle {
  const pool = pictures.filter((p) => p.name !== avoid);
  if (pool.length && random() < 0.6) {
    const pic = pool[Math.floor(random() * pool.length)];
    return { n, name: pic.name, solution: parsePicture(pic.rows) };
  }
  for (let attempt = 0; attempt < 100; attempt++) {
    const solution = randomPicture(n, random);
    const density = solution.filter(Boolean).length / solution.length;
    if (density < 0.35 || density > 0.72) continue;
    if (isLineSolvable(solution, n)) return { n, name: 'Mystery pattern', solution };
  }
  const pic = pictures[0];
  return { n, name: pic.name, solution: parsePicture(pic.rows) };
}

export interface NonogramSave {
  n: number;
  name: string;
  solution: string;
  marks: Mark[];
  ms: number;
  checks: number;
}

export function encodeSolution(solution: boolean[]): string {
  return solution.map((b) => (b ? '1' : '0')).join('');
}

export function validSave(v: unknown): v is NonogramSave {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  const n = s.n;
  if (n !== 5 && n !== 10 && n !== 15) return false;
  if (typeof s.name !== 'string' || s.name.length > 40) return false;
  if (typeof s.solution !== 'string' || !new RegExp(`^[01]{${n * n}}$`).test(s.solution)) return false;
  if (!Array.isArray(s.marks) || s.marks.length !== n * n) return false;
  if (!s.marks.every((m) => m === 0 || m === 1 || m === 2)) return false;
  return typeof s.ms === 'number' && s.ms >= 0 && Number.isInteger(s.checks) && (s.checks as number) >= 0;
}
