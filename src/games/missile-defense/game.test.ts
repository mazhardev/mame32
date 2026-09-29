import { describe, expect, it } from 'vitest';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { GROUND, create, fire, pickBattery, spec } from './game';

describe('missile defense', () => {
  it('fires from the nearest battery with ammunition', () => {
    const s = create('normal');
    expect(pickBattery(s, 50)).toBe(0);
    expect(pickBattery(s, 330)).toBe(1);
    s.batteries[0].ammo = 0;
    expect(pickBattery(s, 50)).toBe(1);
    expect(fire(s, 50, 100)).toBe(true);
    expect(s.batteries[1].ammo).toBe(9);
  });

  it('refuses to fire with no ammunition anywhere', () => {
    const s = create('normal');
    s.batteries.forEach((b) => (b.ammo = 0));
    expect(fire(s, 300, 100)).toBe(false);
  });

  it('destroys an enemy missile caught in a blast', () => {
    const s = create('normal');
    s.toSpawn = 0;
    s.missiles = [{ x0: 300, y0: 0, x: 300, y: 150, tx: 300, ty: GROUND, speed: 1, split: false }];
    s.blasts = [{ x: 300, y: 150, r: 0, t: 0.5, enemy: false }];
    simulate(spec, s, 0.1, emptyInput(), () => 0.5);
    expect(s.kills).toBe(1);
    expect(s.score).toBeGreaterThanOrEqual(25);
  });

  it('loses a city to a missile that lands on it', () => {
    const s = create('normal');
    s.toSpawn = 0;
    const city = s.cities[0];
    s.missiles = [{ x0: city.x, y0: GROUND - 5, x: city.x, y: GROUND - 1, tx: city.x, ty: GROUND, speed: 100, split: false }];
    simulate(spec, s, 0.1, emptyInput(), () => 0.5);
    expect(s.cities[0].alive).toBe(false);
  });

  it('ends when every city is gone', () => {
    const s = create('normal');
    s.cities.forEach((c) => (c.alive = false));
    simulate(spec, s, 0.1, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });
});
