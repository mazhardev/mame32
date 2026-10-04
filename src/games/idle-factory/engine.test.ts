import { describe, expect, it } from 'vitest';
import {
  GOALS,
  GROWTH,
  MACHINES,
  UPGRADES,
  buyMachine,
  buyUpgrade,
  flow,
  machineCost,
  newFactory,
  tick,
  unlocked,
  validFactory,
} from './engine';
import type { Factory } from './engine';

/** A planner that buys whatever adds the most income per coin. */
function minutesToGoal(goal: number, growth: number) {
  const f = newFactory();
  for (let sec = 0; sec < 4 * 3600; sec++) {
    tick(f, 1);
    if (f.made.robot >= goal) return sec / 60;
    for (let k = 0; k < 10; k++) {
      const base = flow(f).income;
      let best: { act: () => boolean; value: number } | null = null;
      MACHINES.forEach((m, i) => {
        if (!unlocked(f, i)) return;
        const counts = { ...f.machines, [m.id]: f.machines[m.id] + 1 };
        // Robots are the goal, so value them above their sale price.
        const fl = flow(f, counts);
        const gain = fl.income - base + fl.made.robot * 400;
        const value = gain / machineCost(f, m.id, growth);
        if (!best || value > best.value) best = { act: () => buyMachine(f, m.id, growth), value };
      });
      for (const u of UPGRADES) {
        if (f.upgrades.includes(u.id)) continue;
        const after = flow({ ...f, upgrades: [...f.upgrades, u.id] });
        const value = (after.income - base + after.made.robot * 400) / u.cost;
        if (!best || value > best.value) best = { act: () => buyUpgrade(f, u.id), value };
      }
      const pick = best as { act: () => boolean; value: number } | null;
      if (!pick || !pick.act()) break;
    }
  }
  return Infinity;
}

describe('idle factory', () => {
  it('machines starve without inputs', () => {
    const f: Factory = newFactory();
    f.machines = { drill: 1, smelter: 4, press: 0, assembler: 0, lab: 0 };
    const fl = flow(f);
    expect(fl.made.ingot).toBeCloseTo(1);
    expect(fl.busy.smelter).toBeCloseTo(0.25);
    expect(fl.sold.ore).toBeCloseTo(0);
  });

  it('surplus is sold and income accumulates', () => {
    const f = newFactory();
    f.machines.drill = 3;
    f.machines.smelter = 1;
    const fl = flow(f);
    expect(fl.sold.ore).toBeCloseTo(4);
    expect(fl.income).toBeCloseTo(4 + 1 * 3);
    tick(f, 10);
    expect(f.money).toBeCloseTo(25 + 70);
  });

  it('a balanced chain reaches each robot goal in a session', () => {
    const m = (['easy', 'normal', 'hard'] as const).map((d) => minutesToGoal(GOALS[d], GROWTH[d]));
    expect(m[0]).toBeLessThan(m[1]);
    expect(m[1]).toBeLessThan(m[2]);
    expect(m[0]).toBeGreaterThan(4);
    expect(m[2]).toBeLessThan(80);
  });

  it('validates saves', () => {
    expect(validFactory(newFactory())).toBe(true);
    expect(validFactory({ ...newFactory(), upgrades: ['x'] })).toBe(false);
  });
});
