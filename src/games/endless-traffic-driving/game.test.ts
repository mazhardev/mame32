import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { create, hop, spec, update } from './game';

describe('endless traffic driving', () => {
  it('hops one lane per tap within the road', () => {
    const s = create('easy');
    hop(s, -1);
    hop(s, -1);
    expect(s.lane).toBe(0);
    update(s, 1 / 60, inputWith([], ['right']), () => 0.5);
    expect(s.lane).toBe(1);
  });

  it('collects coins in its lane', () => {
    const s = create('normal');
    s.spawnIn = 999;
    s.coinIn = 999;
    s.coins.push({ x: s.x, y: 600 - 110, taken: false });
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.coinCount).toBe(1);
  });

  it('three knocks end the drive', () => {
    const s = create('hard');
    let seed = 3;
    simulate(spec, s, 300, emptyInput(), () => ((seed = (seed * 16807) % 2147483647) / 2147483647));
    expect(s.over).toBe(true);
  });
});
