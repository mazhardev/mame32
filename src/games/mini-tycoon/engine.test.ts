import { describe, expect, it } from 'vitest';
import {
  BUSINESSES,
  GOALS,
  PRICE,
  affordableCount,
  buyBusiness,
  cost,
  cycleTime,
  hireManager,
  incomeRate,
  newTycoon,
  run,
  tick,
  validTycoon,
} from './engine';
import type { Tycoon } from './engine';

/** A player who keeps every business running and reinvests greedily. */
function minutesToGoal(goal: number, price: number) {
  const t = newTycoon();
  for (let sec = 0; sec < 6 * 3600; sec++) {
    for (let k = 0; k < 10; k++) {
      for (const b of BUSINESSES) run(t, b.id);
      tick(t, 0.1);
    }
    if (t.total >= goal) return sec / 60;
    for (const b of BUSINESSES) if (!t.managers.includes(b.id)) hireManager(t, b.id, price);
    for (let k = 0; k < 30; k++) {
      let best: { id: string; value: number } | null = null;
      for (const b of BUSINESSES) {
        const n = t.owned[b.id];
        const gain =
          (b.profit * (n + 1)) / cycleTime(b, n + 1) - (n ? (b.profit * n) / cycleTime(b, n) : 0);
        const value = cost(b, n, 1, price) / gain;
        if (!best || value < best.value) best = { id: b.id, value };
      }
      const pick = best as { id: string; value: number } | null;
      if (!pick || !buyBusiness(t, pick.id, 1, price)) break;
    }
  }
  return Infinity;
}

describe('mini tycoon', () => {
  it('a business only earns while running; a manager keeps it going', () => {
    const t: Tycoon = newTycoon();
    tick(t, 5);
    expect(t.total).toBe(0);
    run(t, 'lemon');
    tick(t, 0.7);
    expect(t.total).toBe(1);
    expect(t.running.lemon).toBe(false);
    t.money = 2000;
    expect(hireManager(t, 'lemon', 1)).toBe(true);
    tick(t, 6);
    expect(t.total).toBeGreaterThan(9);
  });

  it('milestones double speed and bulk prices add up', () => {
    const b = BUSINESSES[1];
    expect(cycleTime(b, 25)).toBe(b.cycle / 2);
    expect(cycleTime(b, 100)).toBe(b.cycle / 8);
    const t = newTycoon();
    t.money = cost(b, 0, 5, 1);
    expect(affordableCount(b, t, 1)).toBe(5);
    expect(buyBusiness(t, b.id, 5, 1)).toBe(true);
    expect(t.money).toBeCloseTo(0, 6);
    expect(incomeRate(t)).toBeGreaterThan(0);
  });

  it('goals take a reasonable session on every difficulty', () => {
    const m = (['easy', 'normal', 'hard'] as const).map((d) => minutesToGoal(GOALS[d], PRICE[d]));
    expect(m[0]).toBeLessThan(m[1]);
    expect(m[1]).toBeLessThan(m[2]);
    expect(m[0]).toBeGreaterThan(4);
    expect(m[2]).toBeLessThan(80);
  });

  it('validates saves', () => {
    expect(validTycoon(newTycoon())).toBe(true);
    expect(validTycoon({ ...newTycoon(), managers: ['nope'] })).toBe(false);
  });
});
