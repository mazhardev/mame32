import { describe, expect, it } from 'vitest';
import { applyCall, flip, newState } from './engine';

describe('coin toss', () => {
  it('flips both sides', () => {
    expect(flip(() => 0.1)).toBe('heads');
    expect(flip(() => 0.9)).toBe('tails');
  });

  it('tracks streaks and lives', () => {
    let s = newState('normal');
    s = applyCall(s, 'heads', 'heads');
    s = applyCall(s, 'tails', 'tails');
    expect(s.streak).toBe(2);
    s = applyCall(s, 'heads', 'tails');
    expect(s.streak).toBe(0);
    expect(s.bestStreak).toBe(2);
    expect(s.lives).toBe(1);
    expect(s.correct).toBe(2);
  });

  it('difficulty sets the number of lives', () => {
    expect(newState('easy').lives).toBe(3);
    expect(newState('hard').lives).toBe(1);
  });
});
