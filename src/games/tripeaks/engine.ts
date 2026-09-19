import { buildDeck, shuffleDeck } from '../_shared/cards/deck';
import type { Card } from '../_shared/cards/deck';
import { adjacent } from '../_shared/cards/sequence';

/**
 * TriPeaks: three overlapping peaks of 28 cards. Positions are given in
 * half-card columns (x) and rows (y); a card is covered by the cards in the
 * next row that sit half a card to either side of it.
 */
export interface Slot {
  x: number;
  y: number;
}
export const SLOTS: Slot[] = [
  ...[1.5, 4.5, 7.5].map((x) => ({ x, y: 0 })),
  ...[1, 2, 4, 5, 7, 8].map((x) => ({ x, y: 1 })),
  ...Array.from({ length: 9 }, (_, i) => ({ x: i + 0.5, y: 2 })),
  ...Array.from({ length: 10 }, (_, i) => ({ x: i, y: 3 })),
];

export interface TPState {
  tableau: (Card | null)[];
  stock: Card[];
  waste: Card[];
  streak: number;
  bestStreak: number;
  score: number;
}

export function deal(rand: () => number = Math.random): TPState {
  const d = shuffleDeck(buildDeck(1, true), rand);
  const stock = d.slice(28);
  return { tableau: d.slice(0, 28), stock: stock.slice(1), waste: [stock[0]], streak: 0, bestStreak: 0, score: 0 };
}

export function isFree(t: (Card | null)[], i: number): boolean {
  if (!t[i]) return false;
  const s = SLOTS[i];
  return !SLOTS.some((o, k) => t[k] && o.y === s.y + 1 && Math.abs(o.x - s.x) === 0.5);
}

/** Plays tableau card i onto the waste. Longer streaks score more per card. */
export function play(s: TPState, i: number, wrap: boolean): TPState | null {
  const card = s.tableau[i];
  const top = s.waste[s.waste.length - 1];
  if (!card || !isFree(s.tableau, i) || !top || !adjacent(card, top, wrap)) return null;
  const tableau = [...s.tableau];
  tableau[i] = null;
  const streak = s.streak + 1;
  // Clearing a peak's top card is worth a bonus.
  const peakBonus = SLOTS[i].y === 0 ? 250 : 0;
  return { ...s, tableau, waste: [...s.waste, card], streak, bestStreak: Math.max(s.bestStreak, streak), score: s.score + streak * 10 + peakBonus };
}

export function flip(s: TPState): TPState | null {
  if (!s.stock.length) return null;
  return { ...s, stock: s.stock.slice(1), waste: [...s.waste, s.stock[0]], streak: 0 };
}

export const cleared = (s: TPState) => s.tableau.every((c) => !c);

export function canPlayAny(s: TPState, wrap: boolean): boolean {
  return s.tableau.some((_, i) => play(s, i, wrap) !== null);
}
