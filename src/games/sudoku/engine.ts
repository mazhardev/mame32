import { createRng } from '@/utils/random';
import type { Rng } from '@/utils/random';

export type Board = number[]; // 81 cells, 0 = empty

export const SIZE = 9;
export const BOX = 3;

export const CLUES: Record<'easy' | 'normal' | 'hard', number> = {
  easy: 44,
  normal: 34,
  hard: 27,
};

export function index(row: number, col: number) {
  return row * SIZE + col;
}

export function rowOf(i: number) {
  return Math.floor(i / SIZE);
}

export function colOf(i: number) {
  return i % SIZE;
}

export function boxOf(i: number) {
  return Math.floor(rowOf(i) / BOX) * BOX + Math.floor(colOf(i) / BOX);
}

/** True when `value` can legally go in cell `i` given the current board. */
export function isValidPlacement(board: Board, i: number, value: number): boolean {
  if (value === 0) return true;
  const row = rowOf(i);
  const col = colOf(i);
  for (let c = 0; c < SIZE; c++) {
    const j = index(row, c);
    if (j !== i && board[j] === value) return false;
  }
  for (let r = 0; r < SIZE; r++) {
    const j = index(r, col);
    if (j !== i && board[j] === value) return false;
  }
  const boxRow = Math.floor(row / BOX) * BOX;
  const boxCol = Math.floor(col / BOX) * BOX;
  for (let r = boxRow; r < boxRow + BOX; r++) {
    for (let c = boxCol; c < boxCol + BOX; c++) {
      const j = index(r, c);
      if (j !== i && board[j] === value) return false;
    }
  }
  return true;
}

/** Every filled cell that breaks a Sudoku constraint. */
export function findConflicts(board: Board): Set<number> {
  const conflicts = new Set<number>();
  for (let i = 0; i < board.length; i++) {
    const value = board[i];
    if (value === 0) continue;
    if (!isValidPlacement(board, i, value)) conflicts.add(i);
  }
  return conflicts;
}

export function isComplete(board: Board): boolean {
  return isValidBoard(board) && board.every((v) => v !== 0);
}

function isValidBoard(board: Board): boolean {
  return (
    board.length === SIZE * SIZE &&
    Array.from(board).every((v) => Number.isInteger(v) && v >= 0 && v <= SIZE) &&
    findConflicts(board).size === 0
  );
}

function shuffled(rng: Rng): number[] {
  return rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
}

/** Backtracking fill used to build a complete, valid grid. */
function fill(board: Board, rng: Rng, pos = 0): boolean {
  if (pos >= board.length) return true;
  if (board[pos] !== 0) return fill(board, rng, pos + 1);
  for (const value of shuffled(rng)) {
    if (isValidPlacement(board, pos, value)) {
      board[pos] = value;
      if (fill(board, rng, pos + 1)) return true;
      board[pos] = 0;
    }
  }
  return false;
}

/**
 * Counts solutions, stopping as soon as `limit` is reached.
 * Used to guarantee the generated puzzle has exactly one solution.
 */
export function countSolutions(board: Board, limit = 2): number {
  // Contradictory givens cannot be repaired by filling blanks. Reject them
  // before search, which could otherwise explore an enormous impossible tree.
  if (!isValidBoard(board) || !Number.isInteger(limit) || limit <= 0) return 0;
  const working = board.slice();
  let count = 0;

  const solve = (): void => {
    if (count >= limit) return;
    let best = -1;
    let bestOptions: number[] = [];
    for (let i = 0; i < working.length; i++) {
      if (working[i] !== 0) continue;
      const options: number[] = [];
      for (let v = 1; v <= 9; v++) if (isValidPlacement(working, i, v)) options.push(v);
      if (options.length === 0) return;
      if (best === -1 || options.length < bestOptions.length) {
        best = i;
        bestOptions = options;
        if (options.length === 1) break;
      }
    }
    if (best === -1) {
      count += 1;
      return;
    }
    for (const value of bestOptions) {
      working[best] = value;
      solve();
      working[best] = 0;
      if (count >= limit) return;
    }
  };

  solve();
  return count;
}

export function solve(board: Board): Board | null {
  if (!isValidBoard(board)) return null;
  const working = board.slice();
  const rng = createRng(1);
  return fill(working, rng) ? working : null;
}

export interface Puzzle {
  puzzle: Board;
  solution: Board;
  givens: boolean[];
}

/**
 * Generates a puzzle by digging holes out of a full grid, keeping only removals
 * that leave the solution unique. Seeded, so a daily puzzle is reproducible.
 */
export function generatePuzzle(clues: number, seed?: string | number): Puzzle {
  const rng = createRng(seed ?? Math.floor(Math.random() * 2 ** 31));
  const solution: Board = Array(81).fill(0);
  fill(solution, rng);

  const puzzle = solution.slice();
  const order = rng.shuffle(Array.from({ length: 81 }, (_, i) => i));
  let remaining = 81;

  for (const i of order) {
    if (remaining <= clues) break;
    const backup = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions(puzzle, 2) === 1) {
      remaining -= 1;
    } else {
      puzzle[i] = backup;
    }
  }

  return {
    puzzle,
    solution,
    givens: puzzle.map((v) => v !== 0),
  };
}

export function candidatesFor(board: Board, i: number): number[] {
  if (board[i] !== 0) return [];
  const out: number[] = [];
  for (let v = 1; v <= 9; v++) if (isValidPlacement(board, i, v)) out.push(v);
  return out;
}

export function filledCount(board: Board): number {
  return board.reduce((n, v) => n + (v !== 0 ? 1 : 0), 0);
}

export function percentComplete(board: Board, givens: boolean[]): number {
  const blanks = givens.filter((g) => !g).length;
  if (!blanks) return 100;
  let done = 0;
  for (let i = 0; i < board.length; i++) if (!givens[i] && board[i] !== 0) done += 1;
  return (done / blanks) * 100;
}
