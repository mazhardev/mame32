/** Snakes and Ladders on a 100-square board with original layouts. */
export type Level = 'easy' | 'normal' | 'hard';

const LADDERS: Record<number, number> = { 3: 22, 8: 30, 20: 41, 27: 56, 36: 44, 50: 69, 63: 81, 71: 92 };
const SNAKES: Record<number, number> = { 17: 4, 32: 10, 48: 26, 62: 19, 75: 53, 88: 67, 95: 73, 98: 78 };
const HARD_SNAKES: Record<number, number> = { 55: 34, 83: 60, 93: 46 };

export function jumpsFor(level: Level): Record<number, number> {
  const snakes = { ...SNAKES };
  if (level === 'easy') {
    delete snakes[62];
    delete snakes[95];
  }
  return { ...LADDERS, ...snakes, ...(level === 'hard' ? HARD_SNAKES : {}) };
}

export interface Step {
  /** Square reached by the dice roll alone. */
  landing: number;
  /** Final square after any snake or ladder. */
  final: number;
  kind: 'ladder' | 'snake' | 'bounce' | 'blocked' | null;
}

/**
 * Easy: any roll past 100 finishes. Normal: you need the exact number, or
 * you stay put. Hard: overshooting bounces back from 100.
 */
export function step(pos: number, roll: number, level: Level, jumps = jumpsFor(level)): Step {
  let landing = pos + roll;
  let kind: Step['kind'] = null;
  if (landing > 100) {
    if (level === 'easy') landing = 100;
    else if (level === 'normal') return { landing: pos, final: pos, kind: 'blocked' };
    else {
      landing = 200 - landing;
      kind = 'bounce';
    }
  }
  const final = jumps[landing] ?? landing;
  if (final > landing) kind = 'ladder';
  else if (final < landing) kind = 'snake';
  return { landing, final, kind };
}

/** Converts a square number (1–100) to its row/column on screen, boustrophedon style. */
export function cellOf(square: number): { row: number; col: number } {
  const k = square - 1;
  const fromBottom = Math.floor(k / 10);
  const along = k % 10;
  return { row: 9 - fromBottom, col: fromBottom % 2 === 0 ? along : 9 - along };
}
