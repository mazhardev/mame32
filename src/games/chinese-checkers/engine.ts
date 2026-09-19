import { WIN } from '../_shared/board/search';
import type { SearchGame } from '../_shared/board/search';

/**
 * Two-player Chinese checkers on the 121-hole star, using cube coordinates
 * (x + y + z = 0). The star is the union of two big triangles: all coords
 * ≥ −4, or all coords ≤ 4. Player 1 starts in the bottom arm (z > 4) and
 * races to the top arm (z < −4); player 2 does the reverse.
 */
export interface Cell {
  x: number;
  y: number;
  z: number;
}

export const CELLS: Cell[] = [];
for (let x = -8; x <= 8; x++) {
  for (let y = -8; y <= 8; y++) {
    const z = -x - y;
    const t1 = x >= -4 && y >= -4 && z >= -4;
    const t2 = x <= 4 && y <= 4 && z <= 4;
    if (t1 || t2) CELLS.push({ x, y, z });
  }
}
const indexOf = new Map(CELLS.map((c, i) => [`${c.x},${c.y},${c.z}`, i]));
const at = (x: number, y: number, z: number) => indexOf.get(`${x},${y},${z}`) ?? -1;

const DIRS: [number, number, number][] = [
  [1, -1, 0],
  [1, 0, -1],
  [0, 1, -1],
  [-1, 1, 0],
  [-1, 0, 1],
  [0, -1, 1],
];
/** For each cell and direction: [adjacent cell, cell beyond it] (−1 if off the board). */
const STEPS = CELLS.map((c) => DIRS.map(([dx, dy, dz]) => [at(c.x + dx, c.y + dy, c.z + dz), at(c.x + 2 * dx, c.y + 2 * dy, c.z + 2 * dz)] as const));

export const HOME: Record<1 | 2, number[]> = {
  1: CELLS.map((c, i) => (c.z > 4 ? i : -1)).filter((i) => i >= 0),
  2: CELLS.map((c, i) => (c.z < -4 ? i : -1)).filter((i) => i >= 0),
};
export const TARGET: Record<1 | 2, number[]> = { 1: HOME[2], 2: HOME[1] };
const TIP: Record<1 | 2, Cell> = { 1: { x: 4, y: 4, z: -8 }, 2: { x: -4, y: -4, z: 8 } };

export interface CCState {
  board: Int8Array;
  turn: 1 | 2;
  plies: number;
}
export interface CCMove {
  from: number;
  to: number;
  /** Cells visited, including from and to. */
  path: number[];
}

export function initial(): CCState {
  const board = new Int8Array(CELLS.length);
  for (const i of HOME[1]) board[i] = 1;
  for (const i of HOME[2]) board[i] = 2;
  return { board, turn: 1, plies: 0 };
}

/** Every destination for the piece on `from`: single steps plus chains of jumps. */
export function movesFrom(board: Int8Array, from: number): CCMove[] {
  const out: CCMove[] = [];
  for (const [adj] of STEPS[from]) if (adj >= 0 && !board[adj]) out.push({ from, to: adj, path: [from, adj] });
  const seen = new Set([from]);
  const queue: number[][] = [[from]];
  while (queue.length) {
    const path = queue.shift() as number[];
    const cur = path[path.length - 1];
    for (const [adj, beyond] of STEPS[cur]) {
      if (adj < 0 || beyond < 0 || !board[adj] || (board[beyond] && beyond !== from) || seen.has(beyond)) continue;
      seen.add(beyond);
      const next = [...path, beyond];
      if (beyond !== from) out.push({ from, to: beyond, path: next });
      queue.push(next);
    }
  }
  return out;
}

export function legalMoves(s: CCState): CCMove[] {
  const out: CCMove[] = [];
  for (let i = 0; i < s.board.length; i++) if (s.board[i] === s.turn) out.push(...movesFrom(s.board, i));
  return out;
}

export function apply(s: CCState, m: CCMove): CCState {
  const board = s.board.slice();
  board[m.to] = board[m.from];
  board[m.from] = 0;
  return { board, turn: s.turn === 1 ? 2 : 1, plies: s.plies + 1 };
}

/**
 * A player wins when every target hole is filled and at least one of them
 * holds their own piece — so parking a piece at home cannot block a win.
 */
export function winner(board: Int8Array): 1 | 2 | null {
  for (const p of [1, 2] as const) {
    const t = TARGET[p];
    if (t.every((i) => board[i]) && t.some((i) => board[i] === p)) return p;
  }
  return null;
}

const dist = (a: Cell, b: Cell) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));

/** Total distance of a player's pieces from their target tip; lower is better. */
export function remaining(board: Int8Array, p: 1 | 2): number {
  let d = 0;
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== p) continue;
    const k = dist(CELLS[i], TIP[p]);
    // Pieces already packed deep in the target count as done.
    d += TARGET[p].includes(i) ? Math.max(0, k - 3) : k;
  }
  return d;
}

export const ccGame: SearchGame<CCState, CCMove> = {
  moves(s) {
    if (winner(s.board)) return [];
    const p = s.turn;
    const tipZ = TIP[p].z;
    // Prefer forward moves; they are searched first and prune better.
    return legalMoves(s).sort((a, b) => Math.abs(CELLS[a.to].z - tipZ) - Math.abs(CELLS[a.from].z - tipZ) - (Math.abs(CELLS[b.to].z - tipZ) - Math.abs(CELLS[b.from].z - tipZ)));
  },
  play: apply,
  terminal(s) {
    const w = winner(s.board);
    if (!w) return s.plies >= 400 ? 0 : null;
    return w === s.turn ? WIN : -WIN;
  },
  evaluate(s) {
    const them = s.turn === 1 ? 2 : 1;
    return remaining(s.board, them) - remaining(s.board, s.turn);
  },
};
