import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { botPlay } from './bot';
import { CALIBRATION } from './calibration';
import { countChocolate, countIcing, countJelly, createState, findMove, findRuns, isFree } from './engine';
import { LEVEL_COUNT, LEVELS_PER_WORLD, WORLDS, allDone, goalStatus, level, stars } from './levels';

describe('candy match saga levels', () => {
  it('has eight worlds of fifteen calibrated levels', () => {
    expect(WORLDS).toHaveLength(8);
    expect(LEVEL_COUNT).toBe(120);
    expect(CALIBRATION).toHaveLength(LEVEL_COUNT);
    expect(LEVELS_PER_WORLD).toBe(15);
  });

  it('builds every level deterministically with goals that match its board', () => {
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const lvl = level(i);
      expect(level(i)).toEqual(lvl);
      expect(lvl.goals.length).toBeGreaterThan(0);
      expect(lvl.moves).toBeGreaterThanOrEqual(12);
      expect(lvl.moves).toBeLessThanOrEqual(50);
      const s = createState(lvl.layout, createRng(`t${i}`).next);
      expect(findRuns(s)).toHaveLength(0);
      expect(findMove(s)).not.toBeNull();
      // Every column with a playable cell can refill from the top.
      for (let c = 0; c < s.w; c++) {
        const top = Array.from({ length: s.h }, (_, r) => r * s.w + c).find((j) => s.cells[j].playable);
        if (top !== undefined) expect(isFree(s, top), `level ${i + 1} column ${c} is capped`).toBe(true);
      }
      for (const g of lvl.goals) {
        if (g.kind === 'jelly') expect(countJelly(s)).toBeGreaterThan(0);
        if (g.kind === 'icing') expect(countIcing(s)).toBeGreaterThan(0);
        if (g.kind === 'chocolate') expect(countChocolate(s)).toBeGreaterThan(0);
        if (g.kind === 'collect') expect(g.color).toBeLessThan(lvl.layout.colors);
        if (g.kind === 'score') expect(g.target).toBeGreaterThan(0);
        if (g.kind === 'ingredients') expect(lvl.layout.ingredients).toBe(g.count);
      }
    }
  });

  it('introduces each world’s mechanic', () => {
    const kinds = (w: number) => Array.from({ length: LEVELS_PER_WORLD }, (_, k) => level(w * LEVELS_PER_WORLD + k));
    expect(kinds(1).every((l) => l.layout.cells.some((c) => c.icing > 0))).toBe(true);
    expect(kinds(2).some((l) => l.goals.some((g) => g.kind === 'ingredients'))).toBe(true);
    expect(kinds(3).every((l) => l.layout.cells.some((c) => c.lock))).toBe(true);
    expect(kinds(4).some((l) => l.layout.cells.some((c) => c.chocolate))).toBe(true);
  });

  it('is beatable: a strong player clears sampled levels within their move limits', () => {
    let played = 0;
    let won = 0;
    for (let i = 0; i < LEVEL_COUNT; i += 8) {
      const lvl = level(i);
      for (const seed of ['a', 'b']) {
        played++;
        const r = botPlay(lvl, `test-${i}-${seed}`, lvl.moves);
        if (r.won) won++;
      }
    }
    expect(won / played).toBeGreaterThanOrEqual(0.75);
  });

  it('tracks goals and stars', () => {
    const lvl = level(0); // a collect level
    const s = createState(lvl.layout, createRng('g').next);
    const status = goalStatus(lvl, s, { score: 0, collected: [], state: s });
    expect(allDone(status)).toBe(false);
    const filled = lvl.goals.map((g) => (g.kind === 'collect' ? g.count : 0));
    const collected: number[] = [];
    lvl.goals.forEach((g, k) => g.kind === 'collect' && (collected[g.color] = filled[k]));
    expect(allDone(goalStatus(lvl, s, { score: 0, collected, state: s }))).toBe(true);

    expect(stars(10, 30)).toBe(3);
    expect(stars(4, 30)).toBe(2);
    expect(stars(0, 30)).toBe(1);
  });
});
