/**
 * Reflex Test: a choice-reaction test. One of four pads lights up after a
 * random delay; hit the matching pad (or arrow key) as fast as you can.
 * Unlike a simple reaction test you must also pick the right target, and on
 * Hard some pads light red — those must be left alone.
 */
export type Level = 'easy' | 'normal' | 'hard';
export const TRIALS = 15;
export const PADS = 4;

export interface Trial {
  pad: number;
  /** Red "don't press" trial. */
  decoy: boolean;
  ms: number | null;
  correct: boolean;
}

export const DECOY_RATE: Record<Level, number> = { easy: 0, normal: 0, hard: 0.2 };
export const TIMEOUT_MS: Record<Level, number> = { easy: 1500, normal: 1100, hard: 900 };

export function nextTrial(level: Level, random: () => number): { pad: number; decoy: boolean; delay: number } {
  return { pad: Math.floor(random() * PADS), decoy: random() < DECOY_RATE[level], delay: 600 + random() * 1400 };
}

/** Average of correct, timed responses. */
export function average(trials: Trial[]): number | null {
  const times = trials.filter((t) => t.correct && t.ms !== null && !t.decoy).map((t) => t.ms as number);
  return times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
}

/**
 * Score: faster average and more accuracy is better. A perfect, 250 ms
 * average scores about 1,000.
 */
export function score(trials: Trial[]): number {
  const correct = trials.filter((t) => t.correct).length;
  const avg = average(trials) ?? 2000;
  return Math.max(0, Math.round(correct * 40 + Math.max(0, 1000 - avg) * 0.6));
}
