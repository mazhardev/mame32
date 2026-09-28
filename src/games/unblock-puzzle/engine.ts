/**
 * Unblock: slide blocks along their length on a 6×6 board until the key
 * block (piece 0, horizontal on row 2) can slide out through the gap on the
 * right edge. A move slides one block any distance.
 *
 * Levels are strings of 36 characters: '.' empty, 'a' the key block, and
 * other letters for the remaining blocks.
 */
export const SIZE = 6;
export const EXIT_ROW = 2;

export interface Piece {
  row: number;
  col: number;
  len: number;
  horizontal: boolean;
}

export function parse(level: string): Piece[] {
  const letters = [...new Set(level.replace(/\./g, ''))].sort((a, b) =>
    a === 'a' ? -1 : b === 'a' ? 1 : a.localeCompare(b),
  );
  return letters.map((ch) => {
    const cells = [...level].flatMap((c, i) => (c === ch ? [i] : []));
    const row = Math.floor(cells[0] / SIZE);
    const col = cells[0] % SIZE;
    const horizontal = cells.length > 1 && cells[1] === cells[0] + 1;
    return { row, col, len: cells.length, horizontal };
  });
}

export function serialize(pieces: Piece[]): string {
  const grid = Array<string>(SIZE * SIZE).fill('.');
  pieces.forEach((p, k) => {
    const ch = k === 0 ? 'a' : String.fromCharCode(98 + k - 1);
    cellsOf(p).forEach((c) => (grid[c] = ch));
  });
  return grid.join('');
}

export function cellsOf(p: Piece): number[] {
  return Array.from({ length: p.len }, (_, i) =>
    p.horizontal ? p.row * SIZE + p.col + i : (p.row + i) * SIZE + p.col,
  );
}

function occupancy(pieces: Piece[]): Int8Array {
  const occ = new Int8Array(SIZE * SIZE).fill(-1);
  pieces.forEach((p, k) => cellsOf(p).forEach((c) => (occ[c] = k)));
  return occ;
}

/** How far piece k can slide backwards (negative) and forwards (positive). */
export function slideRange(pieces: Piece[], k: number): [number, number] {
  const occ = occupancy(pieces);
  const p = pieces[k];
  const at = (i: number) => (p.horizontal ? p.row * SIZE + i : i * SIZE + p.col);
  const start = p.horizontal ? p.col : p.row;
  let back = 0;
  for (let i = start - 1; i >= 0 && occ[at(i)] === -1; i--) back--;
  let fwd = 0;
  for (let i = start + p.len; i < SIZE && occ[at(i)] === -1; i++) fwd++;
  return [back, fwd];
}

export function slide(pieces: Piece[], k: number, by: number): Piece[] | null {
  if (by === 0) return null;
  const [back, fwd] = slideRange(pieces, k);
  if (by < back || by > fwd) return null;
  return pieces.map((p, j) =>
    j !== k ? p : p.horizontal ? { ...p, col: p.col + by } : { ...p, row: p.row + by },
  );
}

/** The key block has reached the exit. */
export function isSolved(pieces: Piece[]): boolean {
  const key = pieces[0];
  return key.col + key.len === SIZE;
}

/** Compact state key: each piece's moving coordinate. */
function key(pieces: Piece[]): string {
  return pieces.map((p) => (p.horizontal ? p.col : p.row)).join('');
}

/**
 * Breadth-first search for the fewest moves to free the key block.
 * Returns the move list as [piece, offset] pairs, or null if unsolvable.
 */
export function solve(start: Piece[], limit = 300_000): [number, number][] | null {
  if (isSolved(start)) return [];
  const seen = new Map<string, { prev: string; move: [number, number] } | null>();
  const states = new Map<string, Piece[]>();
  const k0 = key(start);
  seen.set(k0, null);
  states.set(k0, start);
  let frontier = [start];
  while (frontier.length && seen.size < limit) {
    const next: Piece[][] = [];
    for (const s of frontier) {
      const sk = key(s);
      for (let k = 0; k < s.length; k++) {
        const [back, fwd] = slideRange(s, k);
        for (let by = back; by <= fwd; by++) {
          if (!by) continue;
          const t = slide(s, k, by)!;
          const tk = key(t);
          if (seen.has(tk)) continue;
          seen.set(tk, { prev: sk, move: [k, by] });
          if (isSolved(t)) {
            const moves: [number, number][] = [];
            let cur: string = tk;
            let link = seen.get(cur);
            while (link) {
              moves.unshift(link.move);
              cur = link.prev;
              link = seen.get(cur);
            }
            return moves;
          }
          next.push(t);
        }
      }
    }
    frontier = next;
  }
  return null;
}

export function validPieces(value: unknown): value is Piece[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) return false;
  const ok = value.every(
    (p) =>
      typeof p === 'object' &&
      p !== null &&
      Number.isInteger(p.row) &&
      Number.isInteger(p.col) &&
      (p.len === 2 || p.len === 3) &&
      typeof p.horizontal === 'boolean' &&
      p.row >= 0 &&
      p.col >= 0 &&
      (p.horizontal ? p.col + p.len <= SIZE && p.row < SIZE : p.row + p.len <= SIZE && p.col < SIZE),
  );
  if (!ok) return false;
  const occ = new Set<number>();
  for (const p of value as Piece[]) {
    for (const c of cellsOf(p)) {
      if (occ.has(c)) return false;
      occ.add(c);
    }
  }
  const key0 = (value as Piece[])[0];
  return key0.horizontal && key0.row === EXIT_ROW && key0.len === 2;
}
