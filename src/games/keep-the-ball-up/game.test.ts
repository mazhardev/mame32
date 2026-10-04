import { describe, expect, it } from 'vitest';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { create, kick, spec } from './game';

describe('keep the ball up', () => {
  it('kicks only when the tap is on the ball, away from the tap', () => {
    const s = create('normal');
    expect(kick(s, s.x + 200, s.y)).toBe(false);
    expect(kick(s, s.x - 15, s.y + 10)).toBe(true);
    expect(s.vy).toBeLessThan(0);
    expect(s.vx).toBeGreaterThan(0);
    expect(s.kicks).toBe(1);
  });

  it('ends when the ball lands', () => {
    const s = create('easy');
    simulate(spec, s, 5, emptyInput());
    expect(s.over).toBe(true);
  });
});
