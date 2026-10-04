import { describe, expect, it } from 'vitest';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { SECTORS, create, makeWall, sectorOf, spec, update } from './game';

describe('space racing', () => {
  it('walls always leave a gap of the requested size', () => {
    for (let k = 0; k < 20; k++) {
      const w = makeWall(100, 3, () => k / 20);
      expect(w.blocked.filter((b) => !b)).toHaveLength(3);
    }
    expect(sectorOf(0)).toBe(0);
    expect(sectorOf(Math.PI * 2 - 0.01)).toBe(SECTORS - 1);
  });

  it('flying through a gap scores; a blocked sector ends the run', () => {
    const s = create('normal');
    s.nextWall = 1e9;
    const open = Array(SECTORS).fill(true);
    open[sectorOf(s.angle)] = false;
    s.walls.push({ z: 5, blocked: open, hue: 0, passed: false });
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.passed).toBe(1);
    s.walls.push({ z: 5, blocked: Array(SECTORS).fill(true), hue: 0, passed: false });
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });

  it('standing still eventually hits a wall', () => {
    const s = create('hard');
    let seed = 5;
    simulate(spec, s, 60, emptyInput(), () => ((seed = (seed * 16807) % 2147483647) / 2147483647));
    expect(s.over).toBe(true);
  });
});
