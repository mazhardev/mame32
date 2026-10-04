import { describe, expect, it } from 'vitest';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { GROUND, centre, create, spec, update } from './game';

describe('alien invasion', () => {
  it('an abductor lifts a building away unless stopped, and shooting it rescues the building', () => {
    const s = create('normal');
    s.toSpawn = 0;
    const b = s.buildings[2];
    s.ufos.push({ kind: 'abductor', x: centre(b), y: GROUND - b.h - 90, vx: 0, phase: 0, hp: 1, target: 2, cd: 9 });
    for (let i = 0; i < 60; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(b.lift).toBeGreaterThan(0);
    s.bolts.push({ x: s.ufos[0].x, y: s.ufos[0].y + 4, vx: 0, vy: 0 });
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.rescued).toBe(1);
    expect(b.lift).toBe(0);
  });

  it('bombs damage buildings and an undefended city falls', () => {
    const s = create('hard');
    let seed = 21;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    simulate(spec, s, 400, emptyInput(), random);
    expect(s.over).toBe(true);
    expect(s.buildings.every((b) => !b.alive)).toBe(true);
  });
});
