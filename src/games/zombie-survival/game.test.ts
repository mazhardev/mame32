import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { actor } from '../_shared/shooter/kit';
import { create, reload, spec, update, waveSize } from './game';
import type { Zombie } from './game';

describe('zombie survival', () => {
  it('fires from the magazine and reloads from the reserve', () => {
    const s = create('normal');
    s.toSpawn = 0;
    s.zombies.push(Object.assign(actor(-500, -500, 10, 99), { kind: 'walker', speed: 0 }) as Zombie);
    const fire = inputWith(['action']);
    for (let i = 0; i < 60; i++) update(s, 1 / 60, fire, () => 0.5);
    expect(s.mag).toBeLessThan(12);
    s.mag = 0;
    reload(s);
    for (let i = 0; i < 90; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.mag).toBe(12);
  });

  it('a standing player is eventually overrun', () => {
    const s = create('hard');
    simulate(spec, s, 120, emptyInput(), () => 0.4);
    expect(s.over).toBe(true);
  });

  it('waves grow', () => {
    expect(waveSize(3)).toBeGreaterThan(waveSize(1));
  });
});
