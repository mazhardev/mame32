import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT, LEVELS_PER_WORLD, ROWS, TILE, buildLevel, moverAt } from './levels';
import { SOLUTIONS } from './solutions';
import { finishX, replay } from './solver';

describe('leap quest levels', () => {
  it('has four worlds of four levels, each ending in a guardian', () => {
    expect(LEVEL_COUNT).toBe(16);
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const l = buildLevel(i);
      const bossLevel = i % LEVELS_PER_WORLD === LEVELS_PER_WORLD - 1;
      expect(l.grid).toHaveLength(l.cols * ROWS);
      if (bossLevel) {
        expect(l.boss, `${l.code} needs a boss`).not.toBeNull();
        expect(l.arenaX).not.toBeNull();
        expect(l.goalX).toBeNull();
        // The arena is exactly one screen wide.
        expect(l.cols * TILE - l.arenaX!).toBe(24 * TILE);
      } else {
        expect(l.goalX, `${l.code} needs a goal`).not.toBeNull();
        expect(l.boss).toBeNull();
      }
      // Pip starts standing on solid ground.
      const below = l.grid[Math.floor(l.start.y / TILE) * l.cols + Math.floor(l.start.x / TILE)];
      expect(below).toBe('#');
      // No markers are left in the playable grid.
      for (const g of l.grid) expect('@MmVvZebshfztE').not.toContain(g);
    }
  });

  it('builds the same level every time', () => {
    for (let i = 0; i < LEVEL_COUNT; i++) expect(buildLevel(i)).toEqual(buildLevel(i));
  });

  it('places movers within their range and enemies on the map', () => {
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const l = buildLevel(i);
      for (const m of l.movers) {
        for (let t = 0; t < m.period; t += 0.25) {
          const p = moverAt(m, t);
          expect(p.x).toBeGreaterThanOrEqual(Math.min(m.x0, m.x1) - 0.001);
          expect(p.x).toBeLessThanOrEqual(Math.max(m.x0, m.x1) + 0.001);
          expect(p.y).toBeGreaterThanOrEqual(Math.min(m.y0, m.y1) - 0.001);
          expect(p.y).toBeLessThanOrEqual(Math.max(m.y0, m.y1) + 0.001);
        }
      }
      for (const sp of l.spawns) {
        expect(sp.x).toBeGreaterThan(0);
        expect(sp.x).toBeLessThan(l.cols * TILE);
      }
    }
  });

  it('every level can be finished: the stored winning routes still work', () => {
    expect(SOLUTIONS).toHaveLength(LEVEL_COUNT);
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const l = buildLevel(i);
      const r = replay(l, SOLUTIONS[i]);
      expect(r.outcome, `${l.code} ${l.name}: route ends at x=${Math.round(r.x)} of ${finishX(l)} — re-run scripts/solve-leap-quest.ts`).toBe('goal');
    }
  });
});
