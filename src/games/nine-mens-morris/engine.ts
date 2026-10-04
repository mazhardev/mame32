import type { SearchGame } from '../_shared/board/search';
import { WIN } from '../_shared/board/search';

/**
 * Nine Men's Morris.
 *
 * Points are numbered 0–23 row by row across the three nested squares.
 * Phase 1: players alternately place their nine men. Phase 2: men slide to an
 * adjacent empty point. A player reduced to three men may "fly" to any empty
 * point. Forming a mill (three in a line) removes an opponent man, which may
 * not come from a mill unless every opponent man is in one. A player with
 * fewer than three men, or with no legal move, loses. Fifty moves in a row
 * without a capture during the moving phase is a draw.
 */
export type Player = 1 | 2;
export type Cell = 0 | Player;

export interface MorrisState {
  board: Cell[];
  turn: Player;
  inHand: [number, number];
  /** Moves since the last capture once both players have placed all men. */
  quiet: number;
}

export interface Move {
  /** -1 when placing from the hand. */
  from: number;
  to: number;
  /** Opponent man removed by the mill this move forms, or -1. */
  remove: number;
}

/** [x, y] on a 7×7 grid, for drawing. */
export const POINTS: [number, number][] = [
  [0, 0], [3, 0], [6, 0],
  [1, 1], [3, 1], [5, 1],
  [2, 2], [3, 2], [4, 2],
  [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3],
  [2, 4], [3, 4], [4, 4],
  [1, 5], [3, 5], [5, 5],
  [0, 6], [3, 6], [6, 6],
];

export const MILLS: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], [9, 10, 11], [12, 13, 14], [15, 16, 17], [18, 19, 20], [21, 22, 23],
  [0, 9, 21], [3, 10, 18], [6, 11, 15], [1, 4, 7], [16, 19, 22], [8, 12, 17], [5, 13, 20], [2, 14, 23],
];

/** Lines on the board: every adjacent pair of points. */
export const EDGES: [number, number][] = [];
for (const [a, b, c] of MILLS) EDGES.push([a, b], [b, c]);

export const ADJ: number[][] = Array.from({ length: 24 }, () => []);
for (const [a, b] of EDGES) {
  ADJ[a].push(b);
  ADJ[b].push(a);
}

const MILLS_AT: number[][][] = Array.from({ length: 24 }, (_, p) => MILLS.filter((m) => m.includes(p)));

export const DRAW_AFTER = 50;
export const other = (p: Player): Player => (p === 1 ? 2 : 1);

export function initial(): MorrisState {
  return { board: Array(24).fill(0), turn: 1, inHand: [9, 9], quiet: 0 };
}

export const count = (s: MorrisState, p: Player) => s.board.filter((c) => c === p).length;
const hand = (s: MorrisState, p: Player) => s.inHand[p - 1];
/** Men a player still has, on the board and in hand. */
export const material = (s: MorrisState, p: Player) => count(s, p) + hand(s, p);

export function inMill(board: Cell[], point: number): boolean {
  const p = board[point];
  return p !== 0 && MILLS_AT[point].some((m) => m.every((i) => board[i] === p));
}

/** Points the mover could take after forming a mill. */
export function removable(board: Cell[], victim: Player): number[] {
  const theirs = board.flatMap((c, i) => (c === victim ? [i] : []));
  const free = theirs.filter((i) => !inMill(board, i));
  return free.length ? free : theirs;
}

function withRemovals(board: Cell[], me: Player, from: number, to: number): Move[] {
  const next = [...board];
  if (from >= 0) next[from] = 0;
  next[to] = me;
  if (!inMill(next, to)) return [{ from, to, remove: -1 }];
  return removable(next, other(me)).map((r) => ({ from, to, remove: r }));
}

export function legalMoves(s: MorrisState): Move[] {
  if (winner(s) !== null) return [];
  const me = s.turn;
  const moves: Move[] = [];
  const empty = s.board.flatMap((c, i) => (c === 0 ? [i] : []));
  if (hand(s, me) > 0) {
    for (const to of empty) moves.push(...withRemovals(s.board, me, -1, to));
    return moves;
  }
  const flying = count(s, me) === 3;
  for (let from = 0; from < 24; from++) {
    if (s.board[from] !== me) continue;
    const targets = flying ? empty : ADJ[from].filter((t) => s.board[t] === 0);
    for (const to of targets) moves.push(...withRemovals(s.board, me, from, to));
  }
  return moves;
}

export function play(s: MorrisState, m: Move): MorrisState {
  const board = [...s.board];
  const inHand: [number, number] = [...s.inHand];
  if (m.from < 0) inHand[s.turn - 1] -= 1;
  else board[m.from] = 0;
  board[m.to] = s.turn;
  if (m.remove >= 0) board[m.remove] = 0;
  const placing = inHand[0] + inHand[1] > 0;
  return { board, turn: other(s.turn), inHand, quiet: placing || m.remove >= 0 ? 0 : s.quiet + 1 };
}

/** 1 or 2 for a winner, 0 for a draw, null while the game goes on. */
export function winner(s: MorrisState): Player | 0 | null {
  for (const p of [1, 2] as const) if (material(s, p) < 3) return other(p);
  if (s.quiet >= DRAW_AFTER) return 0;
  // A player who cannot move loses (only possible after placing).
  if (hand(s, s.turn) === 0 && count(s, s.turn) > 3) {
    const stuck = s.board.every((c, i) => c !== s.turn || ADJ[i].every((t) => s.board[t] !== 0));
    if (stuck) return other(s.turn);
  }
  return null;
}

function evaluateFor(s: MorrisState, me: Player): number {
  const them = other(me);
  let score = (material(s, me) - material(s, them)) * 100;
  for (const m of MILLS) {
    const mine = m.filter((i) => s.board[i] === me).length;
    const theirs = m.filter((i) => s.board[i] === them).length;
    if (mine === 3) score += 12;
    if (theirs === 3) score -= 12;
    // Open two: one move from a mill.
    if (mine === 2 && theirs === 0) score += 6;
    if (theirs === 2 && mine === 0) score -= 6;
  }
  if (hand(s, me) === 0 && hand(s, them) === 0) {
    const mobility = (p: Player) => s.board.reduce<number>((n, c, i) => n + (c === p ? ADJ[i].filter((t) => s.board[t] === 0).length : 0), 0);
    score += (mobility(me) - mobility(them)) * 2;
  }
  return score;
}

export const morrisGame: SearchGame<MorrisState, Move> = {
  moves: legalMoves,
  play,
  terminal(s) {
    const w = winner(s);
    if (w === null) return null;
    return w === 0 ? 0 : w === s.turn ? WIN : -WIN;
  },
  evaluate: (s) => evaluateFor(s, s.turn),
};

export const sameMove = (a: Move, b: Move) => a.from === b.from && a.to === b.to && a.remove === b.remove;
