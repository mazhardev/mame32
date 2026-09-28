import type { DifficultySetting } from '@/types';

export const SIZES: Record<DifficultySetting, { w: number; h: number }> = {
  easy: { w: 10, h: 10 },
  normal: { w: 16, h: 16 },
  hard: { w: 22, h: 22 },
};

/** Seconds a quick solver might need: a generous 0.4 s per cell on the solution. */
export function parSeconds(shortest: number): number {
  return Math.ceil(shortest * 0.4) + 5;
}

/**
 * Bigger mazes are worth more. Time over par, hint reveals and wandering
 * (steps beyond the shortest route) all cost points.
 */
export function scoreFor(
  cells: number,
  shortest: number,
  steps: number,
  ms: number,
  hints: number,
): number {
  const base = cells * 4;
  const overPar = Math.max(0, ms / 1000 - parSeconds(shortest));
  const wander = Math.max(0, steps - shortest);
  return Math.max(50, Math.round(base - overPar * 3 - wander * 1.5 - hints * 120));
}
