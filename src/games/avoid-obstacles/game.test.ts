import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { addHazard, create, update } from './game';

describe('avoid obstacles', () => {
  it('spawns hazards away from the player', () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const s = create('normal', random);
    for (let i = 0; i < 20; i++) addHazard(s, random);
    for (const h of s.hazards) expect(Math.hypot(h.x - s.x, h.y - s.y)).toBeGreaterThan(100);
  });

  it('a solid hazard ends the run, a fading or shielded one does not', () => {
    const s = create('easy', () => 0.1);
    s.hazards = [{ x: s.x, y: s.y, vx: 0, vy: 0, r: 12, warm: 0.5 }];
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.over).toBe(false);
    s.hazards[0].warm = 0;
    s.shield = 2;
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.over).toBe(false);
    s.shield = 0;
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });

  it('moves diagonally at the same speed', () => {
    const s = create('easy', () => 0.1);
    s.hazards = [];
    const x0 = s.x;
    update(s, 0.1, inputWith(['right', 'down']), () => 0.5);
    expect(Math.hypot(s.x - x0, s.y - 210)).toBeCloseTo(23, 0);
  });
});
