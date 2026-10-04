import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { createRng } from '@/utils/random';
import { SWING, flightTime } from './engine';
import { OUTS, create, spec } from './game';

function derby(perfect: boolean) {
  const rng = createRng(6).next;
  const s = create('normal', rng);
  for (let i = 0; i < 60 * 600 && !s.over; i++) {
    s.time += 1 / 60;
    let input = emptyInput();
    if (perfect) {
      s.aimX = s.pitch.x;
      s.aimZ = s.pitch.z - 0.04;
      if (s.phase === 'pitch' && s.swingAt === null && s.t + 1 / 60 >= flightTime(s.pitch) - SWING)
        input = inputWith([], ['action']);
    } else if (s.phase === 'pitch' && s.swingAt === null) input = inputWith([], ['action']);
    spec.update(s, 1 / 60, input, rng);
  }
  return s;
}

describe('home run derby', () => {
  it('a perfect hitter hits plenty of home runs', () => {
    const s = derby(true);
    // Perfect contact never makes an out; within ten minutes of pitches it is a long derby.
    expect(s.homers.length).toBeGreaterThan(20);
    expect(s.outs).toBeLessThan(5);
  });

  it('swinging blindly at once makes ten quick outs', () => {
    const s = derby(false);
    expect(s.over).toBe(true);
    expect(s.outs).toBe(OUTS);
    expect(s.homers.length).toBe(0);
  });
});
