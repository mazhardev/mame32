import { describe, expect, it } from 'vitest';
import { SHAPES, TUNING, accuracy, normalise } from './engine';
import type { Pt } from '../_shared/creative/drawings';

const shape = (id: string) => SHAPES.find((s) => s.id === id)!;

describe('shape drawing', () => {
  it('a perfect copy scores almost 100%, even when drawn bigger and elsewhere', () => {
    const circle = shape('circle');
    const big = circle.strokes.map((s) => s.map(([x, y]): Pt => [x * 7 + 120, y * 7 + 40]));
    expect(accuracy(big, circle, TUNING.normal.tolerance)).toBeGreaterThan(0.97);
  });

  it('the wrong shape scores much lower', () => {
    const square = shape('square');
    const circle = shape('circle');
    expect(accuracy(square.strokes, circle, TUNING.normal.tolerance)).toBeLessThan(0.8);
    expect(accuracy(shape('star').strokes, circle, TUNING.normal.tolerance)).toBeLessThan(
      accuracy(circle.strokes, circle, TUNING.normal.tolerance),
    );
  });

  it('a wobbly circle scores well on Easy but less on Hard', () => {
    const wobbly = [
      shape('circle').strokes[0].map(([x, y], i): Pt => [
        x + Math.sin(i) * 3,
        y + Math.cos(i * 1.7) * 3,
      ]),
    ];
    const easy = accuracy(wobbly, shape('circle'), TUNING.easy.tolerance);
    const hard = accuracy(wobbly, shape('circle'), TUNING.hard.tolerance);
    expect(easy).toBeGreaterThan(hard);
    expect(easy).toBeGreaterThan(0.75);
  });

  it('normalises into a unit box', () => {
    const n = normalise(shape('square').strokes);
    for (const [x, y] of n) {
      expect(Math.abs(x)).toBeLessThanOrEqual(0.5001);
      expect(Math.abs(y)).toBeLessThanOrEqual(0.5001);
    }
  });
});
