import { describe, expect, it } from 'vitest';
import { BRAZILIAN, ENGLISH, INTERNATIONAL, applyMove, bestMove, initialBoard, legalMoves } from './draughts';
import type { Cell } from './draughts';

/** Builds an empty board and places pieces: [square, cell]. */
function board(size: number, pieces: [number, Cell][]): Cell[] {
  const b: Cell[] = Array(size * size).fill(0);
  for (const [i, c] of pieces) b[i] = c;
  return b;
}
const sq = (size: number, r: number, c: number) => r * size + c;

describe('draughts rules', () => {
  it('starts with 12 pieces each in English checkers and 7 opening moves', () => {
    const b = initialBoard(ENGLISH);
    expect(b.filter((c) => c === 1)).toHaveLength(12);
    expect(b.filter((c) => c === 2)).toHaveLength(12);
    expect(legalMoves(b, 1, ENGLISH)).toHaveLength(7);
    expect(initialBoard(INTERNATIONAL).filter((c) => c === 1)).toHaveLength(20);
  });

  it('forces a capture when one is available', () => {
    const s = 8;
    const b = board(s, [
      [sq(s, 5, 2), 1],
      [sq(s, 4, 3), 2],
      [sq(s, 5, 6), 1],
    ]);
    const moves = legalMoves(b, 1, ENGLISH);
    expect(moves).toHaveLength(1);
    expect(moves[0].captured).toEqual([sq(s, 4, 3)]);
  });

  it('chains multiple jumps into one move', () => {
    const s = 8;
    const b = board(s, [
      [sq(s, 7, 0), 1],
      [sq(s, 6, 1), 2],
      [sq(s, 4, 3), 2],
    ]);
    const [m] = legalMoves(b, 1, ENGLISH);
    expect(m.captured).toHaveLength(2);
    expect(m.path).toEqual([sq(s, 5, 2), sq(s, 3, 4)]);
    const after = applyMove(b, m);
    expect(after.filter((c) => c === 2)).toHaveLength(0);
  });

  it('English men cannot capture backwards but international men can', () => {
    const s = 8;
    const b = board(s, [
      [sq(s, 3, 2), 1],
      [sq(s, 4, 3), 2],
    ]);
    expect(legalMoves(b, 1, ENGLISH).every((m) => m.captured.length === 0)).toBe(true);
    expect(legalMoves(b, 1, BRAZILIAN)[0].captured).toEqual([sq(s, 4, 3)]);
  });

  it('promotes a man reaching the far row', () => {
    const s = 8;
    const b = board(s, [[sq(s, 1, 2), 1]]);
    const m = legalMoves(b, 1, ENGLISH).find((x) => x.path[0] === sq(s, 0, 1))!;
    expect(m.promotes).toBe(true);
    expect(applyMove(b, m)[sq(s, 0, 1)]).toBe(3);
  });

  it('flying kings move and capture at a distance', () => {
    const s = 8;
    const b = board(s, [
      [sq(s, 7, 0), 3],
      [sq(s, 3, 4), 2],
    ]);
    const moves = legalMoves(b, 1, BRAZILIAN);
    expect(moves.every((m) => m.captured.length === 1)).toBe(true);
    // Can land on any empty square beyond the captured piece.
    expect(moves.map((m) => m.path[0]).sort((a, c) => a - c)).toEqual([sq(s, 1, 6), sq(s, 2, 5), sq(s, 0, 7)].sort((a, c) => a - c));
  });

  it('international rules require the capture of the most pieces', () => {
    const s = 10;
    const b = board(s, [
      [sq(s, 9, 0), 1],
      [sq(s, 8, 1), 2],
      [sq(s, 6, 3), 2],
      [sq(s, 9, 8), 1],
      [sq(s, 8, 7), 2],
    ]);
    const moves = legalMoves(b, 1, INTERNATIONAL);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => m.captured.length === 2)).toBe(true);
  });

  it('the computer takes a free piece', () => {
    const s = 8;
    const b = board(s, [
      [sq(s, 5, 2), 1],
      [sq(s, 2, 1), 2],
      [sq(s, 4, 3), 2],
    ]);
    const m = bestMove(b, 1, ENGLISH, 3)!;
    expect(m.captured).toHaveLength(1);
  });
});
