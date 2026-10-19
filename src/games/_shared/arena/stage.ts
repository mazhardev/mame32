import { EMPTY, ONEWAY, SOLID } from '../platformer/physics';
import type { Solidity, TileQuery } from '../platformer/physics';

/**
 * Single-screen arena stages (20 × 15 tiles of 16 px), as in the classic
 * "clear every enemy on the screen" platformers. A stage is written as the
 * 13 inner rows between the ceiling and the floor, 18 columns wide (the side
 * walls are added). To keep stages short to write:
 *
 *   ''           an empty row
 *   9 chars      the left half, mirrored to make the right half
 *   18 chars     the whole row
 *
 * Glyphs: '#' solid block, '=' ledge you can jump up through, '.' empty,
 * lower-case letters are enemy spawns (games decide what they mean).
 *
 * Wrapping stages have a gap in the middle of the floor and the ceiling:
 * fall through the floor and you drop back in from the top.
 */
export const T = 16;
export const COLS = 20;
export const ROWS = 15;
export const W = COLS * T;
export const H = ROWS * T;

export interface Spawn {
  glyph: string;
  col: number;
  row: number;
}

export interface Stage {
  tiles: string[];
  spawns: Spawn[];
  wrap: boolean;
}

export interface StageOptions {
  wrap?: boolean;
  /** Width of the floor and ceiling gaps on wrapping stages. */
  gap?: number;
}

function expand(row: string): string {
  if (row === '') return '.'.repeat(18);
  if (row.length === 9) return row + [...row].reverse().join('');
  if (row.length === 18) return row;
  throw new Error(`stage rows must be empty, 9 or 18 characters: "${row}"`);
}

export function buildStage(inner: string[], opts: StageOptions = {}): Stage {
  if (inner.length !== ROWS - 2) throw new Error(`a stage has ${ROWS - 2} inner rows, got ${inner.length}`);
  const wrap = !!opts.wrap;
  const gap = opts.gap ?? 4;
  const g0 = COLS / 2 - gap / 2;
  const edge = (c: number) => (wrap && c >= g0 && c < g0 + gap ? '.' : '#');
  const rows: string[] = [];
  // Ceiling: solid on wrapping stages (with the gap), open sky otherwise.
  rows.push(Array.from({ length: COLS }, (_, c) => (c === 0 || c === COLS - 1 ? '#' : wrap ? edge(c) : '.')).join(''));
  for (const r of inner) rows.push(`#${expand(r)}#`);
  rows.push(Array.from({ length: COLS }, (_, c) => (c === 0 || c === COLS - 1 ? '#' : edge(c))).join(''));

  const tiles: string[] = [];
  const spawns: Spawn[] = [];
  rows.forEach((row, r) =>
    [...row].forEach((g, c) => {
      if (/[a-z]/.test(g)) {
        spawns.push({ glyph: g, col: c, row: r });
        tiles.push('.');
      } else tiles.push(g);
    }),
  );
  return { tiles, spawns, wrap };
}

export const glyph = (s: Stage, c: number, r: number) => {
  if (c < 0 || c >= COLS) return '#';
  if (s.wrap) r = ((r % ROWS) + ROWS) % ROWS;
  if (r < 0) return '.';
  if (r >= ROWS) return '#';
  return s.tiles[r * COLS + c];
};

/** Collision query: walls at the sides, a lid above non-wrapping stages, wrap-around otherwise. */
export function stageQuery(s: Stage): TileQuery {
  return {
    size: T,
    at(c, r): Solidity {
      if (c < 0 || c >= COLS) return SOLID;
      if (!s.wrap && (r < 0 || r >= ROWS)) return SOLID;
      const g = glyph(s, c, r);
      return g === '#' ? SOLID : g === '=' ? ONEWAY : EMPTY;
    },
  };
}

/** A cell an actor can stand in: free, with a floor or ledge directly below. */
export function standable(s: Stage, c: number, r: number): boolean {
  const here = glyph(s, c, r);
  if (here === '#') return false;
  if (!s.wrap && r >= ROWS - 1) return false;
  const below = glyph(s, c, r + 1);
  return below === '#' || below === '=';
}

/**
 * Cells reachable on foot from a start cell, using simple arcade movement:
 * walk along a floor, walk off its end and drop, or jump up to `jumpRows`
 * rows (through ledges, never through solid blocks) and a couple of columns
 * sideways. Used by tests to prove every ledge of a stage can be reached.
 */
export function reachableCells(s: Stage, start: [number, number], jumpRows = 3, jumpCols = 2): Set<string> {
  const key = (c: number, r: number) => `${c},${((r % ROWS) + ROWS) % ROWS}`;
  const seen = new Set<string>();
  const queue: [number, number][] = [];
  const push = (c: number, r: number) => {
    r = s.wrap ? ((r % ROWS) + ROWS) % ROWS : r;
    const k = key(c, r);
    if (!seen.has(k) && standable(s, c, r)) {
      seen.add(k);
      queue.push([c, r]);
    }
  };
  const fallFrom = (c: number, r: number) => {
    // Drop from (c, r), steering sideways on the way down: about one column
    // for every two rows fallen (wrapping at most once round).
    let lo = c;
    let hi = c;
    for (let k = 0; k < ROWS * 2; k++) {
      const rr = r + k;
      if (k > 0 && k % 2 === 0) {
        lo = Math.max(1, lo - 1);
        hi = Math.min(COLS - 2, hi + 1);
      }
      let open = false;
      for (let cc = lo; cc <= hi; cc++) {
        if (glyph(s, cc, rr) === '#') continue;
        open = true;
        if (k > 0 && standable(s, cc, rr)) push(cc, rr);
      }
      if (!open) return;
      // Landing on the column directly below ends the fall.
      if (k > 0 && standable(s, c, rr)) return;
    }
  };
  push(start[0], start[1]);
  while (queue.length) {
    const [c, r] = queue.shift()!;
    for (const dc of [-1, 1]) {
      const nc = c + dc;
      if (glyph(s, nc, r) === '#') continue;
      if (standable(s, nc, r)) push(nc, r);
      else fallFrom(nc, r);
    }
    // Running jumps across a gap: up to three columns, landing level or lower.
    for (const dc of [-3, -2, 2, 3]) {
      const nc = c + dc;
      if (nc <= 0 || nc >= COLS - 1) continue;
      let clear = true;
      for (let k = 1; k <= Math.abs(dc); k++) if (glyph(s, c + Math.sign(dc) * k, r - 1) === '#' || glyph(s, c + Math.sign(dc) * k, r) === '#') clear = false;
      if (!clear) continue;
      if (standable(s, nc, r)) push(nc, r);
      else fallFrom(nc, r);
    }
    // Jumps: rise through the column, then drift sideways.
    for (let up = 1; up <= jumpRows; up++) {
      if (glyph(s, c, r - up) === '#') break;
      for (let dc = -jumpCols; dc <= jumpCols; dc++) {
        const nc = c + dc;
        if (nc <= 0 || nc >= COLS - 1) continue;
        let clear = true;
        for (let k = 0; k <= up; k++) if (glyph(s, nc, r - k) === '#') clear = false;
        if (clear && standable(s, nc, r - up)) push(nc, r - up);
        if (clear) fallFrom(nc, r - up);
      }
    }
  }
  return seen;
}

/** Every ledge cell (a standable cell) of the stage. */
export function allStandable(s: Stage): [number, number][] {
  const out: [number, number][] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 1; c < COLS - 1; c++) if (standable(s, c, r)) out.push([c, r]);
  return out;
}
