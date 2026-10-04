import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { createRng } from '@/utils/random';
import { DISTANCES, create, driftAt, dropAt, loose, ringAt, spec, swayAmplitude } from './game';

describe('archery', () => {
  it('scores rings from the centre out', () => {
    expect(ringAt(0, 0)).toBe(10);
    expect(ringAt(7, 0)).toBe(9);
    expect(ringAt(0, 60)).toBe(1);
    expect(ringAt(62, 0)).toBe(0);
  });

  it('arrows drop more and drift more at longer range', () => {
    expect(dropAt(30)).toBe(0);
    expect(dropAt(90)).toBeGreaterThan(dropAt(50));
    expect(driftAt(90, 3)).toBeGreaterThan(driftAt(30, 3));
  });

  it('the bow arm settles, holds steady, then tires', () => {
    expect(swayAmplitude(0.2, 4, 30)).toBeGreaterThan(swayAmplitude(2, 4, 30));
    expect(swayAmplitude(7, 4, 30)).toBeGreaterThan(swayAmplitude(2, 4, 30));
  });

  it('aiming for drop and wind with a steady arm hits the gold', () => {
    const rng = createRng(1).next;
    const s = create('hard', rng);
    s.end = 3;
    s.wind = 4;
    const dist = DISTANCES[3];
    s.aimX = -driftAt(dist, s.wind);
    s.aimY = -dropAt(dist);
    loose(s, rng);
    expect(s.last!.ring).toBeGreaterThanOrEqual(8);
  });

  it('a whole match of twelve arrows completes', () => {
    const rng = createRng(4).next;
    const s = create('normal', rng);
    for (let i = 0; i < 60 * 200 && !s.over; i++) {
      s.time += 1 / 60;
      const holding = s.phase === 'aim' && (s.drawT < 1.5 || !s.drawing);
      spec.update(s, 1 / 60, holding ? inputWith(['action']) : emptyInput(), rng);
    }
    expect(s.over).toBe(true);
    expect(s.ends).toHaveLength(4);
    expect(s.aiEnds).toHaveLength(4);
  });
});
