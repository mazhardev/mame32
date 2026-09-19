import type { Card } from './deck';

/** Poker hand categories, weakest to strongest. */
export const HAND_NAMES = ['High card', 'One pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'] as const;

/** Ace counts high (14) in poker. */
export const pokerRank = (c: Card) => (c.rank === 1 ? 14 : c.rank);

export interface HandValue {
  category: number;
  /** Tie-breakers, most significant first. */
  kickers: number[];
  name: string;
}

/** Evaluates exactly five cards. */
export function evaluate5(cards: Card[]): HandValue {
  const ranks = cards.map(pokerRank).sort((a, b) => b - a);
  const flush = cards.every((c) => c.suit === cards[0].suit);
  const unique = [...new Set(ranks)];
  let straightHigh = 0;
  if (unique.length === 5) {
    if (ranks[0] - ranks[4] === 4) straightHigh = ranks[0];
    else if (ranks.join() === '14,5,4,3,2') straightHigh = 5; // the wheel
  }
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  // Group by count, then by rank.
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const byGroup = groups.map(([r]) => r);
  let category: number;
  let kickers: number[];
  if (straightHigh && flush) [category, kickers] = [8, [straightHigh]];
  else if (groups[0][1] === 4) [category, kickers] = [7, byGroup];
  else if (groups[0][1] === 3 && groups[1][1] === 2) [category, kickers] = [6, byGroup];
  else if (flush) [category, kickers] = [5, ranks];
  else if (straightHigh) [category, kickers] = [4, [straightHigh]];
  else if (groups[0][1] === 3) [category, kickers] = [3, byGroup];
  else if (groups[0][1] === 2 && groups[1][1] === 2) [category, kickers] = [2, byGroup];
  else if (groups[0][1] === 2) [category, kickers] = [1, byGroup];
  else [category, kickers] = [0, ranks];
  return { category, kickers, name: HAND_NAMES[category] };
}

/** Three-card hands rank straights above flushes, as in three-card poker. */
export const THREE_NAMES = ['High card', 'Pair', 'Flush', 'Straight', 'Three of a kind', 'Straight flush'] as const;

export function evaluate3(cards: Card[]): HandValue {
  const ranks = cards.map(pokerRank).sort((a, b) => b - a);
  const flush = cards.every((c) => c.suit === cards[0].suit);
  let straightHigh = 0;
  if (new Set(ranks).size === 3) {
    if (ranks[0] - ranks[2] === 2) straightHigh = ranks[0];
    else if (ranks.join() === '14,3,2') straightHigh = 3;
  }
  let category: number;
  let kickers = ranks;
  if (straightHigh && flush) [category, kickers] = [5, [straightHigh]];
  else if (ranks[0] === ranks[2]) category = 4;
  else if (straightHigh) [category, kickers] = [3, [straightHigh]];
  else if (flush) category = 2;
  else if (ranks[0] === ranks[1] || ranks[1] === ranks[2]) {
    const pair = ranks[1];
    kickers = [pair, ranks[0] === ranks[1] ? ranks[2] : ranks[0]];
    category = 1;
  } else category = 0;
  return { category, kickers, name: THREE_NAMES[category] };
}

/** Positive if a beats b, negative if b wins, 0 for a tie. */
export function compareHands(a: HandValue, b: HandValue): number {
  if (a.category !== b.category) return a.category - b.category;
  for (let i = 0; i < Math.max(a.kickers.length, b.kickers.length); i++) {
    const d = (a.kickers[i] ?? 0) - (b.kickers[i] ?? 0);
    if (d) return d;
  }
  return 0;
}
