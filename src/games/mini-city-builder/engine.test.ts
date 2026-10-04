import { describe, expect, it } from 'vitest';
import {
  CAPACITY,
  COST,
  build,
  costOf,
  happinessAt,
  jobs,
  newCity,
  nextMonth,
  population,
  problem,
  validCity,
  working,
} from './engine';
import type { City } from './engine';
import { runBot } from './bot';

function flat(size = 8, money = 10_000): City {
  const c = newCity(1, 'normal', size);
  c.tiles.forEach((t) => (t.kind = 'empty'));
  c.money = money;
  return c;
}

describe('mini city builder', () => {
  it('generates the same map for a seed and validates saves', () => {
    expect(newCity(42, 'easy').tiles).toEqual(newCity(42, 'easy').tiles);
    const c = newCity(3, 'hard');
    expect(validCity(JSON.parse(JSON.stringify(c)))).toBe(true);
    expect(validCity({ ...c, tiles: c.tiles.slice(1) })).toBe(false);
    expect(validCity({ ...c, tiles: c.tiles.map((t) => ({ ...t, kind: 'castle' })) })).toBe(false);
  });

  it('charges for building, refuses water and occupied tiles', () => {
    const c = flat();
    c.tiles[0].kind = 'water';
    expect(build(c, 0, 'road')).toBe(false);
    expect(build(c, 1, 'house')).toBe(true);
    expect(c.money).toBe(10_000 - COST.house);
    expect(build(c, 1, 'shop')).toBe(false);
    c.tiles[2].kind = 'tree';
    expect(costOf(c, 2, 'road')).toBe(COST.road + 15);
  });

  it('buildings need a road and power to work', () => {
    const c = flat();
    build(c, 9, 'house');
    expect(problem(c, 9)).toMatch(/road/);
    build(c, 1, 'road');
    expect(problem(c, 9)).toMatch(/power/);
    build(c, 27, 'power');
    expect(working(c, 9)).toBe(true);
  });

  it('jobs bring residents, and residents pay taxes', () => {
    const c = flat();
    for (let x = 0; x < 8; x++) build(c, 8 + x, 'road');
    build(c, 27, 'power');
    build(c, 1, 'house');
    build(c, 2, 'house');
    build(c, 17, 'factory');
    expect(jobs(c)).toBe(25);
    const before = c.money;
    for (let m = 0; m < 6; m++) nextMonth(c, 'normal');
    expect(population(c)).toBeGreaterThan(0);
    expect(population(c)).toBeLessThanOrEqual(2 * CAPACITY[3]);
    expect(c.money).toBeGreaterThan(before);
  });

  it('parks make neighbours happier and factories make them sadder', () => {
    const c = flat();
    build(c, 27, 'power');
    const base = happinessAt(c, 18);
    build(c, 20, 'park');
    expect(happinessAt(c, 18)).toBe(base + 15);
    build(c, 34, 'factory');
    expect(happinessAt(c, 18)).toBe(base + 15 - 25);
  });

  it('upgrades shops and factories for more jobs', () => {
    const c = flat();
    for (let x = 0; x < 8; x++) build(c, 8 + x, 'road');
    build(c, 27, 'power');
    build(c, 17, 'shop');
    expect(jobs(c)).toBe(10);
    expect(build(c, 17, 'upgrade')).toBe(true);
    expect(jobs(c)).toBe(22);
    expect(costOf(c, 9, 'upgrade')).toBeNull();
  });

  it('a simple planner reaches the goal on every difficulty and map', () => {
    for (const d of ['easy', 'normal', 'hard'] as const)
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const r = runBot(seed, d, newCity);
        expect(r.won, `${d} seed ${seed}`).toBe(true);
      }
  });
});
