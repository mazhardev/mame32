import { describe, expect, it } from 'vitest';
import { judge, odds, points } from './engine';
import type { Card } from '../_shared/cards/deck';

const c = (rank: number): Card => ({ id: `x${rank}${Math.random()}`, rank, suit: 'clubs', faceUp: true });

describe('higher or lower', () => {
  it('judges guesses with aces high and ties separate', () => {
    expect(judge(c(5), c(9), 'higher')).toBe('right');
    expect(judge(c(5), c(9), 'lower')).toBe('wrong');
    expect(judge(c(13), c(1), 'higher')).toBe('right');
    expect(judge(c(7), c(7), 'lower')).toBe('tie');
  });

  it('computes odds from the unseen cards and pays more for long shots', () => {
    const unseen = [c(2), c(3), c(10), c(12)];
    expect(odds(c(9), unseen, 'higher')).toBe(0.5);
    expect(odds(c(9), unseen, 'lower')).toBe(0.5);
    expect(points(0.5)).toBe(20);
    expect(points(0.9)).toBeLessThan(points(0.2));
  });
});
