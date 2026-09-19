import { describe, expect, it } from 'vitest';
import { PASS, chooseMove, newGame, play, score } from './engine';
import type { GoState } from './engine';
import { createRng } from '@/utils/random';

function setup(n: number, black: number[], white: number[], turn: 1 | 2 = 1): GoState {
  const s = newGame(n);
  for (const i of black) s.board[i] = 1;
  for (const i of white) s.board[i] = 2;
  s.turn = turn;
  return s;
}

describe('go rules', () => {
  it('captures a surrounded stone', () => {
    // White stone at 10 (row 1, col 1 on 5×5) with black on three sides.
    const s = setup(5, [5, 9, 15], [10]);
    const r = play(s, 11);
    expect(r?.captured).toEqual([10]);
    expect(r?.state.board[10]).toBe(0);
    expect(r?.state.captures[1]).toBe(1);
  });

  it('forbids suicide but allows a move that captures first', () => {
    const s = setup(5, [1, 5], [], 2);
    expect(play(s, 0)).toBeNull();
    const t = setup(5, [1, 5], [2, 6, 10], 2);
    expect(play(t, 0)).not.toBeNull();
  });

  it('enforces simple ko', () => {
    // White 12 has one liberty (11); black at 11 is then left with only 12.
    const a = setup(5, [7, 13, 17], [6, 10, 12, 16]);
    const take = play(a, 11);
    expect(take?.captured).toEqual([12]);
    const after = take!.state;
    expect(after.ko).toBe(12);
    expect(play(after, 12)).toBeNull();
    // After an exchange elsewhere, the ko can be retaken.
    const elsewhere = play(play(after, 24)!.state, 20)!.state;
    expect(play(elsewhere, 12)?.captured).toEqual([11]);
  });

  it('scores area: stones plus surrounded empty points', () => {
    const s = setup(3, [1, 4, 7], [2, 5, 8]);
    const sc = score(s.board, 3);
    expect(sc.black).toBe(6);
    expect(sc.white).toBe(3);
  });

  it('two passes are counted', () => {
    const s = newGame(9);
    const a = play(s, PASS)!.state;
    expect(play(a, PASS)!.state.passes).toBe(2);
  });

  it('the computer captures a stone in atari', () => {
    const s = setup(7, [9, 15, 23], [16], 1);
    const m = chooseMove(s, 6.5, 600, 5000, createRng(1).next);
    expect(m).toBe(17);
  });
});
