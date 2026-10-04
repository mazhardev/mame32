import { describe, expect, it } from 'vitest';
import { emptyInput } from '../_shared/arcade/kit';
import { createRng } from '@/utils/random';
import { create, spec, takeShot } from './game';

describe('golf round', () => {
  it('a golfer who accepts the suggested club and aim finishes all nine holes', () => {
    const rng = createRng(3).next;
    const s = create('easy', rng);
    for (let i = 0; i < 20000 && !s.over; i++) {
      s.time += 1 / 30;
      if (s.phase === 'aim') takeShot(s, rng);
      else spec.update(s, 1 / 30, emptyInput(), rng);
    }
    expect(s.over).toBe(true);
    expect(s.card).toHaveLength(9);
    const total = s.card.reduce((a, b) => a + b, 0);
    // Pin-seeking with no thought for hazards is not a great strategy, but it gets round.
    expect(total).toBeLessThan(36 + 30);
  });

  it('hard rounds have wind; easy rounds do not', () => {
    expect(create('easy', () => 0.9).windMph).toBe(0);
    expect(create('hard', () => 0.9).windMph).toBeGreaterThan(0);
  });
});
