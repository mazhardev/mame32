import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { cratesLeft, create, slideCrates, update } from './game';

describe('truck driving', () => {
  it('crates stay put on a level truck at rest', () => {
    const s = create('easy', () => 0.3);
    for (let i = 0; i < 120; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(cratesLeft(s)).toBe(s.crates.length);
  });

  it('a steep tilt makes crates slide off', () => {
    const s = create('normal', () => 0.3);
    s.truck.a = -0.8;
    for (let i = 0; i < 120; i++) slideCrates(s, 1 / 60, 0, 0);
    expect(cratesLeft(s)).toBeLessThan(s.crates.length);
  });

  it('reaching the depot with crates completes the delivery', () => {
    const s = create('easy', () => 0.3);
    s.truck.x = s.routeEnd + 1;
    update(s, 1 / 60, inputWith([]), () => 0.5);
    expect(s.delivered).toBeGreaterThan(0);
    expect(s.between).toBeGreaterThan(0);
  });
});
