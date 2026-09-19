import { evaluate5, pokerRank } from '../_shared/cards/poker';
import type { Card } from '../_shared/cards/deck';

/**
 * Which cards to throw away in five-card draw. Made hands stand pat, pairs
 * and trips keep their sets, four-card flushes and open straights draw one,
 * otherwise keep the high cards (at most three cards, or four with an ace).
 */
export function discards(hand: Card[]): number[] {
  const v = evaluate5(hand);
  if ([4, 5, 6, 7, 8].includes(v.category)) return [];
  const ranks = hand.map(pokerRank);
  const count = (r: number) => ranks.filter((x) => x === r).length;
  if (v.category >= 1) return hand.map((_, i) => i).filter((i) => count(ranks[i]) === 1);
  // Four to a flush.
  for (const suit of ['spades', 'hearts', 'diamonds', 'clubs']) {
    const idx = hand.map((c, i) => (c.suit === suit ? -1 : i)).filter((i) => i >= 0);
    if (idx.length === 1) return idx;
  }
  // Four to an open-ended straight.
  const sorted = [...new Set(ranks)].sort((a, b) => a - b);
  for (let i = 0; i + 3 < sorted.length; i++) {
    if (sorted[i + 3] - sorted[i] === 3 && sorted[i + 3] < 14) {
      const keep = new Set(sorted.slice(i, i + 4));
      return hand.map((_, k) => k).filter((k) => !keep.has(ranks[k]));
    }
  }
  // Keep the top two cards (or ace plus a kicker), draw three.
  const order = hand.map((_, i) => i).sort((a, b) => ranks[b] - ranks[a]);
  if (ranks[order[0]] === 14 && ranks[order[1]] < 11) return order.slice(1);
  return order.slice(2);
}

/** Rough chance-to-win score between 0 and 1, used by the computer's betting. */
export function strength(hand: Card[]): number {
  const v = evaluate5(hand);
  const base = [0.08, 0.42, 0.62, 0.74, 0.82, 0.86, 0.93, 0.97, 0.99][v.category];
  const top = v.kickers[0] ?? 2;
  return Math.min(0.995, base + (v.category <= 1 ? (top - 2) / 12 * (v.category === 0 ? 0.22 : 0.15) : 0));
}

export type Level = 'easy' | 'normal' | 'hard';

/** Whether the computer calls a bet. */
export function cpuCalls(hand: Card[], level: Level, rand: () => number = Math.random): boolean {
  const s = strength(hand);
  const threshold = { easy: 0.25, normal: 0.4, hard: 0.36 }[level];
  if (s >= threshold) return true;
  return rand() < { easy: 0.35, normal: 0.12, hard: 0.18 }[level];
}

/** Whether the computer bets when checked to. */
export function cpuBets(hand: Card[], level: Level, rand: () => number = Math.random): boolean {
  const s = strength(hand);
  if (s >= { easy: 0.7, normal: 0.58, hard: 0.55 }[level]) return true;
  return rand() < { easy: 0.05, normal: 0.1, hard: 0.16 }[level];
}
