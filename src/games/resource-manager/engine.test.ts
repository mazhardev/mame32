import { describe, expect, it } from 'vitest';
import {
  MODULE,
  TUNING,
  botDay,
  cancelProject,
  capacity,
  forecast,
  housing,
  idle,
  newColony,
  nextDay,
  setJob,
  slotsFor,
  startProject,
  validColony,
} from './engine';

describe('resource manager', () => {
  it('jobs are limited by free colonists and module slots', () => {
    const c = newColony(1);
    c.jobs = { farmer: 0, pumper: 0, miner: 0, engineer: 0 };
    setJob(c, 'farmer', 99);
    expect(c.jobs.farmer).toBe(slotsFor(c, 'farmer'));
    expect(idle(c)).toBeGreaterThanOrEqual(0);
    setJob(c, 'engineer', 99);
    expect(idle(c)).toBe(0);
  });

  it('forecasts food, water and power from the plan', () => {
    const c = newColony(1);
    c.jobs = { farmer: 2, pumper: 2, miner: 1, engineer: 1 };
    const f = forecast(c);
    expect(f.food).toBe(2 * 5 - 6);
    expect(f.water).toBe(2 * 6 - 2 - 6);
    expect(f.metal).toBe(3);
    expect(f.efficiency).toBe(1);
    c.storm = 2;
    expect(forecast(c).power.made).toBeLessThan(f.power.made);
  });

  it('brownouts reduce output when power runs short', () => {
    const c = newColony(1);
    c.modules.solar = 0;
    expect(forecast(c).efficiency).toBe(0);
    expect(forecast(c).food).toBe(-c.colonists);
  });

  it('engineers build projects; cancelling refunds half', () => {
    const c = newColony(1);
    c.res.metal = 100;
    expect(startProject(c, 'habitat')).toBe(true);
    expect(startProject(c, 'solar')).toBe(false);
    c.jobs = { farmer: 2, pumper: 2, miner: 0, engineer: 2 };
    for (let i = 0; i < 3; i++) nextDay(c, 'easy');
    expect(c.modules.habitat).toBe(3);
    expect(housing(c)).toBe(12);
    startProject(c, 'storage');
    const metal = c.res.metal;
    cancelProject(c);
    expect(c.res.metal).toBe(metal + MODULE.storage.metal / 2);
    expect(capacity(c)).toBe(60);
  });

  it('shortages cost health and eventually a colonist', () => {
    const c = newColony(1);
    c.res.food = 0;
    c.jobs = { farmer: 0, pumper: 2, miner: 0, engineer: 0 };
    for (let i = 0; i < 4; i++) nextDay(c, 'easy');
    expect(c.lost).toBe(1);
  });

  it('saves round-trip through the validator', () => {
    const c = newColony(3);
    expect(validColony(JSON.parse(JSON.stringify(c)))).toBe(true);
    expect(validColony({ ...c, colonists: 0 })).toBe(false);
    expect(validColony({ ...c, project: 'rocket' })).toBe(false);
  });

  it('a methodical planner reaches the goal on easy and normal, and usually on hard', () => {
    for (const d of ['easy', 'normal'] as const)
      for (let seed = 1; seed <= 8; seed++) {
        const c = newColony(seed);
        while (!c.over) {
          botDay(c);
          nextDay(c, d);
        }
        expect(c.over, `${d} ${seed}`).toBe('won');
        expect(c.colonists).toBeGreaterThanOrEqual(TUNING[d].goal);
      }
    let wins = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const c = newColony(seed);
      while (!c.over) {
        botDay(c);
        nextDay(c, 'hard');
      }
      if (c.over === 'won') wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(5);
  });
});
