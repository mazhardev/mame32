import { describe, expect, it } from 'vitest';
import { applyStep, chooseSequence, initial, pipCount, result, sequences, stepsFor } from './engine';
import type { BGState } from './engine';

const empty = (turn: 1 | 2 = 1): BGState => ({ points: new Array(24).fill(0), bar: { 1: 0, 2: 0 }, off: { 1: 0, 2: 0 }, turn });

describe('backgammon', () => {
  it('starts with 15 checkers and 167 pips each', () => {
    const s = initial();
    expect(s.points.filter((n) => n > 0).reduce((a, b) => a + b)).toBe(15);
    expect(s.points.filter((n) => n < 0).reduce((a, b) => a - b, 0)).toBe(15);
    expect(pipCount(s, 1)).toBe(167);
    expect(pipCount(s, 2)).toBe(167);
  });

  it('cannot land on a point held by two opposing checkers', () => {
    const s = initial();
    // 24-point (index 23) with a 5 would land on index 18, owned by five black checkers.
    expect(stepsFor(s, 5).some((st) => st.from === 23)).toBe(false);
  });

  it('must enter from the bar first, and hits a blot', () => {
    const s = empty();
    s.bar[1] = 1;
    s.points[10] = 1;
    s.points[20] = -1;
    const steps = stepsFor(s, 4);
    expect(steps).toEqual([{ from: 24, to: 20, die: 4, hit: true }]);
    const after = applyStep(s, steps[0]);
    expect(after.bar[2]).toBe(1);
    expect(after.points[20]).toBe(1);
  });

  it('bears off exactly, or with a larger die from the highest point', () => {
    const s = empty();
    s.points[2] = 1; // 3-point
    s.points[0] = 1; // 1-point
    expect(stepsFor(s, 3).map((st) => st.from)).toEqual([2]);
    expect(stepsFor(s, 6).map((st) => st.from)).toEqual([2]);
    s.points[8] = 1; // a checker outside home: no bearing off at all
    expect(stepsFor(s, 1).some((st) => st.to < 0)).toBe(false);
  });

  it('plays four moves on doubles and uses the larger die when only one fits', () => {
    expect(sequences(initial(), [3, 3]).every((q) => q.length === 4)).toBe(true);
    // One checker on index 20; both dice together would land on the blocked index 12.
    const s = empty();
    s.points[20] = 1;
    s.points[12] = -2;
    const seqs = sequences(s, [6, 2]);
    expect(seqs).toEqual([[{ from: 20, to: 14, die: 6, hit: false }]]);
    // Nothing playable at all.
    const t = empty();
    t.points[7] = 1;
    t.points[1] = -2;
    t.points[3] = -2;
    expect(sequences(t, [6, 4])).toEqual([[]]);
  });

  it('scores gammons', () => {
    const s = empty();
    s.off[1] = 15;
    s.points[20] = -15;
    expect(result(s)).toEqual({ winner: 1, value: 2 });
    s.points[20] = 0;
    s.points[3] = -15; // still in the winner's home board
    expect(result(s)).toEqual({ winner: 1, value: 3 });
    s.off[2] = 1;
    expect(result(s)?.value).toBe(1);
  });

  it('the computer returns a legal, maximal sequence', () => {
    const s = { ...initial(), turn: 2 as const };
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const seq = chooseSequence(s, [6, 1], level);
      expect(seq).toHaveLength(2);
      const legal = sequences(s, [6, 1]).map((q) => JSON.stringify(q));
      expect(legal).toContain(JSON.stringify(seq));
    }
  });
});
