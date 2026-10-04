import { describe, expect, it } from 'vitest';
import { emptyInput } from '../_shared/arcade/kit';
import { create, parked, update } from './game';
import { LEVELS } from './levels';

describe('parking challenge', () => {
  it('stopping inside the bay, lined up, completes the level', () => {
    const s = create('normal');
    s.car.x = LEVELS[0].bay.x;
    s.car.y = LEVELS[0].bay.y;
    expect(parked(s)).toBe(true);
    for (let i = 0; i < 60 && s.between === 0; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.score).toBeGreaterThan(0);
    for (let i = 0; i < 120; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.level).toBe(1);
  });

  it('a crooked car does not count as parked', () => {
    const s = create('hard');
    s.car.x = LEVELS[0].bay.x;
    s.car.y = LEVELS[0].bay.y;
    s.car.angle += 0.3;
    expect(parked(s)).toBe(false);
  });

  it('hitting a parked car costs a life and resets the level', () => {
    const s = create('normal');
    s.car.x = 220;
    s.car.y = 100;
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.lives).toBe(2);
    expect(s.car.y).toBe(LEVELS[0].start.y);
  });
});
