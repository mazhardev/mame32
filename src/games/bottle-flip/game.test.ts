import { describe, expect, it } from 'vitest';
import { emptyInput } from '../_shared/arcade/kit';
import { create, landing, toss, update } from './game';

function flipWith(power: number) {
  const s = create('easy');
  s.power = power;
  toss(s);
  for (let i = 0; i < 400 && s.phase === 'flying'; i++) update(s, 1 / 120, emptyInput());
  return s;
}

describe('bottle flip', () => {
  it('measures how far from upright a landing is', () => {
    expect(landing(Math.PI * 2)).toEqual({ off: 0, turns: 1 });
    expect(landing(Math.PI * 4 + 0.1).turns).toBe(2);
    expect(landing(Math.PI * 3).off).toBeCloseTo(Math.PI);
  });

  it('some power lands a flip and some does not', () => {
    const outcomes = Array.from({ length: 101 }, (_, i) => flipWith(i / 100).flips);
    expect(outcomes.some((f) => f === 1)).toBe(true);
    expect(outcomes.some((f) => f === 0)).toBe(true);
  });

  it('three failures end the round', () => {
    const s = create('hard');
    for (let k = 0; k < 3; k++) {
      s.power = 0;
      s.y = 420;
      s.angle = 0;
      toss(s);
      for (let i = 0; i < 400 && s.phase === 'flying'; i++) update(s, 1 / 120, emptyInput());
    }
    expect(s.over).toBe(true);
  });
});
