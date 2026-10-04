import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { createRng } from '@/utils/random';
import { meterAccuracy } from '../_shared/cricket/flow';
import { aggression, create, spec } from './game';

function bowlInnings(difficulty: 'easy' | 'hard', seed: number) {
  const rng = createRng(seed).next;
  const s = create(difficulty);
  for (let i = 0; i < 60 * 400 && !s.over; i++) {
    s.time += 1 / 60;
    const f = s.flow;
    let input = emptyInput();
    if (f.phase === 'setup') {
      f.marker = { d: 5, x: 0.05 };
      input = inputWith([], ['action']);
    } else if (f.phase === 'runup' && meterAccuracy(f.meter) > 0.9)
      input = inputWith([], ['action']);
    spec.update(s, 1 / 60, input, rng);
  }
  return s;
}

describe('cricket bowling', () => {
  it('an innings of accurate bowling runs to completion', () => {
    const s = bowlInnings('easy', 3);
    expect(s.over).toBe(true);
    expect(s.inn.balls).toBeGreaterThan(0);
  });

  it('a skilled computer batter scores faster than a weak one', () => {
    let easy = 0;
    let hard = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const e = bowlInnings('easy', seed);
      const h = bowlInnings('hard', seed);
      easy += e.inn.runs / Math.max(1, e.inn.balls);
      hard += h.inn.runs / Math.max(1, h.inn.balls);
    }
    expect(hard).toBeGreaterThan(easy);
  });

  it('the batter attacks harder when the required rate rises', () => {
    const s = create('normal');
    const calm = aggression(s.inn);
    s.inn.balls = 15;
    expect(aggression(s.inn)).toBeGreaterThan(calm);
  });
});
