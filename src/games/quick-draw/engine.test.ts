import { describe, expect, it } from 'vitest';
import { computerReaction, resolve, signalDelay } from './engine';

describe('quick draw', () => {
  it('the faster shot wins; an early shot is a foul', () => {
    expect(resolve(250, 300)).toEqual({ winner: 1, reason: 'faster', ms: 250 });
    expect(resolve(null, 300)).toEqual({ winner: 2, reason: 'faster', ms: 300 });
    expect(resolve(-1, null)).toEqual({ winner: 2, reason: 'foul', ms: null });
    expect(resolve(null, -1).winner).toBe(1);
  });

  it('the computer gets faster with difficulty and rounds', () => {
    expect(computerReaction('hard', 0, () => 0.5)).toBeLessThan(computerReaction('easy', 0, () => 0.5));
    expect(computerReaction('normal', 4, () => 0.5)).toBeLessThan(computerReaction('normal', 0, () => 0.5));
    expect(computerReaction('hard', 50, () => 0)).toBeGreaterThanOrEqual(170);
  });

  it('the signal pause is unpredictable but bounded', () => {
    expect(signalDelay(() => 0)).toBe(1200);
    expect(signalDelay(() => 1)).toBe(4000);
  });
});
