import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { create, inOncoming, update } from './game';

describe('motorcycle racing', () => {
  it('cannot steer during a wheelie', () => {
    const s = create('normal');
    s.spawnIn = 999;
    s.speed = 400;
    for (let i = 0; i < 30; i++) update(s, 1 / 60, inputWith(['action']), () => 0.5);
    expect(s.wheelie).toBeGreaterThan(0.5);
    const x = s.x;
    update(s, 1 / 60, inputWith(['action', 'left']), () => 0.5);
    expect(s.x).toBe(x);
  });

  it('oncoming lanes double the points', () => {
    const a = create('normal');
    const b = create('normal');
    a.spawnIn = b.spawnIn = 999;
    b.x = 100;
    expect(inOncoming(b)).toBe(true);
    for (let i = 0; i < 60; i++) {
      update(a, 1 / 60, emptyInput(), () => 0.5);
      update(b, 1 / 60, emptyInput(), () => 0.5);
    }
    expect(b.score).toBeGreaterThan(a.score * 1.5);
  });
});
