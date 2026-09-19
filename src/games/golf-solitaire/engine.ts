import { buildDeck, shuffleDeck } from '../_shared/cards/deck';
import type { Card } from '../_shared/cards/deck';
import { adjacent } from '../_shared/cards/sequence';

/** Golf: seven columns of five face-up cards; play the bottom card of any column onto the waste. */
export interface GolfState {
  columns: Card[][];
  stock: Card[];
  waste: Card[];
}

export function deal(rand: () => number = Math.random): GolfState {
  const d = shuffleDeck(buildDeck(1, true), rand);
  const columns = Array.from({ length: 7 }, (_, i) => d.slice(i * 5, i * 5 + 5));
  const rest = d.slice(35);
  return { columns, stock: rest.slice(1), waste: [rest[0]] };
}

/**
 * Traditional Golf allows nothing on a King; `kingRule` false lets a Queen
 * or (with wrap) an Ace follow it.
 */
export function canPlay(s: GolfState, col: number, wrap: boolean, kingRule: boolean): boolean {
  const column = s.columns[col];
  const card = column[column.length - 1];
  const top = s.waste[s.waste.length - 1];
  if (!card || !top) return false;
  if (kingRule && top.rank === 13) return false;
  return adjacent(card, top, wrap);
}

export function play(s: GolfState, col: number, wrap: boolean, kingRule: boolean): GolfState | null {
  if (!canPlay(s, col, wrap, kingRule)) return null;
  const columns = s.columns.map((c) => [...c]);
  const card = columns[col].pop() as Card;
  return { ...s, columns, waste: [...s.waste, card] };
}

export function flip(s: GolfState): GolfState | null {
  if (!s.stock.length) return null;
  return { ...s, stock: s.stock.slice(1), waste: [...s.waste, s.stock[0]] };
}

export const remaining = (s: GolfState) => s.columns.reduce((n, c) => n + c.length, 0);

export const stuck = (s: GolfState, wrap: boolean, kingRule: boolean) => !s.stock.length && s.columns.every((_, i) => !canPlay(s, i, wrap, kingRule));
