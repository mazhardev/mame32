import { describe, expect, it } from 'vitest';
import { average, nextTrial, score } from './engine';
import type { Trial } from './engine';

describe('reflex test', () => {
  it('averages only correct timed trials', () => {
    const trials: Trial[] = [
      { pad: 0, decoy: false, ms: 300, correct: true },
      { pad: 1, decoy: false, ms: 500, correct: true },
      { pad: 2, decoy: false, ms: 200, correct: false },
      { pad: 3, decoy: true, ms: null, correct: true },
    ];
    expect(average(trials)).toBe(400);
  });

  it('scores faster and more accurate tests higher', () => {
    const fast: Trial[] = Array.from({ length: 15 }, () => ({ pad: 0, decoy: false, ms: 250, correct: true }));
    const slow: Trial[] = fast.map((t) => ({ ...t, ms: 600 }));
    expect(score(fast)).toBeGreaterThan(score(slow));
  });

  it('only Hard produces decoys', () => {
    expect(nextTrial('normal', () => 0.01).decoy).toBe(false);
    expect(nextTrial('hard', () => 0.01).decoy).toBe(true);
  });
});
