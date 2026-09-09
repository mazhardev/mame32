import { describe, expect, it } from 'vitest';
import { createRng, hashString, shuffleWith, todayKey } from './random';

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng('daily:2026-09-09');
    const b = createRng('daily:2026-09-09');
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = Array.from({ length: 10 }, createRng('seed-a').next);
    const b = Array.from({ length: 10 }, createRng('seed-b').next);
    expect(a).not.toEqual(b);
  });

  it('stays within [0, 1)', () => {
    const rng = createRng(42);
    for (let i = 0; i < 500; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int() respects the half-open range', () => {
    const rng = createRng('ints');
    for (let i = 0; i < 300; i++) {
      const v = rng.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThan(7);
    }
  });

  it('shuffle is a permutation', () => {
    const rng = createRng('shuffle');
    const input = Array.from({ length: 52 }, (_, i) => i);
    const out = rng.shuffle(input.slice());
    expect(out.slice().sort((a, b) => a - b)).toEqual(input);
  });

  it('shuffle with the same seed is reproducible', () => {
    const deck = () => Array.from({ length: 52 }, (_, i) => i);
    expect(createRng('deal-1').shuffle(deck())).toEqual(createRng('deal-1').shuffle(deck()));
  });
});

describe('shuffleWith', () => {
  it('touches every position with a full Fisher-Yates pass', () => {
    // A rand() that always returns 0 rotates the array deterministically.
    const out = shuffleWith([1, 2, 3, 4], () => 0);
    expect(out).toEqual([2, 3, 4, 1]);
  });
});

describe('hashString', () => {
  it('is stable and unsigned', () => {
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).toBeGreaterThanOrEqual(0);
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});

describe('todayKey', () => {
  it('formats a local calendar date', () => {
    expect(todayKey(new Date(2026, 8, 9))).toBe('2026-09-09');
    expect(todayKey(new Date(2026, 0, 1))).toBe('2026-01-01');
  });
});
