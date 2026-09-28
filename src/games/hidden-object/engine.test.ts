import { describe, expect, it } from 'vitest';
import { H, ITEMS, LEVELS, W, generateScene, itemAt, scoreFor } from './engine';

describe('hidden object scenes', () => {
  it('has unique item names', () => {
    expect(new Set(ITEMS.map(([, n]) => n)).size).toBe(ITEMS.length);
    expect(new Set(ITEMS.map(([e]) => e)).size).toBe(ITEMS.length);
  });

  it('places every target exactly once, inside the picture', () => {
    for (const diff of ['easy', 'normal', 'hard'] as const) {
      for (let seed = 0; seed < 15; seed++) {
        const scene = generateScene(diff, `ho-${diff}-${seed}`);
        expect(scene.targets).toHaveLength(LEVELS[diff].targets);
        for (const t of scene.targets) expect(scene.placed.filter((p) => p.item === t)).toHaveLength(1);
        for (const p of scene.placed) {
          expect(p.x - p.size / 2).toBeGreaterThanOrEqual(0);
          expect(p.x + p.size / 2).toBeLessThanOrEqual(W);
          expect(p.y + p.size / 2).toBeLessThanOrEqual(H);
        }
      }
    }
  });

  it('finds the topmost item under a tap', () => {
    const scene = generateScene('easy', 'tap');
    const target = scene.placed.find((p) => p.item === scene.targets[0])!;
    const hit = itemAt(scene, target.x, target.y);
    expect(hit).not.toBeNull();
    // Whatever is hit is drawn at or after the target (on top of it).
    expect(scene.placed.indexOf(hit!)).toBeGreaterThanOrEqual(scene.placed.indexOf(target));
    expect(itemAt(scene, -50, -50)).toBeNull();
  });

  it('scores finds and time, minus misses and hints', () => {
    expect(scoreFor(6, 6, 40, 0, 0)).toBe(720 + 200);
    expect(scoreFor(4, 6, 40, 3, 1)).toBe(480 - 60 - 80);
  });
});
