import type { Card } from '../_shared/cards/deck';

/** Aces are high in Higher or Lower. */
export const hlRank = (c: Card) => (c.rank === 1 ? 14 : c.rank);

export type Guess = 'higher' | 'lower';
export type Outcome = 'right' | 'wrong' | 'tie';

export function judge(current: Card, next: Card, guess: Guess): Outcome {
  const a = hlRank(current);
  const b = hlRank(next);
  if (a === b) return 'tie';
  return (b > a) === (guess === 'higher') ? 'right' : 'wrong';
}

/** Chance that `guess` is right given the unseen cards (ties count as not right). */
export function odds(current: Card, unseen: Card[], guess: Guess): number {
  if (!unseen.length) return 0;
  const a = hlRank(current);
  const good = unseen.filter((c) => (guess === 'higher' ? hlRank(c) > a : hlRank(c) < a)).length;
  return good / unseen.length;
}

/** Riskier correct guesses earn more: 10 points scaled by how unlikely they were. */
export function points(chance: number): number {
  return Math.max(5, Math.round(10 / Math.max(chance, 0.08)));
}
