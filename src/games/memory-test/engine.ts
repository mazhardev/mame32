/**
 * Memory Test: visual pattern memory. Some squares light up for a moment;
 * tap the same squares. Each level lights one more square, and the grid grows
 * as levels pass. Three wrong taps in a level cost a life; three lives in all.
 */
export type Level = 'easy' | 'normal' | 'hard';

export const SHOW_MS: Record<Level, number> = { easy: 1400, normal: 1000, hard: 700 };
export const LIVES = 3;
export const MISTAKES_PER_LEVEL = 3;

/** Grid side for a level: 3×3 at first, growing to 7×7. */
export function gridSize(level: number): number {
  return Math.min(7, 3 + Math.floor((level - 1) / 3));
}

/** Squares to remember on a level. */
export const targetCount = (level: number) => level + 2;

export function makePattern(level: number, random: () => number): number[] {
  const n = gridSize(level);
  const want = Math.min(targetCount(level), n * n - 1);
  const cells = new Set<number>();
  while (cells.size < want) cells.add(Math.floor(random() * n * n));
  return [...cells];
}

export interface Attempt {
  found: number[];
  wrong: number[];
}

export type TapResult = 'hit' | 'repeat' | 'miss';

export function tap(pattern: number[], attempt: Attempt, cell: number): TapResult {
  if (attempt.found.includes(cell) || attempt.wrong.includes(cell)) return 'repeat';
  if (pattern.includes(cell)) {
    attempt.found.push(cell);
    return 'hit';
  }
  attempt.wrong.push(cell);
  return 'miss';
}

export const complete = (pattern: number[], a: Attempt) => a.found.length === pattern.length;
export const failed = (a: Attempt) => a.wrong.length >= MISTAKES_PER_LEVEL;
