import { describe, expect, it } from 'vitest';
import { inputWith, simulate } from '../_shared/arcade/kit';
import { FLAP, create, spec, update } from './game';

const rng = () => 0.5;

describe('sky hopper', () => {
  it('falls without input and crashes into the ground', () => {
    const s = create('normal');
    simulate(spec, s, 5, undefined, rng);
    expect(s.over).toBe(true);
    expect(s.score).toBe(0);
  });

  it('flaps upward on a press', () => {
    const s = create('normal');
    update(s, 1 / 60, inputWith([], ['action']), rng);
    expect(s.vy).toBeLessThan(0);
    expect(s.vy).toBeGreaterThan(FLAP - 1);
    expect(s.events).toContain('jump');
  });

  it('scores a point for each tower passed when flying through the gap', () => {
    const s = create('easy');
    // Keep the bird level with the gaps (centred by the fixed random source).
    for (let i = 0; i < 60 * 8 && !s.over; i++) {
      const gap = s.towers.find((t) => t.x > 40)?.gapY ?? s.y;
      const press = s.y > gap + 20 && s.vy > -50;
      update(s, 1 / 60, inputWith([], press ? ['action'] : []), rng);
    }
    expect(s.score).toBeGreaterThan(2);
  });

  it('gives harder settings smaller gaps and faster towers', () => {
    expect(create('hard').gap).toBeLessThan(create('easy').gap);
    expect(create('hard').speed).toBeGreaterThan(create('easy').speed);
  });
});
