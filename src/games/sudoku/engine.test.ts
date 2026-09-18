import { describe, expect, it } from 'vitest';
import {
  CLUES,
  boxOf,
  candidatesFor,
  colOf,
  countSolutions,
  filledCount,
  findConflicts,
  generatePuzzle,
  index,
  isComplete,
  isValidPlacement,
  percentComplete,
  rowOf,
  solve,
} from './engine';
import type { Board } from './engine';

const empty = (): Board => Array(81).fill(0);

describe('coordinates', () => {
  it('maps between index, row, column and box', () => {
    expect(index(4, 5)).toBe(41);
    expect(rowOf(41)).toBe(4);
    expect(colOf(41)).toBe(5);
    expect(boxOf(0)).toBe(0);
    expect(boxOf(index(4, 5))).toBe(4);
    expect(boxOf(80)).toBe(8);
  });
});

describe('placement rules', () => {
  it('rejects a duplicate in the same row', () => {
    const board = empty();
    board[index(0, 0)] = 5;
    expect(isValidPlacement(board, index(0, 8), 5)).toBe(false);
  });

  it('rejects a duplicate in the same column', () => {
    const board = empty();
    board[index(0, 3)] = 7;
    expect(isValidPlacement(board, index(8, 3), 7)).toBe(false);
  });

  it('rejects a duplicate in the same box', () => {
    const board = empty();
    board[index(3, 3)] = 2;
    expect(isValidPlacement(board, index(5, 5), 2)).toBe(false);
  });

  it('accepts a value that breaks no constraint', () => {
    const board = empty();
    board[index(0, 0)] = 5;
    expect(isValidPlacement(board, index(1, 3), 5)).toBe(true);
  });

  it('ignores the cell being tested against itself', () => {
    const board = empty();
    board[index(0, 0)] = 5;
    expect(isValidPlacement(board, index(0, 0), 5)).toBe(true);
  });

  it('always accepts clearing a cell', () => {
    const board = empty();
    board[0] = 9;
    expect(isValidPlacement(board, 0, 0)).toBe(true);
  });
});

describe('conflict detection', () => {
  it('finds both cells of a duplicated pair', () => {
    const board = empty();
    board[index(0, 0)] = 4;
    board[index(0, 5)] = 4;
    const conflicts = findConflicts(board);
    expect(conflicts.has(index(0, 0))).toBe(true);
    expect(conflicts.has(index(0, 5))).toBe(true);
    expect(conflicts.size).toBe(2);
  });

  it('reports nothing for a legal partial board', () => {
    const board = empty();
    board[index(0, 0)] = 1;
    board[index(1, 3)] = 1;
    expect(findConflicts(board).size).toBe(0);
  });
});

describe('solving', () => {
  it('rejects contradictory givens without changing the input', () => {
    const board = empty();
    board[0] = 1;
    board[1] = 1;
    const original = board.slice();
    expect(solve(board)).toBeNull();
    expect(countSolutions(board)).toBe(0);
    expect(board).toEqual(original);
  });

  it.each(
    [[], [1], Array(81), Array(81).fill(10), Array(81).fill(NaN), Array(81).fill(0.5)].map(
      (board) => ({ board }),
    ),
  )('rejects malformed grids', ({ board }) => {
    expect(solve(board)).toBeNull();
    expect(countSolutions(board)).toBe(0);
    expect(isComplete(board)).toBe(false);
  });

  it('solves an empty grid into a valid complete board', () => {
    const solved = solve(empty());
    expect(solved).not.toBeNull();
    expect(isComplete(solved as Board)).toBe(true);
  });

  it('produces rows, columns and boxes that each hold 1-9', () => {
    const solved = solve(empty()) as Board;
    for (let r = 0; r < 9; r++) {
      const row = new Set<number>();
      const col = new Set<number>();
      const box = new Set<number>();
      for (let c = 0; c < 9; c++) {
        row.add(solved[index(r, c)]);
        col.add(solved[index(c, r)]);
        const br = Math.floor(r / 3) * 3 + Math.floor(c / 3);
        const bc = (r % 3) * 3 + (c % 3);
        box.add(solved[index(br, bc)]);
      }
      expect(row.size).toBe(9);
      expect(col.size).toBe(9);
      expect(box.size).toBe(9);
    }
  });

  it('counts exactly one solution for a completed board', () => {
    const solved = solve(empty()) as Board;
    expect(countSolutions(solved, 2)).toBe(1);
  });

  it('counts more than one solution for a nearly empty board', () => {
    expect(countSolutions(empty(), 2)).toBe(2);
  });

  it('counts zero solutions for a contradictory board', () => {
    const board = empty();
    board[index(0, 0)] = 1;
    board[index(0, 1)] = 1;
    expect(countSolutions(board, 2)).toBe(0);
  });
});

describe('generation', () => {
  it('produces a puzzle with a unique solution', () => {
    const { puzzle } = generatePuzzle(CLUES.easy, 'seed-1');
    expect(countSolutions(puzzle, 2)).toBe(1);
  });

  it('marks givens consistently with the puzzle', () => {
    const { puzzle, givens } = generatePuzzle(CLUES.normal, 'seed-2');
    for (let i = 0; i < 81; i++) expect(givens[i]).toBe(puzzle[i] !== 0);
  });

  it('keeps the puzzle consistent with its solution', () => {
    const { puzzle, solution } = generatePuzzle(CLUES.normal, 'seed-3');
    for (let i = 0; i < 81; i++) {
      if (puzzle[i] !== 0) expect(puzzle[i]).toBe(solution[i]);
    }
    expect(isComplete(solution)).toBe(true);
  });

  it('leaves roughly the requested number of clues', () => {
    const { puzzle } = generatePuzzle(CLUES.easy, 'seed-4');
    const clues = filledCount(puzzle);
    expect(clues).toBeGreaterThanOrEqual(CLUES.easy - 1);
    expect(clues).toBeLessThanOrEqual(60);
  });

  it('gives fewer clues on harder settings', () => {
    const easy = filledCount(generatePuzzle(CLUES.easy, 'x').puzzle);
    const hard = filledCount(generatePuzzle(CLUES.hard, 'x').puzzle);
    expect(hard).toBeLessThan(easy);
  });

  it('is reproducible for the same seed', () => {
    expect(generatePuzzle(CLUES.easy, 'daily-2026-09-09').puzzle).toEqual(
      generatePuzzle(CLUES.easy, 'daily-2026-09-09').puzzle,
    );
  });
});

describe('helpers', () => {
  it('lists only legal candidates', () => {
    const board = empty();
    board[index(0, 1)] = 1;
    board[index(1, 0)] = 2;
    const candidates = candidatesFor(board, index(0, 0));
    expect(candidates).not.toContain(1);
    expect(candidates).not.toContain(2);
    expect(candidates).toContain(3);
  });

  it('returns no candidates for a filled cell', () => {
    const board = empty();
    board[0] = 5;
    expect(candidatesFor(board, 0)).toEqual([]);
  });

  it('measures completion against the blanks only', () => {
    const { puzzle, solution, givens } = generatePuzzle(CLUES.easy, 'pct');
    expect(percentComplete(puzzle, givens)).toBe(0);
    expect(percentComplete(solution, givens)).toBe(100);
  });

  it('does not treat an incomplete board as complete', () => {
    const solved = solve(empty()) as Board;
    solved[0] = 0;
    expect(isComplete(solved)).toBe(false);
  });
});
