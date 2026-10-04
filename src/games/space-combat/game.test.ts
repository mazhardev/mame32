import { describe, expect, it } from 'vitest';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { W, create, delta, hit, physics, spec } from './game';

describe('space combat', () => {
  it('keeps momentum after thrusting', () => {
    const s = create('normal');
    physics(s.me, 0, true, 0.5);
    const v = Math.hypot(s.me.vx, s.me.vy);
    physics(s.me, 1, false, 0.5);
    expect(Math.hypot(s.me.vx, s.me.vy)).toBeGreaterThan(v * 0.8);
  });

  it('measures distance across the wrapping edges', () => {
    expect(delta(5, 100, W - 5, 100)[0]).toBe(-10);
  });

  it('shields absorb hits before the hull', () => {
    const s = create('normal');
    hit(s.me);
    expect(s.me.hull).toBe(4);
    s.me.shield = 0;
    hit(s.me);
    expect(s.me.hull).toBe(3);
  });

  it('a drifting player is shot down', () => {
    const s = create('hard');
    simulate(spec, s, 120, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });
});
