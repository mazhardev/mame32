import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import {
  boardFromSave,
  combos,
  duplicates,
  findSolutions,
  generate,
  isSolved,
  runStatus,
  validSave,
} from './engine';

describe('kakuro combinations', () => {
  it('lists the digit sets for a sum', () => {
    expect(combos(2, 3)).toEqual([[1, 2]]);
    expect(combos(2, 17)).toEqual([[8, 9]]);
    expect(combos(3, 24)).toEqual([[7, 8, 9]]);
    expect(combos(2, 10).length).toBe(4); // 1+9, 2+8, 3+7, 4+6
    expect(combos(2, 2)).toEqual([]);
  });
});

describe('kakuro generation', () => {
  it('builds valid layouts with a single solution', () => {
    for (const n of [6, 8, 10]) {
      for (let seed = 0; seed < 5; seed++) {
        const board = generate(n, createRng(`kk-${n}-${seed}`).next);
        // Row 0 and column 0 are always black.
        for (let i = 0; i < n; i++) {
          expect(board.white[i]).toBe(false);
          expect(board.white[i * n]).toBe(false);
        }
        for (const run of board.runs) {
          expect(run.cells.length).toBeGreaterThanOrEqual(2);
          const digits = run.cells.map((c) => board.solution[c]);
          expect(new Set(digits).size).toBe(digits.length);
          expect(digits.reduce((a, b) => a + b, 0)).toBe(run.sum);
        }
        // Every white cell belongs to one across and one down run.
        board.white.forEach((w, i) => {
          if (w) expect(board.cellRuns[i].every((r) => r >= 0)).toBe(true);
        });
        const res = findSolutions(board, board.givens, 2, 2_000_000);
        expect(res.exhausted).toBe(false);
        expect(res.solutions).toHaveLength(1);
        expect(res.solutions[0]).toEqual(board.solution.map((v, i) => (board.white[i] ? v : 0)));
      }
    }
  });
});

describe('kakuro checking', () => {
  const board = generate(6, createRng('check').next);

  it('accepts the solution and rejects a wrong digit', () => {
    expect(isSolved(board, board.solution)).toBe(true);
    const wrong = board.solution.slice();
    const cell = board.white.findIndex((w, i) => w && !board.givens[i]);
    wrong[cell] = (wrong[cell] % 9) + 1;
    expect(isSolved(board, wrong)).toBe(false);
    expect(runStatus(board, wrong)).toContain('bad');
  });

  it('flags repeated digits within a run', () => {
    const run = board.runs[0];
    const entries = board.solution.map(() => 0);
    entries[run.cells[0]] = 5;
    entries[run.cells[1]] = 5;
    expect(duplicates(board, entries)).toEqual(new Set([run.cells[0], run.cells[1]]));
  });

  it('round-trips a save', () => {
    const save = {
      n: board.n,
      white: board.white,
      solution: board.solution,
      givens: board.givens,
      entries: board.givens.slice(),
      ms: 0,
      checks: 0,
    };
    expect(validSave(save)).toBe(true);
    expect(boardFromSave(save).runs.map((r) => r.sum)).toEqual(board.runs.map((r) => r.sum));
    // A given that disagrees with the solution is rejected.
    const c = board.white.findIndex((w) => w);
    const badGivens = save.givens.slice();
    badGivens[c] = (board.solution[c] % 9) + 1;
    expect(validSave({ ...save, givens: badGivens })).toBe(false);
    expect(validSave({ ...save, n: 7 })).toBe(false);
  });
});
