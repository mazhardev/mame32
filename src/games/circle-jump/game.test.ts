import { describe, expect, it } from 'vitest';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { create, launch, spec, update } from './game';

describe('circle jump', () => {
  it('orbits until launched', () => {
    const s = create('easy', () => 0.5);
    const a = s.angle;
    update(s, 0.1, emptyInput(), () => 0.5);
    expect(s.on).toBe(0);
    expect(s.angle).not.toBe(a);
  });

  it('a launch aimed at the next ring is caught', () => {
    const s = create('normal', () => 0.5);
    const next = s.rings[1];
    const ring = s.rings[0];
    // Find an orbit angle whose tangent points at the next ring, then launch.
    let caught = false;
    for (let k = 0; k < 720 && !caught; k++) {
      const t = create('normal', () => 0.5);
      t.angle = (k / 720) * Math.PI * 2;
      t.bx = ring.x + Math.cos(t.angle) * ring.r;
      t.by = ring.y + Math.sin(t.angle) * ring.r;
      launch(t);
      for (let i = 0; i < 120 && t.on < 0 && !t.over; i++) update(t, 1 / 60, emptyInput(), () => 0.5);
      if (t.on === 1) {
        caught = true;
        expect(t.score).toBeGreaterThan(0);
        expect(Math.hypot(t.bx - next.x, t.by - next.y)).toBeCloseTo(next.r, 0);
      }
    }
    expect(caught).toBe(true);
    expect(s.on).toBe(0);
  });

  it('a wild launch is lost in space', () => {
    const s = create('easy', () => 0.5);
    s.angle = 0;
    s.rings = [s.rings[0]];
    launch(s);
    simulate(spec, s, 3, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });
});
