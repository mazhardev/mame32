import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { GROUND, create, spec, update } from './game';

describe('jumping ball', () => {
  it('bounces on its own without ever sinking into the ground', () => {
    const s = create('easy');
    let lowest = 0;
    for (let i = 0; i < 120; i++) {
      update(s, 1 / 60, emptyInput(), () => 0.99);
      lowest = Math.max(lowest, s.y);
    }
    expect(lowest).toBeLessThanOrEqual(GROUND);
  });

  it('a tap makes the next bounce higher', () => {
    const small = create('easy');
    const big = create('easy');
    small.y = big.y = GROUND - 14;
    small.vy = big.vy = 10;
    update(small, 1 / 60, emptyInput(), () => 0.99);
    update(big, 1 / 60, inputWith([], ['action']), () => 0.99);
    expect(big.vy).toBeLessThan(small.vy);
  });

  it('ends on collision and scores passed obstacles', () => {
    const s = create('normal');
    s.obstacles.push({ kind: 'wall', x: 400, w: 26, y: GROUND - 92, h: 92, passed: false });
    simulate(spec, s, 5, emptyInput(), () => 0.99);
    expect(s.over).toBe(true);
  });
});
