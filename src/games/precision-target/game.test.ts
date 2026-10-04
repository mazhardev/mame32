import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { TARGETS, create, position, precisionAt, spec, update } from './game';

describe('precision target', () => {
  it('scores precision by distance from the centre', () => {
    expect(precisionAt(0, 30)).toBe(100);
    expect(precisionAt(15, 30)).toBe(50);
    expect(precisionAt(29.9, 30)).toBe(1);
    expect(precisionAt(31, 30)).toBe(0);
  });

  it('a centred click scores near 100', () => {
    const s = create('normal');
    for (let i = 0; i < 60 && !s.target; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    const p = position(s.target!);
    update(s, 0, inputWith([], [], { x: p.x, y: p.y, pressed: true, active: true }), () => 0.5);
    expect(s.shots[0].precision).toBe(100);
  });

  it('ignored targets expire and the round ends', () => {
    const s = create('hard');
    simulate(spec, s, 120, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
    expect(s.shots).toHaveLength(TARGETS);
    expect(s.score).toBe(0);
  });
});
