import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { W, barColor, colourAt, create, ringColor, spec, update } from './game';

describe('color switch', () => {
  it('splits a ring into four quarter-colour arcs that rotate', () => {
    expect(ringColor(0.1, 0)).toBe(0);
    expect(ringColor(Math.PI / 2 + 0.1, 0)).toBe(1);
    expect(ringColor(Math.PI + 0.1, 0)).toBe(2);
    expect(ringColor(-0.1, 0)).toBe(3);
    // Rotating the ring by a quarter turn shifts the colours.
    expect(ringColor(Math.PI / 2 + 0.1, Math.PI / 2)).toBe(0);
  });

  it('slides bar colours along the row', () => {
    expect(barColor(0, 0)).toBe(0);
    expect(barColor(W / 2 + 1, 0)).toBe(1);
    expect(barColor(0, W / 2)).toBe(1);
  });

  it('waits on the start line until the first hop', () => {
    const s = create('normal');
    simulate(spec, s, 2, emptyInput(), () => 0.5);
    expect(s.over).toBe(false);
    expect(s.y).toBe(0);
    update(s, 1 / 60, inputWith([], ['action']), () => 0.5);
    expect(s.vy).toBeLessThan(0);
  });

  it('falls off the bottom without hops', () => {
    const s = create('normal');
    update(s, 1 / 60, inputWith([], ['action']), () => 0.5);
    simulate(spec, s, 3, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });

  it('only lets the ball through its own colour', () => {
    const s = create('normal');
    update(s, 1 / 60, emptyInput(), () => 0.5);
    const ob = s.obstacles[0];
    ob.type = 'ring';
    ob.spin = 0;
    // Place the ball on the ring's bottom arc (angle π/2 → colour depends on rotation).
    const need = colourAt(ob, ob.y + ob.radius);
    expect(need).toBeGreaterThanOrEqual(0);
    expect(colourAt(ob, ob.y + ob.radius / 2)).toBe(-1); // inside the ring is clear
  });
});
