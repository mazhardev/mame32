import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { SHAPES, canPlaceAnywhere, dealTray, fits, isGameOver, place, shapeById, validSave } from './engine';

const empty = (n: number) => Array<number>(n * n).fill(-1);
const s = (id: string) => shapeById(id)!;

describe('block puzzle shapes', () => {
  it('defines each shape with a bounding box matching its cells', () => {
    for (const shape of SHAPES) {
      expect(Math.max(...shape.cells.map(([r]) => r)) + 1).toBe(shape.rows);
      expect(Math.max(...shape.cells.map(([, c]) => c)) + 1).toBe(shape.cols);
    }
  });

  it('deals three known shapes', () => {
    const tray = dealTray('normal', createRng(1).next);
    expect(tray).toHaveLength(3);
    tray.forEach((id) => expect(shapeById(id)).toBeDefined());
  });
});

describe('block puzzle rules', () => {
  it('only places pieces inside the board on empty cells', () => {
    const board = empty(10);
    expect(fits(board, 10, s('i5h'), 0, 5)).toBe(true);
    expect(fits(board, 10, s('i5h'), 0, 6)).toBe(false);
    board[5] = 0;
    expect(fits(board, 10, s('i5h'), 0, 1)).toBe(false);
  });

  it('clears a completed row and scores it', () => {
    let board = empty(10);
    board = place(board, 10, s('i5h'), 0, 0)!.board;
    const res = place(board, 10, s('i5h'), 0, 5)!;
    expect(res.lines).toBe(1);
    expect(res.cleared).toHaveLength(10);
    expect(res.board.every((v) => v === -1)).toBe(true);
    expect(res.points).toBe(5 + 10 * 10);
  });

  it('clears a row and a column together, counting the crossing cell once', () => {
    const board = empty(10);
    for (let c = 0; c < 9; c++) board[c] = 1; // row 0 missing column 9
    for (let r = 1; r < 10; r++) board[r * 10 + 9] = 1; // column 9 missing row 0
    const res = place(board, 10, s('dot'), 0, 9)!;
    expect(res.lines).toBe(2);
    expect(res.cleared).toHaveLength(19);
    expect(res.points).toBe(1 + 19 * 10 * 2);
  });

  it('ends the game when no tray piece fits', () => {
    const board = Array<number>(9 * 9).fill(0);
    board[0] = -1;
    expect(canPlaceAnywhere(board, 9, s('dot'))).toBe(true);
    expect(isGameOver(board, 9, ['i2h', null, 'o2'])).toBe(true);
    expect(isGameOver(board, 9, ['i2h', 'dot', null])).toBe(false);
  });

  it('validates saves', () => {
    const good = { n: 10, board: empty(10), tray: ['dot', null, 'o3'], score: 10, lines: 1, streak: 0 };
    expect(validSave(good)).toBe(true);
    expect(validSave({ ...good, tray: ['nope', null, null] })).toBe(false);
    expect(validSave({ ...good, board: empty(9) })).toBe(false);
  });
});
