import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { DRAWINGS } from '../_shared/creative/drawings';
import { PICTURES, makePuzzle, pickPictures, tap } from './engine';

describe('connect the dots', () => {
  it('makes the requested number of distinct dots for every drawing', () => {
    for (const d of DRAWINGS) {
      const p = makePuzzle(d, 20);
      expect(p.dots).toHaveLength(20);
      expect(p.labels).toHaveLength(20);
      for (let i = 1; i < p.dots.length; i++) {
        const [a, b] = [p.dots[i - 1], p.dots[i]];
        expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(0.5);
      }
    }
  });

  it('knows closed outlines and checks the order', () => {
    expect(
      makePuzzle(
        DRAWINGS.find((d) => d.id === 'star')!,
        10,
      ).closed,
    ).toBe(true);
    expect(tap(3, 3)).toBe('connect');
    expect(tap(3, 4)).toBe('wrong');
    expect(pickPictures(createRng(1).next)).toHaveLength(PICTURES);
  });
});
