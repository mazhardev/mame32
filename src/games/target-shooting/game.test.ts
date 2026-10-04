import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { RING, SHOTS, TX, TY, create, ringScore, update } from './game';

describe('target shooting', () => {
  it('scores rings from 10 to 0', () => {
    expect(ringScore(0)).toEqual({ points: 10, x10: true });
    expect(ringScore(RING * 0.7).points).toBe(10);
    expect(ringScore(RING * 3.5).points).toBe(7);
    expect(ringScore(RING * 12).points).toBe(0);
  });

  it('holding breath steadies the sight', () => {
    const calm = create('normal');
    const free = create('normal');
    let calmMax = 0;
    let freeMax = 0;
    for (let i = 0; i < 120; i++) {
      calm.time += 1 / 60;
      free.time += 1 / 60;
      update(calm, 1 / 60, inputWith(['action2']), () => 0.5);
      update(free, 1 / 60, emptyInput(), () => 0.5);
      calmMax = Math.max(calmMax, Math.abs(calm.swayX));
      freeMax = Math.max(freeMax, Math.abs(free.swayX));
    }
    expect(calmMax).toBeLessThan(freeMax / 3);
  });

  it('ends after ten shots', () => {
    const s = create('easy');
    s.aimX = TX;
    s.aimY = TY;
    for (let i = 1; i <= (SHOTS + 1) * 60; i++) update(s, 1 / 60, i % 60 === 0 ? inputWith([], ['action']) : emptyInput(), () => 0.5);
    expect(s.holes).toHaveLength(SHOTS);
    expect(s.over).toBe(true);
    expect(s.score).toBeGreaterThan(50);
  });
});
