import { describe, expect, it } from 'vitest';
import {
  COST,
  GOALS,
  MAX_SHAFTS,
  bottleneck,
  digShaft,
  elevatorCost,
  elevatorRate,
  income,
  newMine,
  newShaftCost,
  production,
  shaftCost,
  tick,
  upgradeElevator,
  upgradeShaft,
  upgradeWarehouse,
  validMine,
  warehouseCost,
  warehouseRate,
} from './engine';
import type { Mine } from './engine';

/** Fixes whichever stage is the bottleneck, or digs deeper when it can. */
function minutesToGoal(goal: number, k: number) {
  const m: Mine = newMine();
  for (let sec = 0; sec < 4 * 3600; sec++) {
    tick(m, 1);
    if (m.total >= goal) return sec / 60;
    for (let n = 0; n < 20; n++) {
      if (
        m.shafts.length < MAX_SHAFTS &&
        newShaftCost(m.shafts.length, k) < m.money * 0.6 &&
        bottleneck(m) === 'shafts' &&
        digShaft(m, k)
      )
        continue;
      const b = bottleneck(m);
      let ok = false;
      if (b === 'elevator') ok = upgradeElevator(m, k);
      else if (b === 'warehouse') ok = upgradeWarehouse(m, k);
      else {
        // Upgrade the shaft with the best value per coin.
        let best = 0;
        m.shafts.forEach((l, i) => {
          if (shaftCost(i, l, k) / (i + 1) < shaftCost(best, m.shafts[best], k) / (best + 1))
            best = i;
        });
        ok = upgradeShaft(m, best, k);
      }
      if (!ok) break;
    }
  }
  return Infinity;
}

describe('idle miner', () => {
  it('income is limited by the slowest stage', () => {
    const m = newMine();
    expect(income(m)).toBe(Math.min(production(m), elevatorRate(1, 1), warehouseRate(1)));
    m.shafts[0] = 40;
    expect(bottleneck(m)).not.toBe('shafts');
  });

  it('ore flows from shafts to the surface to money', () => {
    const m = newMine();
    tick(m, 10);
    expect(m.total).toBeGreaterThan(0);
    expect(m.total).toBeLessThanOrEqual(production(m) * 10 + 1e-9);
    expect(m.stash[0] + m.surface + m.money).toBeCloseTo(production(m) * 10, 6);
  });

  it('upgrades cost money and raise throughput', () => {
    const m = newMine();
    m.money = 1e6;
    const e = elevatorRate(m.elevator, 1);
    expect(upgradeElevator(m, 1)).toBe(true);
    expect(elevatorRate(m.elevator, 1)).toBeGreaterThan(e);
    expect(upgradeWarehouse(m, 1)).toBe(true);
    expect(digShaft(m, 1)).toBe(true);
    expect(m.shafts).toHaveLength(2);
    expect(elevatorCost(2, 1)).toBeGreaterThan(elevatorCost(1, 1));
    expect(warehouseCost(1, 2)).toBe(warehouseCost(1, 1) * 2);
  });

  it('goals take a reasonable session', () => {
    const m = (['easy', 'normal', 'hard'] as const).map((d) => minutesToGoal(GOALS[d], COST[d]));
    expect(m[0]).toBeLessThan(m[1]);
    expect(m[1]).toBeLessThan(m[2]);
    expect(m[0]).toBeGreaterThan(4);
    expect(m[2]).toBeLessThan(80);
  });

  it('validates saves', () => {
    expect(validMine(newMine())).toBe(true);
    expect(validMine({ ...newMine(), stash: [] })).toBe(false);
  });
});
