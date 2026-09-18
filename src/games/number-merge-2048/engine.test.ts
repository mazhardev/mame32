import { describe, expect, it } from 'vitest';
import {
  canMove,
  emptyCells,
  emptyGrid,
  hasReached,
  highestTile,
  move,
  newGame,
  spawnTile,
} from './engine';
import type { Grid } from './engine';

const g = (rows: number[][]): Grid => rows.map((r) => r.slice());

describe('sliding', () => {
  it('slides tiles left without merging different values', () => {
    const result = move(g([[0, 2, 0, 4], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'left');
    expect(result.grid[0]).toEqual([2, 4, 0, 0]);
    expect(result.moved).toBe(true);
    expect(result.gained).toBe(0);
  });

  it('merges an equal pair once and scores the new value', () => {
    const result = move(g([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'left');
    expect(result.grid[0]).toEqual([4, 0, 0, 0]);
    expect(result.gained).toBe(4);
    expect(result.merged).toBe(1);
  });

  it('does not chain a merged tile into another merge in the same move', () => {
    const result = move(g([[2, 2, 4, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'left');
    expect(result.grid[0]).toEqual([4, 4, 0, 0]);
  });

  it('merges the far pair first when sliding left', () => {
    const result = move(g([[2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'left');
    expect(result.grid[0]).toEqual([4, 4, 0, 0]);
    expect(result.gained).toBe(8);
  });

  it('slides right correctly', () => {
    const result = move(g([[2, 0, 0, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'right');
    expect(result.grid[0]).toEqual([0, 0, 0, 4]);
  });

  it('slides up correctly', () => {
    const result = move(g([[2, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'up');
    expect(result.grid.map((r) => r[0])).toEqual([4, 0, 0, 0]);
  });

  it('slides down correctly', () => {
    const result = move(g([[2, 0, 0, 0], [2, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]), 'down');
    expect(result.grid.map((r) => r[0])).toEqual([0, 0, 0, 4]);
  });

  it('reports no move when nothing changes', () => {
    const board = g([[2, 4, 8, 16], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    expect(move(board, 'left').moved).toBe(false);
  });

  it('leaves the input grid untouched', () => {
    const board = g([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const before = JSON.stringify(board);
    move(board, 'left');
    expect(JSON.stringify(board)).toBe(before);
  });
});

describe('game state', () => {
  it('detects available moves while empty cells remain', () => {
    expect(canMove(emptyGrid(4))).toBe(true);
  });

  it('detects available moves on a full board with an adjacent pair', () => {
    expect(canMove(g([[2, 2, 4, 8], [4, 8, 16, 32], [2, 4, 8, 16], [4, 8, 16, 32]]))).toBe(true);
  });

  it('detects game over on a full board with no pairs', () => {
    expect(canMove(g([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]))).toBe(false);
  });

  it('finds the highest tile and target', () => {
    const board = g([[2, 4, 8, 16], [32, 64, 128, 256], [0, 0, 0, 0], [0, 0, 0, 0]]);
    expect(highestTile(board)).toBe(256);
    expect(hasReached(board, 256)).toBe(true);
    expect(hasReached(board, 512)).toBe(false);
  });
});

describe('spawning', () => {
  it('places a tile in an empty cell only', () => {
    const board = emptyGrid(4);
    board[0][0] = 2;
    for (let i = 0; i < 10; i++) spawnTile(board, () => 0.5);
    expect(board[0][0]).toBe(2);
  });

  it('returns false when the board is full', () => {
    const board = g([[2, 4, 2, 4], [4, 2, 4, 2], [2, 4, 2, 4], [4, 2, 4, 2]]);
    expect(spawnTile(board)).toBe(false);
  });

  it('spawns a 4 only ten percent of the time', () => {
    const board = emptyGrid(4);
    spawnTile(board, () => 0.95);
    expect(emptyCells(board)).toHaveLength(15);
    expect(Math.max(...board.flat())).toBe(4);
  });

  it('starts a new game with exactly two tiles', () => {
    const board = newGame(4, () => 0.3);
    expect(board.flat().filter((v) => v !== 0)).toHaveLength(2);
  });
});
