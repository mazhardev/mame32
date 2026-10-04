import { describe, expect, it } from 'vitest';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { create, inGap, spec, update } from './game';

describe('falling ball', () => {
  it('rests on a solid floor and is carried up', () => {
    const s = create('easy', () => 0.5);
    s.rows = [{ y: 200, gapX: 0, gapW: 10, spiked: false, passed: false }];
    s.x = 200;
    s.y = 150;
    for (let i = 0; i < 60; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.rows[0].y).toBeLessThan(200);
    expect(s.y + 11).toBeCloseTo(s.rows[0].y, 0);
  });

  it('drops through a gap and scores', () => {
    const s = create('easy', () => 0.5);
    s.rows = [{ y: 200, gapX: 150, gapW: 80, spiked: false, passed: false }];
    s.x = 190;
    s.y = 150;
    expect(inGap(s.rows[0], s.x)).toBe(true);
    for (let i = 0; i < 60; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.passed).toBeGreaterThanOrEqual(1);
  });

  it('ends when pushed into the ceiling', () => {
    const s = create('hard', () => 0.5);
    s.rows = [{ y: 40, gapX: 0, gapW: 5, spiked: false, passed: false }];
    s.x = 200;
    s.y = 20;
    simulate(spec, s, 3, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });
});
