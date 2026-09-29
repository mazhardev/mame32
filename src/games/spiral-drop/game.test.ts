import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { BOUNCE, SLOTS, create, makeRings, slotUnderBall, spec } from './game';

describe('spiral drop', () => {
  it('builds rings that each have a gap and a safe first ring', () => {
    const rings = makeRings(3, 1, createRng(1).next);
    for (const r of rings) {
      expect(r).toHaveLength(SLOTS);
      expect(r.includes('gap')).toBe(true);
    }
    expect(rings[0].includes('danger')).toBe(false);
  });

  it('maps rotation to the slot under the ball', () => {
    const slot = slotUnderBall(0);
    expect(slotUnderBall((Math.PI * 2) / SLOTS)).toBe((slot - 1 + SLOTS) % SLOTS);
  });

  it('bounces on solid rings', () => {
    const s = create('normal', createRng(2).next);
    s.rings = [Array(SLOTS).fill('solid'), ...s.rings.slice(1)];
    simulate(spec, s, 0.4, emptyInput(), createRng(3).next);
    expect(s.vy).toBeLessThan(0);
    expect(s.vy).toBeGreaterThanOrEqual(BOUNCE);
  });

  it('falls through a gap and scores', () => {
    const s = create('normal', createRng(4).next);
    s.rings = [Array(SLOTS).fill('gap'), Array(SLOTS).fill('solid')];
    s.rings.push(Array(SLOTS).fill('solid'));
    simulate(spec, s, 0.6, emptyInput(), createRng(5).next);
    expect(s.passed).toBe(1);
    expect(s.score).toBeGreaterThan(0);
  });

  it('dies on a red section, but smashes through after a streak', () => {
    const s = create('normal', createRng(6).next);
    s.rings = [Array(SLOTS).fill('danger'), Array(SLOTS).fill('solid')];
    simulate(spec, s, 0.5, emptyInput(), createRng(7).next);
    expect(s.over).toBe(true);

    const t = create('normal', createRng(6).next);
    t.rings = [Array(SLOTS).fill('danger'), Array(SLOTS).fill('solid'), Array(SLOTS).fill('solid')];
    t.streak = 3;
    simulate(spec, t, 0.5, emptyInput(), createRng(7).next);
    expect(t.over).toBe(false);
    expect(t.smashed).toBe(1);
  });
});
