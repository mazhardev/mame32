import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { create, spec, update, zapperDistance } from './game';

describe('jetpack runner', () => {
  it('rises while thrusting and falls otherwise', () => {
    const s = create('normal');
    const start = s.y;
    for (let i = 0; i < 20; i++) update(s, 1 / 60, inputWith(['action']), () => 0.99);
    expect(s.y).toBeLessThan(start);
    const high = s.y;
    for (let i = 0; i < 40; i++) update(s, 1 / 60, emptyInput(), () => 0.99);
    expect(s.y).toBeGreaterThan(high);
  });

  it('measures distance to a zapper beam', () => {
    const z = { x: 100, y: 100, len: 100, angle: 0, spin: 0 };
    expect(zapperDistance(z, 100, 110)).toBeCloseTo(10);
    expect(zapperDistance(z, 170, 100)).toBeCloseTo(20); // past the end of the beam
  });

  it('crashes into a zapper in its path', () => {
    const s = create('normal');
    s.nextObstacle = 99;
    s.nextRocket = 99;
    s.zappers.push({ x: 160, y: s.y, len: 120, angle: Math.PI / 2, spin: 0 });
    simulate(spec, s, 0.5, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });

  it('warns before a rocket launches', () => {
    const s = create('hard');
    s.nextObstacle = 99;
    s.nextRocket = 0.01;
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.rockets).toHaveLength(1);
    expect(s.rockets[0].warn).toBeGreaterThan(0.9);
  });
});
