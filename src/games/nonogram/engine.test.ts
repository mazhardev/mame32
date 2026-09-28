import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import {
  EMPTY,
  FILLED,
  UNKNOWN,
  cluesFor,
  doneLines,
  isLineSolvable,
  lineClue,
  lineOptions,
  makePuzzle,
  matchesClues,
  parsePicture,
  validSave,
  encodeSolution,
} from './engine';
import type { Mark } from './engine';
import { PICTURES_10, PICTURES_5 } from './pictures';

const unknown = (n: number): Mark[] => Array<Mark>(n).fill(UNKNOWN);

describe('nonogram clues', () => {
  it('lists run lengths', () => {
    expect(lineClue([1, 1, 0, 1, 0, 0, 1, 1, 1])).toEqual([2, 1, 3]);
    expect(lineClue([0, 0, 0])).toEqual([]);
  });
});

describe('line solver', () => {
  it('finds overlap cells of a long block', () => {
    // A 4-block in 5 cells: the middle three are certain.
    const opts = lineOptions([4], unknown(5))!;
    const forced = opts.canFill.map((f, i) => f && !opts.canEmpty[i]);
    expect(forced).toEqual([false, true, true, true, false]);
  });

  it('fills a line whose clue uses every cell', () => {
    const opts = lineOptions([2, 2], unknown(5))!;
    expect(opts.canEmpty).toEqual([false, false, true, false, false]);
  });

  it('empties everything for a zero clue', () => {
    const opts = lineOptions([], unknown(4))!;
    expect(opts.canFill.every((f) => !f)).toBe(true);
  });

  it('uses known cells to narrow the placement', () => {
    const known: Mark[] = [UNKNOWN, UNKNOWN, UNKNOWN, FILLED, UNKNOWN, UNKNOWN];
    const opts = lineOptions([2], known)!;
    // The 2-block must cover cell 3, so cells 0, 1 are empty.
    expect(opts.canFill[0]).toBe(false);
    expect(opts.canFill[1]).toBe(false);
    expect(opts.canFill[2] && opts.canFill[4]).toBe(true);
  });

  it('reports contradictions', () => {
    expect(lineOptions([3], [UNKNOWN, EMPTY, UNKNOWN, EMPTY, UNKNOWN])).toBeNull();
    expect(lineOptions([], [UNKNOWN, FILLED])).toBeNull();
  });
});

describe('puzzles', () => {
  it('only ships pictures that can be solved without guessing', () => {
    for (const p of PICTURES_5) {
      expect(p.rows).toHaveLength(5);
      expect(isLineSolvable(parsePicture(p.rows), 5), p.name).toBe(true);
    }
    for (const p of PICTURES_10) {
      expect(p.rows).toHaveLength(10);
      expect(p.rows.every((r) => r.length === 10), p.name).toBe(true);
      expect(isLineSolvable(parsePicture(p.rows), 10), p.name).toBe(true);
    }
  });

  it('generates line-solvable puzzles at every size', () => {
    for (const n of [5, 10, 15]) {
      for (let seed = 0; seed < 10; seed++) {
        const pics = n === 5 ? PICTURES_5 : n === 10 ? PICTURES_10 : [];
        const p = makePuzzle(n, pics, createRng(`nono-${n}-${seed}`).next);
        expect(p.solution).toHaveLength(n * n);
        expect(isLineSolvable(p.solution, n)).toBe(true);
      }
    }
  });

  it('accepts any grid that matches every clue', () => {
    const sol = parsePicture(PICTURES_5[0].rows);
    const { rows, cols } = cluesFor(sol, 5);
    const marks: Mark[] = sol.map((b) => (b ? FILLED : UNKNOWN));
    expect(matchesClues(marks, rows, cols)).toBe(true);
    marks[0] = marks[0] === FILLED ? UNKNOWN : FILLED;
    expect(matchesClues(marks, rows, cols)).toBe(false);
    const lines = doneLines(marks, rows, cols);
    expect(lines.rows[0]).toBe(false);
    expect(lines.rows[1]).toBe(true);
  });

  it('validates saves', () => {
    const sol = parsePicture(PICTURES_5[1].rows);
    const good = { n: 5, name: 'Tree', solution: encodeSolution(sol), marks: unknown(25), ms: 10, checks: 0 };
    expect(validSave(good)).toBe(true);
    expect(validSave({ ...good, solution: '01' })).toBe(false);
    expect(validSave({ ...good, marks: [...unknown(24), 7] })).toBe(false);
    expect(validSave({ ...good, n: 6 })).toBe(false);
  });
});
