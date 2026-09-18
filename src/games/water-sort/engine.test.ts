import { expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { pour, generate, solved, validSave } from './engine';
it('pours a full matching top run up to capacity', () => {
  expect(pour([[0, 1, 1], [1, 1, 1], []], 0, 1)).toEqual([[0, 1], [1, 1, 1, 1], []]);
});
it('rejects incompatible colors and same-tube moves', () => {
  expect(pour([[0], [1]], 0, 1)).toBeNull();
  expect(pour([[0], []], 0, 0)).toBeNull();
});
it('generates puzzles with a legal path back to the solution', () => {
  for (let seed = 0; seed < 20; seed++) {
    const rng = createRng(seed);
    const puzzle = generate(5, () => rng.next());
    let board = puzzle.tubes;
    for (const m of puzzle.solution) {
      const next = pour(board, m.from, m.to);
      expect(next).not.toBeNull();
      board = next!;
    }
    expect(solved(board)).toBe(true);
    expect(validSave({ tubes: puzzle.tubes, moves: 0 })).toBe(true);
  }
});
it('rejects saves with missing or excess color units', () => {
  expect(validSave({ tubes: [[0], [], [], [], []], moves: 0 })).toBe(false);
});
