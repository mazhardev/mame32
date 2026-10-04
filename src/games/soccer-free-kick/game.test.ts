import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { createRng } from '@/utils/random';
import { KICKS, create, pitchFor, spec } from './game';

describe('free kick game', () => {
  it('holding and releasing Space takes the kick, and ten kicks end the session', () => {
    const rng = createRng(2).next;
    const s = create('normal', rng);
    for (let kick = 0; kick < KICKS; kick++) {
      spec.update(s, 1 / 60, inputWith([], ['action']), rng);
      for (let i = 0; i < 30; i++) spec.update(s, 1 / 60, inputWith(['action']), rng);
      spec.update(s, 1 / 60, emptyInput(), rng);
      expect(s.phase).toBe('flight');
      for (let i = 0; i < 60 * 5 && !s.over && s.phase !== 'aim'; i++) {
        s.time += 1 / 60;
        spec.update(s, 1 / 60, emptyInput(), rng);
      }
    }
    expect(s.over).toBe(true);
    expect(s.n).toBe(KICKS);
  });

  it('pitchFor finds the elevation to reach a height', () => {
    const p = pitchFor(20, 2, 25);
    const t = 20 / (25 * Math.cos(p));
    expect(25 * Math.sin(p) * t - 4.9 * t * t).toBeCloseTo(2, 2);
  });
});
