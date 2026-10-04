import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { PLAYER_H, create, spec, update } from './game';

describe('traffic racer', () => {
  it('accelerates and brakes within limits', () => {
    const s = create('normal');
    for (let i = 0; i < 300; i++) update(s, 1 / 60, inputWith(['up']), () => 0.99);
    expect(s.speed).toBe(s.maxSpeed);
    for (let i = 0; i < 300; i++) update(s, 1 / 60, inputWith(['down']), () => 0.99);
    expect(s.speed).toBe(180);
  });

  it('a close pass at speed is a near miss', () => {
    const s = create('normal');
    s.speed = 450;
    s.spawnIn = 99;
    s.road.traffic.push({ x: s.x + 55, y: 600 - 110 + PLAYER_H / 2 - 2, w: 50, h: 90, speed: 200, color: 'red', kind: 'car', passed: false, changing: 0, targetX: s.x + 55 });
    update(s, 1 / 60, emptyInput(), () => 0.99);
    expect(s.nearMisses).toBe(1);
    expect(s.combo).toBe(1);
  });

  it('a car in your lane ends the run', () => {
    const s = create('hard');
    s.road.traffic.push({ x: s.x, y: 300, w: 50, h: 90, speed: 100, color: 'red', kind: 'car', passed: false, changing: 0, targetX: s.x });
    simulate(spec, s, 5, emptyInput(), () => 0.99);
    expect(s.over).toBe(true);
  });
});
