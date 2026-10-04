import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { actor } from '../_shared/shooter/kit';
import { create, spec, startDash, update } from './game';
import type { Foe } from './game';

const foe = (x: number, y: number, kind: Foe['kind']) => Object.assign(actor(x, y, 12, 1), { kind, wobble: 0 }) as Foe;

describe('survival arena', () => {
  it('dashing through a slime defeats it and splits it', () => {
    const s = create('normal');
    s.spawnIn = 99;
    s.foes.push(foe(s.player.x + 40, s.player.y, 'slime'));
    expect(startDash(s, inputWith(['right']))).toBe(true);
    for (let i = 0; i < 6; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.kills).toBe(1);
    expect(s.foes.filter((f) => f.kind === 'small')).toHaveLength(2);
  });

  it('the dash has a cooldown', () => {
    const s = create('normal');
    expect(startDash(s, inputWith(['up']))).toBe(true);
    for (let i = 0; i < 20; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(startDash(s, inputWith(['up']))).toBe(false);
  });

  it('standing still loses all hearts', () => {
    const s = create('hard');
    simulate(spec, s, 90, emptyInput(), () => 0.3);
    expect(s.over).toBe(true);
  });
});
