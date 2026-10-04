import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { createRng } from '@/utils/random';
import { CONTACT_D, SWING_TIME, arrival } from '../_shared/cricket/cricket';
import { create, spec, won } from './game';

/** A batter with perfect timing who always lofts straight. */
function play(perfect: boolean) {
  const rng = createRng(8).next;
  const s = create('normal');
  for (let i = 0; i < 60 * 300 && !s.over; i++) {
    s.time += 1 / 60;
    const f = s.flow;
    let input = emptyInput();
    if (perfect && f.phase === 'flight' && f.delivery && f.shot.swingAt === null) {
      const swingAt = arrival(f.delivery, CONTACT_D) - SWING_TIME;
      if (f.t + 1 / 60 >= swingAt) input = inputWith(['up'], ['action']);
    }
    spec.update(s, 1 / 60, input, rng);
  }
  return s;
}

describe('cricket batting', () => {
  it('perfect timing chases the target', () => {
    const s = play(true);
    expect(s.over).toBe(true);
    expect(won(s)).toBe(true);
    expect(s.inn.sixes).toBeGreaterThan(0);
  });

  it('never swinging loses the chase', () => {
    const s = play(false);
    expect(s.over).toBe(true);
    expect(won(s)).toBe(false);
    expect(s.inn.balls === s.inn.maxBalls || s.inn.wickets === s.inn.maxWickets).toBe(true);
  });
});
