import { describe, expect, it } from 'vitest';
import { PUZZLES, blankPaint, complete, progress, validSave } from './engine';

describe('paint by number', () => {
  it('every picture uses its numbers and the background', () => {
    for (const p of PUZZLES) {
      expect(p.answer).toHaveLength(256);
      expect(new Set(p.answer).size).toBeGreaterThan(2);
      expect(Math.max(...p.answer)).toBeLessThan(p.colors.length);
    }
  });

  it('progress counts correctly painted cells', () => {
    const p = PUZZLES[0];
    const paint = blankPaint();
    expect(progress(p, paint)).toBe(0);
    const done = [...p.answer];
    expect(complete(p, done)).toBe(true);
    done[0] = (done[0] + 1) % p.colors.length;
    expect(complete(p, done)).toBe(false);
  });

  it('validates saves', () => {
    expect(
      validSave({
        current: { id: 'heart', paint: blankPaint(), mistakes: 0, seconds: 3 },
        done: [],
      }),
    ).toBe(true);
    expect(
      validSave({
        current: { id: 'nope', paint: blankPaint(), mistakes: 0, seconds: 3 },
        done: [],
      }),
    ).toBe(false);
  });
});
