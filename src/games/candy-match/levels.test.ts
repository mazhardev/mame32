import { describe, expect, it } from 'vitest';
import { LEVELS_PER_PACK, SIZE, goalMet, goalProgress, levelSpec, stars } from './levels';

describe('candy match levels', () => {
  it('builds every level deterministically with a sensible goal', () => {
    for (const pack of ['easy', 'normal', 'hard'] as const) {
      for (let i = 0; i < LEVELS_PER_PACK; i++) {
        const spec = levelSpec(pack, i);
        expect(levelSpec(pack, i)).toEqual(spec);
        expect(spec.jelly).toHaveLength(SIZE * SIZE);
        expect(spec.moves).toBeGreaterThanOrEqual(15);
        if (spec.goal.kind === 'jelly') expect(spec.jelly.some((j) => j > 0)).toBe(true);
        else expect(spec.jelly.every((j) => j === 0)).toBe(true);
        if (spec.goal.kind === 'collect') {
          for (const t of spec.goal.targets) expect(t.color).toBeLessThan(spec.colors);
        }
      }
    }
  });

  it('gets harder through a pack', () => {
    const first = levelSpec('normal', 0);
    const last = levelSpec('normal', LEVELS_PER_PACK - 1);
    expect(last.moves).toBeLessThan(first.moves);
  });

  it('tracks each goal type', () => {
    const score = { kind: 'score' as const, target: 1000 };
    expect(goalMet(score, 999, [], [])).toBe(false);
    expect(goalMet(score, 1000, [], [])).toBe(true);
    expect(goalProgress(score, 500, [], [])).toBe(0.5);

    const collect = { kind: 'collect' as const, targets: [{ color: 1, count: 10 }, { color: 3, count: 10 }] };
    expect(goalMet(collect, 0, [0, 12, 0, 9], [])).toBe(false);
    expect(goalProgress(collect, 0, [0, 12, 0, 9], [])).toBe(0.95);
    expect(goalMet(collect, 0, [0, 10, 0, 10], [])).toBe(true);

    expect(goalMet({ kind: 'jelly' }, 0, [], [0, 1, 0])).toBe(false);
    expect(goalMet({ kind: 'jelly' }, 0, [], [0, 0, 0])).toBe(true);
  });

  it('awards stars by moves left', () => {
    expect(stars(8, 20)).toBe(3);
    expect(stars(3, 20)).toBe(2);
    expect(stars(0, 20)).toBe(1);
  });
});
