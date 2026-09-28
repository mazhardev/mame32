import type { DifficultySetting } from '@/types';

/**
 * Lights Out: pressing a light toggles it and its four orthogonal
 * neighbours. The goal is to switch every light off.
 */
export type Lights = boolean[];

export interface Level {
  n: number;
  /** Range of random presses used to build a puzzle. */
  presses: [number, number];
}

export const LEVELS: Record<DifficultySetting, Level> = {
  easy: { n: 5, presses: [3, 5] },
  normal: { n: 5, presses: [7, 10] },
  hard: { n: 7, presses: [13, 18] },
};

export function neighbours(n: number, i: number): number[] {
  const r = Math.floor(i / n);
  const c = i % n;
  const out = [i];
  if (r > 0) out.push(i - n);
  if (r < n - 1) out.push(i + n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  return out;
}

export function press(lights: Lights, n: number, i: number): Lights {
  const next = lights.slice();
  for (const j of neighbours(n, i)) next[j] = !next[j];
  return next;
}

export function allOff(lights: Lights): boolean {
  return lights.every((l) => !l);
}

export function litCount(lights: Lights): number {
  return lights.filter(Boolean).length;
}

/**
 * Builds a puzzle by pressing random distinct cells on a dark board, so it
 * is always solvable. Retries until the minimal solution is at least 2
 * presses (presses can cancel out on boards with a null space, like 5×5).
 */
export function generate(level: Level, random: () => number = Math.random): Lights {
  const { n } = level;
  for (let attempt = 0; attempt < 50; attempt++) {
    const [lo, hi] = level.presses;
    const k = lo + Math.floor(random() * (hi - lo + 1));
    const cells = Array.from({ length: n * n }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    let lights: Lights = Array<boolean>(n * n).fill(false);
    for (const cell of cells.slice(0, k)) lights = press(lights, n, cell);
    const best = solve(lights, n);
    if (best && best.length >= Math.min(2, lo)) return lights;
  }
  return press(Array<boolean>(n * n).fill(false), n, Math.floor((n * n) / 2));
}

/**
 * Minimal set of presses that turns every light off, or null if impossible.
 *
 * Pressing is linear over GF(2), so we solve A·x = b by Gaussian
 * elimination, where column j of A is the toggle pattern of cell j. Free
 * variables span the null space (dimension 2 on 5×5, 0 on 7×7); every
 * combination is tried to find the solution with the fewest presses.
 */
export function solve(lights: Lights, n: number): number[] | null {
  const size = n * n;
  // Augmented rows: row i says which presses toggle light i, plus light i's state.
  const rows: Uint8Array[] = [];
  for (let i = 0; i < size; i++) {
    const row = new Uint8Array(size + 1);
    for (const j of neighbours(n, i)) row[j] = 1;
    row[size] = lights[i] ? 1 : 0;
    rows.push(row);
  }
  const pivotCol: number[] = [];
  let r = 0;
  for (let c = 0; c < size && r < size; c++) {
    let p = r;
    while (p < size && rows[p][c] === 0) p++;
    if (p === size) continue;
    [rows[r], rows[p]] = [rows[p], rows[r]];
    for (let i = 0; i < size; i++) {
      if (i !== r && rows[i][c] === 1) {
        // From column 0: row r may carry bits in earlier free columns.
        for (let k = 0; k <= size; k++) rows[i][k] ^= rows[r][k];
      }
    }
    pivotCol.push(c);
    r++;
  }
  // Inconsistent: a zero row with a lit right-hand side.
  for (let i = r; i < size; i++) if (rows[i][size] === 1) return null;

  const pivotSet = new Set(pivotCol);
  const free = Array.from({ length: size }, (_, c) => c).filter((c) => !pivotSet.has(c));
  if (free.length > 12) return null;

  let best: number[] | null = null;
  for (let mask = 0; mask < 1 << free.length; mask++) {
    const x = new Uint8Array(size);
    free.forEach((c, k) => (x[c] = (mask >> k) & 1));
    for (let i = 0; i < pivotCol.length; i++) {
      let v = rows[i][size];
      for (const c of free) if (rows[i][c]) v ^= x[c];
      x[pivotCol[i]] = v;
    }
    const presses: number[] = [];
    x.forEach((v, i) => v && presses.push(i));
    if (!best || presses.length < best.length) best = presses;
  }
  return best;
}

export function scoreFor(n: number, moves: number, par: number, hints: number): number {
  const base = n * n * 20;
  return Math.max(50, base - Math.max(0, moves - par) * 15 - hints * 60);
}

export function validSave(
  v: unknown,
): v is { n: number; lights: Lights; moves: number; par: number; hints: number } {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  const n = s.n;
  if (n !== 5 && n !== 7) return false;
  if (!Array.isArray(s.lights) || s.lights.length !== n * n) return false;
  if (!s.lights.every((l) => typeof l === 'boolean')) return false;
  if (allOff(s.lights as Lights) || solve(s.lights as Lights, n) === null) return false;
  return [s.moves, s.par, s.hints].every((x) => Number.isInteger(x) && (x as number) >= 0);
}
