import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { POINTS, breakRock, create, spec, update } from './game';

const rng = () => 0.42;

describe('asteroid blaster', () => {
  it('splits large rocks into two medium, medium into two small', () => {
    const s = create('normal', rng);
    s.rocks = [s.rocks[0]];
    breakRock(s, 0, rng);
    expect(s.rocks.map((r) => r.size)).toEqual([2, 2]);
    expect(s.score).toBe(POINTS[3]);
    breakRock(s, 0, rng);
    expect(s.rocks.map((r) => r.size).sort()).toEqual([1, 1, 2]);
    const smalls = s.rocks.length;
    breakRock(s, s.rocks.findIndex((r) => r.size === 1), rng);
    expect(s.rocks.length).toBe(smalls - 1);
  });

  it('fires shots with a cooldown and a cap', () => {
    const s = create('normal', rng);
    s.rocks = [];
    s.wave = 1;
    update(s, 1 / 60, inputWith(['action']), rng);
    expect(s.shots).toHaveLength(1);
    update(s, 1 / 60, inputWith(['action']), rng);
    expect(s.shots).toHaveLength(1); // still cooling down
  });

  it('wraps around the screen edges', () => {
    const s = create('normal', rng);
    s.rocks = [{ x: 630, y: 10, vx: 100, vy: 0, size: 1, spin: 0, angle: 0, shape: [1] }];
    s.x = 300;
    s.y = 300;
    update(s, 0.2, emptyInput(), rng);
    expect(s.rocks[0].x).toBeLessThan(40);
  });

  it('loses a life when a rock hits the ship and ends with none left', () => {
    const s = create('normal', rng);
    s.invuln = 0;
    s.lives = 1;
    s.rocks = [{ x: s.x, y: s.y, vx: 0, vy: 0, size: 3, spin: 0, angle: 0, shape: [1] }];
    update(s, 1 / 60, emptyInput(), rng);
    expect(s.over).toBe(true);
  });

  it('starts the next wave when the field is clear', () => {
    const s = create('easy', rng);
    s.rocks = [];
    simulate(spec, s, 0.05, emptyInput(), rng);
    expect(s.wave).toBe(2);
    expect(s.rocks.length).toBeGreaterThan(0);
  });
});
