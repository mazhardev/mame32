import { describe, expect, it } from 'vitest';
import { DRAWINGS, samplePath, strokeLength } from './drawings';

describe('drawing library', () => {
  it.each(DRAWINGS.map((d) => [d.id, d] as const))('%s stays on the canvas', (_id, d) => {
    for (const s of d.strokes) {
      expect(s.length).toBeGreaterThanOrEqual(2);
      for (const [x, y] of s) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(100);
      }
    }
    expect(strokeLength(d.strokes[0])).toBeGreaterThan(60);
  });

  it('samples evenly along a path', () => {
    const pts = samplePath(
      [
        [0, 0],
        [100, 0],
      ],
      5,
    );
    expect(pts.map((p) => p[0])).toEqual([0, 25, 50, 75, 100]);
  });

  it('has unique ids', () => {
    expect(new Set(DRAWINGS.map((d) => d.id)).size).toBe(DRAWINGS.length);
  });
});
