import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { MOUND, SWING, contact, fenceAt, flightTime, inZone, makePitch, pitchAt } from './engine';
import type { Pitch } from './engine';

const meatball: Pitch = { kind: 'fastball', speed: 35, x: 0, z: 0.8, breakX: 0, breakZ: 0 };
const perfectAt = (p: Pitch) => flightTime(p) - SWING;

describe('baseball engine', () => {
  it('pitches leave the mound and cross the plate where aimed, breaking late', () => {
    const curve: Pitch = {
      kind: 'curveball',
      speed: 28,
      x: 0.1,
      z: 0.6,
      breakX: 0.12,
      breakZ: 0.35,
    };
    expect(pitchAt(curve, 0).d).toBeCloseTo(MOUND);
    const end = pitchAt(curve, flightTime(curve));
    expect(end.d).toBeCloseTo(0);
    expect(end.x).toBeCloseTo(0.1);
    expect(end.z).toBeCloseTo(0.6);
    // Halfway, it still looks higher than where it will finish.
    expect(pitchAt(curve, flightTime(curve) / 2).z).toBeGreaterThan(0.9);
  });

  it('perfect timing just under the ball is a home run', () => {
    const c = contact(meatball, { at: perfectAt(meatball), x: 0, z: 0.75 }, 0.09);
    expect(c.kind).toBe('fair');
    if (c.kind === 'fair') expect(c.homer).toBe(true);
  });

  it('topping the ball hits it into the ground; a late swing misses', () => {
    const c = contact(meatball, { at: perfectAt(meatball), x: 0, z: 0.86 }, 0.09);
    expect(c.kind === 'fair' && !c.homer).toBe(true);
    expect(contact(meatball, { at: perfectAt(meatball) + 0.2, x: 0, z: 0.8 }, 0.09).kind).toBe(
      'miss',
    );
    expect(contact(meatball, { at: perfectAt(meatball), x: 0.3, z: 0.8 }, 0.09).kind).toBe('miss');
  });

  it('early swings pull the ball, late swings push it', () => {
    const early = contact(meatball, { at: perfectAt(meatball) - 0.03, x: 0, z: 0.76 }, 0.09);
    const late = contact(meatball, { at: perfectAt(meatball) + 0.03, x: 0, z: 0.76 }, 0.09);
    expect(early.kind !== 'miss' && late.kind !== 'miss').toBe(true);
    if (early.kind !== 'miss' && late.kind !== 'miss')
      expect(early.spray).toBeGreaterThan(late.spray);
  });

  it('harder pitchers throw faster and miss the zone more', () => {
    const rng = createRng(3).next;
    const stats = (d: 'easy' | 'hard') => {
      let speed = 0;
      let zone = 0;
      for (let i = 0; i < 400; i++) {
        const p = makePitch(d, rng);
        speed += p.speed;
        if (inZone(p)) zone++;
      }
      return { speed, zone };
    };
    const e = stats('easy');
    const h = stats('hard');
    expect(h.speed).toBeGreaterThan(e.speed);
    expect(h.zone).toBeLessThan(e.zone);
  });

  it('the fence is deepest in centre field', () => {
    expect(fenceAt(0)).toBeGreaterThan(fenceAt(0.7));
  });
});
