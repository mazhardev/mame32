import { describe, expect, it } from 'vitest';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { PLANET_R, applyUpgrade, create, spec, update } from './game';

describe('asteroid defense', () => {
  it('big rocks split when shot', () => {
    const s = create('normal');
    s.toSpawn = 0;
    s.rocks.push({ x: 240 + 200, y: 240, vx: 0, vy: 0, r: 26, spin: 0 });
    s.bolts.push({ x: 240 + 200, y: 240, vx: 0, vy: 0, life: 1 });
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.rocks.filter((r) => r.r === 13)).toHaveLength(2);
  });

  it('impacts drain the shield and upgrades apply', () => {
    const s = create('normal');
    s.toSpawn = 0;
    s.rocks.push({ x: 240, y: 240 - PLANET_R - 2, vx: 0, vy: 10, r: 16, spin: 0 });
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.shield).toBe(4);
    s.choosing = true;
    applyUpgrade(s, 'twin');
    expect(s.twin).toBe(true);
    expect(s.wave).toBe(2);
  });

  it('an idle cannon eventually loses the planet', () => {
    const s = create('hard');
    simulate(spec, s, 200, emptyInput(), () => 0.4);
    expect(s.over).toBe(true);
  });
});
