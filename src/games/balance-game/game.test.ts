import { describe, expect, it } from 'vitest';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { create, spec, step } from './game';

describe('balance game', () => {
  it('falls on its own without help', () => {
    const s = create('normal', () => 0.9);
    simulate(spec, s, 20, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });

  it('driving under the lean pushes the pole back towards upright', () => {
    const idle = create('easy', () => 0.5);
    const helped = create('easy', () => 0.5);
    idle.angle = helped.angle = 0.3;
    for (let i = 0; i < 20; i++) {
      step(idle, 1 / 120, 0);
      step(helped, 1 / 120, 900);
    }
    expect(helped.angle).toBeLessThan(idle.angle);
  });

  it('a simple controller can keep it up', () => {
    const s = create('easy', () => 0.5);
    s.gustStrength = 0;
    for (let i = 0; i < 1200 && !s.over; i++) {
      const accel = Math.max(-900, Math.min(900, 2500 * s.angle + 400 * s.omega));
      for (let k = 0; k < 4; k++) step(s, 1 / 240, accel);
    }
    expect(Math.abs(s.angle)).toBeLessThan(0.3);
  });
});
