import { describe, expect, it } from 'vitest';
import { advance, isCorrect, makeSequence, start } from './engine';

describe('memory sequence', () => {
  it('makes sequences without immediate repeats', () => {
    let seed = 5;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const s = makeSequence(30, random);
    expect(s).toHaveLength(30);
    s.forEach((d, i) => i && expect(d).not.toBe(s[i - 1]));
  });

  it('checks forwards normally and backwards on hard', () => {
    expect(isCorrect([1, 2, 3], [1, 2, 3], 'normal')).toBe(true);
    expect(isCorrect([1, 2, 3], [3, 2, 1], 'normal')).toBe(false);
    expect(isCorrect([1, 2, 3], [3, 2, 1], 'hard')).toBe(true);
  });

  it('grows on success and ends after two misses at one length', () => {
    let s = start('easy');
    s = advance(s, true).state;
    expect(s.length).toBe(4);
    expect(s.best).toBe(3);
    const first = advance(s, false);
    expect(first.over).toBe(false);
    expect(advance(first.state, false).over).toBe(true);
  });
});
