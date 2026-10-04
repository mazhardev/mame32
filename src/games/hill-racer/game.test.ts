import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { create, distance, update } from './game';

describe('hill racer', () => {
  it('gas drives forward and burns fuel', () => {
    const s = create('normal', () => 0.4);
    for (let i = 0; i < 180; i++) update(s, 1 / 60, inputWith(['right']), () => 0.5);
    expect(distance(s)).toBeGreaterThan(20);
    expect(s.fuel).toBeLessThan(100);
  });

  it('running dry ends the run once stopped', () => {
    const s = create('normal', () => 0.4);
    s.fuel = 0;
    for (let i = 0; i < 300 && !s.over; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
    expect(s.car.crashed).toBe(false);
  });

  it('driving over a fuel can refills the tank', () => {
    const s = create('easy', () => 0.4);
    s.fuel = 30;
    s.pickups.push({ x: s.car.x, kind: 'fuel', taken: false, lift: 18 });
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.fuel).toBeGreaterThan(90);
  });
});
