import { describe, expect, it } from 'vitest';
import { H, LEVELS, W, generateScene, hitDifference, paletteFor, scoreFor } from './engine';

describe('spot the difference scenes', () => {
  it('makes exactly the planned number of visible changes', () => {
    for (const diff of ['easy', 'normal', 'hard'] as const) {
      for (let seed = 0; seed < 15; seed++) {
        const scene = generateScene(diff, `sd-${diff}-${seed}`);
        expect(scene.diffs).toHaveLength(LEVELS[diff].diffs);
        expect(new Set(scene.diffs.map((d) => d.id)).size).toBe(scene.diffs.length);
        for (const d of scene.diffs) {
          const before = scene.left.find((o) => o.id === d.id);
          const after = scene.right.find((o) => o.id === d.id);
          if (d.type === 'missing') expect(after).toBeUndefined();
          if (d.type === 'extra') expect(before).toBeUndefined();
          if (d.type === 'color') {
            expect(after!.color).not.toBe(before!.color);
            expect(paletteFor(before!.kind).length).toBeGreaterThan(1);
          }
          if (d.type === 'size') expect(after!.size).not.toBeCloseTo(before!.size);
          if (d.type === 'flip') expect(after!.flip).toBe(!before!.flip);
          expect(d.x).toBeGreaterThanOrEqual(0);
          expect(d.x).toBeLessThanOrEqual(W);
          expect(d.y).toBeLessThanOrEqual(H);
        }
        // Everything else is identical in both pictures.
        const changed = new Set(scene.diffs.map((d) => d.id));
        const same = scene.left.filter((o) => !changed.has(o.id));
        for (const o of same) expect(scene.right.find((r) => r.id === o.id)).toEqual(o);
      }
    }
  });

  it('matches taps to the nearest unfound difference only', () => {
    const scene = generateScene('normal', 'tap');
    const d = scene.diffs[0];
    expect(hitDifference(scene, new Set(), d.x + 2, d.y - 2)?.id).toBe(d.id);
    expect(hitDifference(scene, new Set([d.id]), d.x, d.y)?.id).not.toBe(d.id);
  });

  it('scores finds, time left and penalties', () => {
    expect(scoreFor(5, 5, 30, 0, 0)).toBe(750 + 150);
    expect(scoreFor(3, 5, 30, 2, 1)).toBe(450 - 50 - 100);
  });
});
