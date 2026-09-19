import type { SearchGame } from '../_shared/board/search';
import { WIN } from '../_shared/board/search';

export type Disc = 0 | 1 | 2;
export interface ReversiState {
  board: Disc[];
  turn: 1 | 2;
}

/** Move = square index, or -1 to pass when there is no legal move. */
export type ReversiMove = number;
export const PASS = -1;
const N = 8;
const DIRS = [-9, -8, -7, -1, 1, 7, 8, 9];

export function initial(): ReversiState {
  const board: Disc[] = Array(64).fill(0);
  board[27] = 2;
  board[28] = 1;
  board[35] = 1;
  board[36] = 2;
  return { board, turn: 1 };
}

function step(i: number, d: number): number {
  const c = i % N;
  const next = i + d;
  if (next < 0 || next >= 64) return -1;
  // Prevent wrapping around the board edges.
  if ((d === -1 || d === 7 || d === -9) && c === 0) return -1;
  if ((d === 1 || d === -7 || d === 9) && c === N - 1) return -1;
  return next;
}

/** Discs that would flip if `player` plays at `i`. */
export function flips(board: Disc[], i: number, player: 1 | 2): number[] {
  if (board[i] !== 0) return [];
  const other = player === 1 ? 2 : 1;
  const out: number[] = [];
  for (const d of DIRS) {
    const line: number[] = [];
    let j = step(i, d);
    while (j >= 0 && board[j] === other) {
      line.push(j);
      j = step(j, d);
    }
    if (j >= 0 && board[j] === player && line.length) out.push(...line);
  }
  return out;
}

export function legal(board: Disc[], player: 1 | 2): number[] {
  const out: number[] = [];
  for (let i = 0; i < 64; i++) if (board[i] === 0 && flips(board, i, player).length) out.push(i);
  return out;
}

export function play(s: ReversiState, move: ReversiMove): ReversiState {
  const other = s.turn === 1 ? 2 : 1;
  if (move === PASS) return { board: s.board, turn: other };
  const board = [...s.board];
  board[move] = s.turn;
  for (const f of flips(s.board, move, s.turn)) board[f] = s.turn;
  return { board, turn: other };
}

export function isOver(board: Disc[]): boolean {
  return legal(board, 1).length === 0 && legal(board, 2).length === 0;
}

export function count(board: Disc[], p: 1 | 2): number {
  return board.filter((d) => d === p).length;
}

/** Classic positional weights: corners great, squares next to corners risky. */
const WEIGHTS = [
  100, -20, 10, 5, 5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
  10, -2, 1, 1, 1, 1, -2, 10,
  5, -2, 1, 0, 0, 1, -2, 5,
  5, -2, 1, 0, 0, 1, -2, 5,
  10, -2, 1, 1, 1, 1, -2, 10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10, 5, 5, 10, -20, 100,
];

export const reversiGame: SearchGame<ReversiState, ReversiMove> = {
  moves(s) {
    if (isOver(s.board)) return [];
    const m = legal(s.board, s.turn);
    return m.length ? m.sort((a, b) => WEIGHTS[b] - WEIGHTS[a]) : [PASS];
  },
  play,
  terminal(s) {
    if (!isOver(s.board)) return null;
    const mine = count(s.board, s.turn);
    const theirs = count(s.board, s.turn === 1 ? 2 : 1);
    return mine === theirs ? 0 : mine > theirs ? WIN : -WIN;
  },
  evaluate(s) {
    const me = s.turn;
    const them = me === 1 ? 2 : 1;
    let pos = 0;
    for (let i = 0; i < 64; i++) pos += s.board[i] === me ? WEIGHTS[i] : s.board[i] === them ? -WEIGHTS[i] : 0;
    const mobility = legal(s.board, me).length - legal(s.board, them).length;
    const empties = s.board.filter((d) => d === 0).length;
    // Late in the game, disc count matters most.
    const discs = empties < 12 ? (count(s.board, me) - count(s.board, them)) * 10 : 0;
    return pos + mobility * 8 + discs;
  },
};
