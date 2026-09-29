import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { create, groundY, makeTerrain, spec, touchdown, update } from './game';

describe('lunar lander', () => {
  it('builds terrain with flat landing pads', () => {
    for (let seed = 0; seed < 10; seed++) {
      const { terrain, pads } = makeTerrain(createRng(seed).next);
      expect(pads.length).toBeGreaterThanOrEqual(2);
      for (const p of pads) {
        expect(groundY(terrain, (p.x1 + p.x2) / 2)).toBeCloseTo(p.y);
        expect(p.x2 - p.x1).toBeGreaterThan(30);
      }
      expect(terrain[terrain.length - 1][0]).toBeGreaterThanOrEqual(640);
    }
  });

  it('judges soft, level landings on a pad as safe', () => {
    const s = create('normal', createRng(1).next);
    const pad = s.pads[0];
    Object.assign(s, { x: (pad.x1 + pad.x2) / 2, vx: 0, vy: 20, angle: 0 });
    expect(touchdown(s)).toBe('landed');
    expect(touchdown({ ...s, vy: 80 })).toBe('crashed');
    expect(touchdown({ ...s, angle: 0.6 })).toBe('crashed');
    expect(touchdown({ ...s, x: pad.x1 - 30 })).toBe('crashed');
  });

  it('burns fuel only while thrusting', () => {
    const s = create('normal', createRng(2).next);
    const fuel = s.fuel;
    update(s, 1 / 60, emptyInput(), Math.random);
    expect(s.fuel).toBe(fuel);
    update(s, 1 / 60, inputWith(['up']), Math.random);
    expect(s.fuel).toBeLessThan(fuel);
  });

  it('crashes when falling freely', () => {
    const s = create('hard', createRng(3).next);
    simulate(spec, s, 20, emptyInput(), createRng(4).next);
    expect(s.over).toBe(true);
    expect(s.landings).toBe(0);
  });
});
