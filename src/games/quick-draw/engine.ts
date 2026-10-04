/**
 * Quick Draw: a western reaction duel. After "Steady…" there is a random
 * pause before "DRAW!". The first to fire after the signal wins the round;
 * firing before it is a foul and loses the round. Best of five.
 */
export type Level = 'easy' | 'normal' | 'hard';
export type Side = 1 | 2;

/** The computer's reaction time in ms, getting quicker each round. */
export function computerReaction(level: Level, round: number, random: () => number): number {
  const base = { easy: 520, normal: 400, hard: 300 }[level];
  return Math.max(170, base - round * 15 + (random() - 0.5) * 120);
}

export function signalDelay(random: () => number): number {
  return 1200 + random() * 2800;
}

export interface Round {
  winner: Side;
  reason: 'faster' | 'foul';
  ms: number | null;
}

/** Resolves a round from both players' fire times (ms after the signal; negative = early). */
export function resolve(p1: number | null, p2: number | null): Round {
  if (p1 !== null && p1 < 0) return { winner: 2, reason: 'foul', ms: null };
  if (p2 !== null && p2 < 0) return { winner: 1, reason: 'foul', ms: null };
  if (p1 === null && p2 === null) throw new Error('nobody fired');
  if (p2 === null || (p1 !== null && p1 <= p2)) return { winner: 1, reason: 'faster', ms: p1 };
  return { winner: 2, reason: 'faster', ms: p2 };
}

export const WIN_ROUNDS = 3;
