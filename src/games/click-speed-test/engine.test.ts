import { describe, expect, it } from 'vitest';
import { DURATION, cps, rank } from './engine';

describe('click speed test', () => {
  it('computes clicks per second', () => {
    expect(cps(50, 10)).toBe(5);
    expect(cps(37, 5)).toBe(7.4);
    expect(cps(10, 0)).toBe(0);
  });

  it('ranks faster rates higher and scales length with difficulty', () => {
    expect(rank(13)).toBe('Lightning fingers');
    expect(rank(2)).toBe('Warming up');
    expect(DURATION.easy).toBeLessThan(DURATION.hard);
  });
});
