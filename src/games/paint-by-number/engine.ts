import { SIZE, SPRITES } from '../_shared/creative/sprites';
import type { Sprite } from '../_shared/creative/sprites';
import { isRecord } from '../_shared/puzzle/useSavedGame';

/**
 * Paint by number: every cell of a 16 × 16 picture has a number; each number
 * is one colour. Empty sprite cells become a soft background colour so the
 * whole grid is painted.
 */
export const BACKGROUND = '#dbeafe';

export interface Puzzle {
  id: string;
  name: string;
  colors: string[];
  /** Number (index into colors) for every cell. */
  answer: number[];
}

export function puzzleFrom(s: Sprite): Puzzle {
  const keys = Object.keys(s.palette);
  const colors = [BACKGROUND, ...keys.map((k) => s.palette[k])];
  const answer: number[] = [];
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const ch = s.rows[y][x];
      answer.push(ch === '.' ? 0 : keys.indexOf(ch) + 1);
    }
  return { id: s.id, name: s.name, colors, answer };
}

export const PUZZLES: Puzzle[] = SPRITES.map(puzzleFrom);

/** -1 = not painted; otherwise the colour index painted there. */
export type Paint = number[];

export const blankPaint = (): Paint => new Array(SIZE * SIZE).fill(-1);

export function progress(p: Puzzle, paint: Paint): number {
  let right = 0;
  for (let i = 0; i < p.answer.length; i++) if (paint[i] === p.answer[i]) right++;
  return right / p.answer.length;
}

export const complete = (p: Puzzle, paint: Paint) => progress(p, paint) === 1;

export interface PbnSave {
  current: { id: string; paint: Paint; mistakes: number; seconds: number } | null;
  done: string[];
}

export function validSave(v: unknown): v is PbnSave {
  if (!isRecord(v) || !Array.isArray(v.done) || !v.done.every((d) => typeof d === 'string'))
    return false;
  if (v.current === null) return true;
  const c = v.current;
  return (
    isRecord(c) &&
    PUZZLES.some((p) => p.id === c.id) &&
    Array.isArray(c.paint) &&
    c.paint.length === SIZE * SIZE &&
    c.paint.every((n) => Number.isInteger(n) && n >= -1 && n < 16) &&
    typeof c.mistakes === 'number' &&
    typeof c.seconds === 'number'
  );
}
