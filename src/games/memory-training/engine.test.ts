import { describe, expect, it } from 'vitest';
import { BLOCK, isMatch, makeBlock, nextN, scoreBlock } from './engine';

describe('memory training (n-back)', () => {
  it('builds blocks with a sensible share of matches', () => {
    let seed = 11;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const seq = makeBlock(2, random);
    expect(seq).toHaveLength(BLOCK + 2);
    const matches = seq.filter((_, i) => isMatch(seq, i, 2)).length;
    expect(matches).toBeGreaterThan(1);
    expect(matches).toBeLessThan(15);
  });

  it('scores hits, misses, false alarms and correct rejections', () => {
    const seq = ['A', 'B', 'A', 'C', 'C'];
    // 2-back matches at index 2 only.
    const r = scoreBlock(seq, 2, [false, false, true, true, false]);
    expect(r).toEqual({ hits: 1, misses: 0, falseAlarms: 1, correctRejections: 1 });
  });

  it('adapts N to accuracy', () => {
    expect(nextN(2, { hits: 5, misses: 0, falseAlarms: 0, correctRejections: 15 })).toBe(3);
    expect(nextN(2, { hits: 0, misses: 6, falseAlarms: 6, correctRejections: 8 })).toBe(1);
    expect(nextN(1, { hits: 0, misses: 10, falseAlarms: 10, correctRejections: 0 })).toBe(1);
  });
});
