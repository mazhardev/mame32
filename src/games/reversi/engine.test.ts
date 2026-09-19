import { describe, expect, it } from 'vitest';
import { PASS, count, flips, initial, isOver, legal, play, reversiGame } from './engine';
import type { Disc } from './engine';
import { searchBest } from '../_shared/board/search';

describe('reversi rules', () => {
  it('opens with four legal moves for black', () => {
    const s = initial();
    expect(legal(s.board, 1).sort((a, b) => a - b)).toEqual([19, 26, 37, 44]);
  });

  it('flips the discs between the new disc and an existing one', () => {
    const s = initial();
    expect(flips(s.board, 19, 1)).toEqual([27]);
    const after = play(s, 19);
    expect(after.board[27]).toBe(1);
    expect(count(after.board, 1)).toBe(4);
    expect(after.turn).toBe(2);
  });

  it('does not wrap flips around the board edge', () => {
    const b: Disc[] = Array(64).fill(0);
    b[7] = 2;
    b[8] = 1;
    // Square 6: the line 7 → 8 would wrap to the next row; it must not count.
    expect(flips(b, 6, 1)).toEqual([]);
  });

  it('passes when stuck and ends when neither side can move', () => {
    const b: Disc[] = Array(64).fill(1);
    b[0] = 0;
    expect(isOver(b)).toBe(true);
    expect(reversiGame.moves({ board: b, turn: 2 })).toEqual([]);
    const c: Disc[] = Array(64).fill(0);
    c[0] = 1;
    c[1] = 2;
    expect(reversiGame.moves({ board: c, turn: 2 })).toEqual([PASS]);
  });

  it('the computer grabs an available corner', () => {
    const b: Disc[] = Array(64).fill(0);
    // White can take corner 0 by flanking the black discs on 9 and 18.
    b[9] = 1;
    b[18] = 1;
    b[27] = 2;
    b[28] = 1;
    b[36] = 2;
    expect(legal(b, 2)).toContain(0);
    // One ply: positional judgement alone should pick the corner.
    const move = searchBest(reversiGame, { board: b, turn: 2 }, 1, 500, 0);
    expect(move).toBe(0);
  });
});
