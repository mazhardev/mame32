import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { DRAWINGS } from '../_shared/creative/drawings';
import { ROUNDS, choicesFor, pickRounds, pointsFor, strokeProgress } from './engine';

describe('drawing guess', () => {
  it('earlier guesses score more', () => {
    expect(pointsFor(0)).toBe(100);
    expect(pointsFor(1)).toBe(20);
    expect(pointsFor(0.5)).toBeGreaterThan(pointsFor(0.8));
  });

  it('choices include the answer, are unique and prefer lookalikes', () => {
    const rng = createRng(1).next;
    const house = DRAWINGS.find((d) => d.id === 'house')!;
    const c = choicesFor(house, 4, rng);
    expect(c).toHaveLength(4);
    expect(new Set(c).size).toBe(4);
    expect(c).toContain('House');
    expect(c).toContain('Tent');
  });

  it('strokes draw in order', () => {
    const d = DRAWINGS[0];
    const half = strokeProgress(d, 0.5);
    expect(half[0]).toBeGreaterThan(0);
    expect(half[half.length - 1]).toBe(0);
    const all = strokeProgress(d, 1);
    expect(all.every((v) => v > 0)).toBe(true);
    expect(pickRounds(createRng(2).next)).toHaveLength(ROUNDS);
  });
});
