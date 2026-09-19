import { describe, expect, it } from 'vitest';
import { canMove, chooseTile, deal, fullSet, pass, pips, place, playableEnds, roundResult } from './engine';
import type { DominoState } from './engine';

const state = (partial: Partial<DominoState>): DominoState => ({ hands: [[], []], boneyard: [], chain: [], turn: 0, passes: 0, ...partial });

describe('dominoes', () => {
  it('has 28 tiles and deals seven each', () => {
    expect(fullSet()).toHaveLength(28);
    const s = deal();
    expect(s.hands[0]).toHaveLength(7);
    expect(s.hands[1]).toHaveLength(7);
    expect(s.boneyard).toHaveLength(14);
  });

  it('orients tiles so the touching numbers match', () => {
    let s = state({ hands: [[[3, 5], [5, 6]], [[2, 3]]] });
    s = place(s, 0, 'L');
    expect(s.chain).toEqual([[3, 5]]);
    expect(playableEnds(s.chain, [2, 3])).toEqual(['L']);
    s = place(s, 0, 'L');
    expect(s.chain).toEqual([
      [2, 3],
      [3, 5],
    ]);
    s = place(s, 0, 'R');
    expect(s.chain.at(-1)).toEqual([5, 6]);
  });

  it('scores the opponent’s pips on domino and the difference when blocked', () => {
    expect(roundResult(state({ hands: [[], [[6, 6]]] }))).toEqual({ winner: 0, points: 12, blocked: false });
    const blocked = pass(pass(state({ hands: [[[1, 0]], [[4, 4]]], chain: [[6, 6]] })));
    expect(roundResult(blocked)).toEqual({ winner: 0, points: 7, blocked: true });
    expect(pips([[1, 2]])).toBe(3);
  });

  it('computer only picks legal tiles and sheds weight on Normal', () => {
    const s = state({ hands: [[], [[1, 2], [2, 6], [4, 4]]], chain: [[2, 2]], turn: 1 });
    expect(canMove(s, 1)).toBe(true);
    expect(chooseTile(s, 'normal')).toMatchObject({ index: 1 });
    for (const level of ['easy', 'hard'] as const) {
      const c = chooseTile(s, level);
      expect([0, 1]).toContain(c?.index);
    }
    expect(chooseTile(state({ hands: [[], [[5, 5]]], chain: [[1, 2]], turn: 1 }), 'hard')).toBeNull();
  });
});
