import { describe, expect, it } from 'vitest';
import {
  COLS,
  ROWS,
  chooseColumn,
  drop,
  dropRow,
  emptyGrid,
  isFull,
  isGameOver,
  legalColumns,
  winner,
  winningCells,
} from './engine';
import type { Disc, Grid } from './engine';

function place(grid: Grid, moves: [number, Disc][]) {
  for (const [col, disc] of moves) drop(grid, col, disc);
  return grid;
}

describe('board mechanics', () => {
  it('drops discs to the lowest free row', () => {
    const grid = emptyGrid();
    expect(drop(grid, 3, 1)).toBe(ROWS - 1);
    expect(drop(grid, 3, 2)).toBe(ROWS - 2);
  });

  it('reports a full column as illegal', () => {
    const grid = emptyGrid();
    for (let i = 0; i < ROWS; i++) drop(grid, 0, 1);
    expect(dropRow(grid, 0)).toBe(-1);
    expect(drop(grid, 0, 2)).toBe(-1);
    expect(legalColumns(grid)).not.toContain(0);
  });

  it('detects a full board', () => {
    const grid = emptyGrid();
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) drop(grid, c, ((c + r) % 2 ? 1 : 2) as Disc);
    expect(isFull(grid)).toBe(true);
    expect(isGameOver(grid)).toBe(true);
  });
});

describe('win detection', () => {
  it('finds a horizontal four', () => {
    const grid = place(emptyGrid(), [[0, 1], [1, 1], [2, 1], [3, 1]]);
    expect(winner(grid)).toBe(1);
    expect(winningCells(grid)).toHaveLength(4);
  });

  it('finds a vertical four', () => {
    const grid = place(emptyGrid(), [[2, 2], [2, 2], [2, 2], [2, 2]]);
    expect(winner(grid)).toBe(2);
  });

  it('finds an ascending diagonal', () => {
    const grid = emptyGrid();
    place(grid, [
      [0, 1],
      [1, 2], [1, 1],
      [2, 2], [2, 2], [2, 1],
      [3, 2], [3, 2], [3, 2], [3, 1],
    ]);
    expect(winner(grid)).toBe(1);
  });

  it('finds a descending diagonal', () => {
    const grid = emptyGrid();
    place(grid, [
      [3, 1],
      [2, 2], [2, 1],
      [1, 2], [1, 2], [1, 1],
      [0, 2], [0, 2], [0, 2], [0, 1],
    ]);
    expect(winner(grid)).toBe(1);
  });

  it('does not report a win for three in a row', () => {
    const grid = place(emptyGrid(), [[0, 1], [1, 1], [2, 1]]);
    expect(winner(grid)).toBeNull();
    expect(isGameOver(grid)).toBe(false);
  });

  it('does not join two players discs into a line', () => {
    const grid = place(emptyGrid(), [[0, 1], [1, 1], [2, 2], [3, 1]]);
    expect(winner(grid)).toBeNull();
  });
});

describe('AI', () => {
  it('takes an immediate winning column', () => {
    const grid = place(emptyGrid(), [[0, 2], [1, 2], [2, 2], [0, 1], [1, 1]]);
    expect(chooseColumn(grid, 2, 'hard')).toBe(3);
  });

  it('blocks the opponents immediate win', () => {
    const grid = place(emptyGrid(), [[0, 1], [1, 1], [2, 1]]);
    expect(chooseColumn(grid, 2, 'hard')).toBe(3);
  });

  it('always returns a legal column', () => {
    const grid = emptyGrid();
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const col = chooseColumn(grid.slice(), 1, level);
      expect(legalColumns(grid)).toContain(col);
    }
  });

  it('returns null when the board is full', () => {
    const grid = emptyGrid();
    for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) drop(grid, c, 1);
    expect(chooseColumn(grid, 2, 'hard')).toBeNull();
  });

  it('leaves the grid unchanged after searching', () => {
    const grid = place(emptyGrid(), [[3, 1], [3, 2], [4, 1]]);
    const before = grid.slice();
    chooseColumn(grid, 2, 'hard');
    expect(grid).toEqual(before);
  });
});
