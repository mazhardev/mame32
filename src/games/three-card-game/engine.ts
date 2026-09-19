import { compareHands, evaluate3, pokerRank } from '../_shared/cards/poker';
import type { Card } from '../_shared/cards/deck';

/** Dealer needs queen-high or better to "qualify". */
export function qualifies(dealer: Card[]): boolean {
  const v = evaluate3(dealer);
  return v.category > 0 || v.kickers[0] >= 12;
}

/** Ante bonus multiplier paid on straights or better, win or lose. */
export function anteBonus(hand: Card[]): number {
  return [0, 0, 0, 1, 4, 5][evaluate3(hand).category];
}

/** The classic simple strategy: play with queen-six-four or better. */
export function shouldPlay(hand: Card[]): boolean {
  const v = evaluate3(hand);
  if (v.category > 0) return true;
  const [a, b, c] = hand.map(pokerRank).sort((x, y) => y - x);
  if (a !== 12) return a > 12;
  if (b !== 6) return b > 6;
  return c >= 4;
}

export interface Settlement {
  net: number;
  outcome: 'fold' | 'no-qualify' | 'win' | 'lose' | 'push';
  bonus: number;
}

/** Net result for an ante of `ante` (and a matching play bet unless folded). */
export function settle(player: Card[], dealer: Card[], ante: number, folded: boolean): Settlement {
  if (folded) return { net: -ante, outcome: 'fold', bonus: 0 };
  const bonus = anteBonus(player) * ante;
  if (!qualifies(dealer)) return { net: ante + bonus, outcome: 'no-qualify', bonus };
  const cmp = compareHands(evaluate3(player), evaluate3(dealer));
  if (cmp > 0) return { net: ante * 2 + bonus, outcome: 'win', bonus };
  if (cmp < 0) return { net: -ante * 2 + bonus, outcome: 'lose', bonus };
  return { net: bonus, outcome: 'push', bonus };
}
