import { describe, expect, it } from 'vitest';
import { SPRITES } from '../_shared/creative/sprites';
import { floodFill } from '../_shared/creative/PixelGrid';
import { accuracy, blank, mirrorOf, spriteCells, validSave } from './engine';

describe('pixel art', () => {
  it('a perfect copy scores 100% and an empty canvas 0%', () => {
    const t = spriteCells(SPRITES[0]);
    expect(accuracy(t, t)).toBe(1);
    expect(accuracy(blank(16), t)).toBe(0);
    const half = [...t];
    let changed = 0;
    for (let i = 0; i < half.length && changed < 10; i++)
      if (half[i]) {
        half[i] = '#123456';
        changed++;
      }
    expect(accuracy(half, t)).toBeLessThan(1);
    expect(accuracy(half, t)).toBeGreaterThan(0.8);
  });

  it('fills a closed area and mirrors across the middle', () => {
    const cells = blank(4);
    cells[1] = '#000000';
    cells[4] = '#000000';
    const filled = floodFill(cells, 4, 0, '#ff0000');
    expect(filled[0]).toBe('#ff0000');
    expect(filled[5]).toBeNull();
    expect(mirrorOf(0, 16)).toBe(15);
    expect(mirrorOf(17, 16)).toBe(30);
  });

  it('validates saved galleries', () => {
    expect(validSave({ gallery: [{ size: 16, cells: blank(16), savedAt: 1 }] })).toBe(true);
    expect(validSave({ gallery: [{ size: 16, cells: ['javascript:'], savedAt: 1 }] })).toBe(false);
  });
});
