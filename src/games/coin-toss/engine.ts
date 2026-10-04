/** Coin Toss rules: call the toss; wrong calls cost a life. */
export type Side = 'heads' | 'tails';
export type Level = 'easy' | 'normal' | 'hard';

export const LIVES: Record<Level, number> = { easy: 3, normal: 2, hard: 1 };

export interface TossState {
  lives: number;
  correct: number;
  streak: number;
  bestStreak: number;
  history: { call: Side; result: Side }[];
}

export function newState(level: Level): TossState {
  return { lives: LIVES[level], correct: 0, streak: 0, bestStreak: 0, history: [] };
}

export function flip(random: () => number): Side {
  return random() < 0.5 ? 'heads' : 'tails';
}

export function applyCall(s: TossState, call: Side, result: Side): TossState {
  const right = call === result;
  const streak = right ? s.streak + 1 : 0;
  return {
    lives: right ? s.lives : s.lives - 1,
    correct: s.correct + (right ? 1 : 0),
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    history: [...s.history, { call, result }],
  };
}
