/**
 * Memory Sequence: a digit-span test. Digits are shown one at a time; type
 * them back in order (in reverse on Hard). Each correct answer makes the next
 * sequence one digit longer. Two strikes at the same length end the test,
 * like the standard clinical procedure.
 */
export type Level = 'easy' | 'normal' | 'hard';

export const START_LENGTH: Record<Level, number> = { easy: 3, normal: 4, hard: 3 };
/** Milliseconds each digit stays on screen. */
export const SHOW_MS: Record<Level, number> = { easy: 1000, normal: 800, hard: 800 };
export const reverse = (level: Level) => level === 'hard';

/** A sequence without immediate repeats, which are hard to tell apart on screen. */
export function makeSequence(length: number, random: () => number): number[] {
  const seq: number[] = [];
  while (seq.length < length) {
    const d = Math.floor(random() * 10);
    if (d !== seq[seq.length - 1]) seq.push(d);
  }
  return seq;
}

export function expected(seq: number[], level: Level): number[] {
  return reverse(level) ? [...seq].reverse() : seq;
}

export function isCorrect(seq: number[], answer: number[], level: Level): boolean {
  const want = expected(seq, level);
  return want.length === answer.length && want.every((d, i) => d === answer[i]);
}

export interface SpanState {
  length: number;
  strikes: number;
  best: number;
  rounds: number;
}

export function start(level: Level): SpanState {
  return { length: START_LENGTH[level], strikes: 0, best: 0, rounds: 0 };
}

/** Advances after an answer; two misses at one length end the test. */
export function advance(s: SpanState, correct: boolean): { state: SpanState; over: boolean } {
  if (correct) return { state: { length: s.length + 1, strikes: 0, best: Math.max(s.best, s.length), rounds: s.rounds + 1 }, over: false };
  const strikes = s.strikes + 1;
  return { state: { ...s, strikes, rounds: s.rounds + 1 }, over: strikes >= 2 };
}
