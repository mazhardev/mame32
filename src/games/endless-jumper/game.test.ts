import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { create, playerX, spec, update } from './game';

describe('endless jumper', () => {
  it('a tap leaps across to the other wall', () => {
    const s = create('easy');
    const x0 = playerX(s);
    update(s, 1 / 60, inputWith([], ['action']), () => 0.5);
    for (let i = 0; i < 30; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.side).toBe(1);
    expect(playerX(s)).toBeGreaterThan(x0);
  });

  it('climbing into a spike ends the run', () => {
    const s = create('normal');
    s.spikes = [{ side: 0, at: s.climbed + 60, len: 60 }];
    s.nextSpike = 1e9;
    simulate(spec, s, 2, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });

  it('is safe while in the air over a spike', () => {
    const s = create('normal');
    s.spikes = [{ side: 0, at: s.climbed, len: 60 }];
    s.leap = 0.5;
    s.nextSpike = 1e9;
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.over).toBe(false);
  });
});
