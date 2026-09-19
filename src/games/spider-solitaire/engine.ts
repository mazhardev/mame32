import { shuffleDeck } from '../_shared/cards/deck';
import type { Card, Suit } from '../_shared/cards/deck';

export interface SpiderState {
  columns: Card[][];
  stock: Card[];
  /** Completed King-to-Ace runs removed from play. */
  done: Suit[];
  moves: number;
}

const SUIT_SETS: Record<1 | 2 | 4, Suit[]> = { 1: ['spades'], 2: ['spades', 'hearts'], 4: ['spades', 'hearts', 'diamonds', 'clubs'] };

/** 104 cards: two decks' worth, drawn from 1, 2 or 4 suits. */
export function deal(suits: 1 | 2 | 4, rand: () => number = Math.random): SpiderState {
  const set = SUIT_SETS[suits];
  const cards: Card[] = [];
  for (let copy = 0; copy < 8 / set.length; copy++) {
    for (const suit of set) for (let rank = 1; rank <= 13; rank++) cards.push({ id: `${copy}-${suit}-${rank}`, suit, rank, faceUp: false });
  }
  const deck = shuffleDeck(cards, rand);
  const columns: Card[][] = Array.from({ length: 10 }, (_, i) => deck.splice(0, i < 4 ? 6 : 5));
  for (const col of columns) col[col.length - 1] = { ...col[col.length - 1], faceUp: true };
  return { columns, stock: deck, done: [], moves: 0 };
}

/** True if cards[i..] is a face-up, same-suit, descending run. */
export function isRun(col: Card[], i: number): boolean {
  if (!col[i]?.faceUp) return false;
  for (let k = i; k < col.length - 1; k++) {
    if (col[k + 1].suit !== col[k].suit || col[k + 1].rank !== col[k].rank - 1) return false;
  }
  return true;
}

/** Removes any completed King→Ace run and flips newly exposed cards. */
function tidy(s: SpiderState): { state: SpiderState; completed: number } {
  const columns = s.columns.map((c) => [...c]);
  const done = [...s.done];
  let completed = 0;
  for (const col of columns) {
    if (col.length >= 13) {
      const start = col.length - 13;
      if (col[start].rank === 13 && isRun(col, start)) {
        done.push(col[start].suit);
        col.splice(start, 13);
        completed++;
      }
    }
    if (col.length && !col[col.length - 1].faceUp) col[col.length - 1] = { ...col[col.length - 1], faceUp: true };
  }
  return { state: { ...s, columns, done }, completed };
}

export function canMove(s: SpiderState, from: number, index: number, to: number): boolean {
  if (from === to || !isRun(s.columns[from], index)) return false;
  const target = s.columns[to];
  if (!target.length) return true;
  return target[target.length - 1].rank === s.columns[from][index].rank + 1;
}

export function move(s: SpiderState, from: number, index: number, to: number): { state: SpiderState; completed: number } | null {
  if (!canMove(s, from, index, to)) return null;
  const columns = s.columns.map((c) => [...c]);
  const run = columns[from].splice(index);
  columns[to].push(...run);
  return tidy({ ...s, columns, moves: s.moves + 1 });
}

/** Deals one card face up onto every column. Not allowed while a column is empty. */
export function dealRow(s: SpiderState): { state: SpiderState; completed: number } | null {
  if (!s.stock.length || s.columns.some((c) => !c.length)) return null;
  const stock = [...s.stock];
  const columns = s.columns.map((c) => [...c, { ...(stock.shift() as Card), faceUp: true }]);
  return tidy({ ...s, columns, stock, moves: s.moves + 1 });
}

export const won = (s: SpiderState) => s.done.length === 8;

/** Suggests a move: prefer same-suit joins, then any legal build. */
export function hint(s: SpiderState): { from: number; index: number; to: number } | null {
  let fallback: { from: number; index: number; to: number } | null = null;
  for (let from = 0; from < 10; from++) {
    const col = s.columns[from];
    let index = col.length - 1;
    while (index > 0 && isRun(col, index - 1)) index--;
    if (index < 0 || !col.length) continue;
    for (let to = 0; to < 10; to++) {
      if (!s.columns[to].length || !canMove(s, from, index, to)) continue;
      const target = s.columns[to][s.columns[to].length - 1];
      if (target.suit === col[index].suit) return { from, index, to };
      // Moving a whole column onto another pile only helps if it uncovers something.
      if (index > 0 && !fallback) fallback = { from, index, to };
    }
  }
  return fallback;
}
