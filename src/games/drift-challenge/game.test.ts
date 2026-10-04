import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { bank, create, isDrifting, lose, spec } from './game';

describe('drift challenge', () => {
  it('recognises a scoring drift', () => {
    expect(isDrifting(0.5, 200)).toBe(true);
    expect(isDrifting(0.1, 200)).toBe(false);
    expect(isDrifting(0.5, 50)).toBe(false);
  });

  it('banks pending points with the multiplier, or loses them', () => {
    const s = create('normal');
    s.pending = 100;
    s.multiplier = 3;
    bank(s);
    expect(s.score).toBe(300);
    s.pending = 50;
    lose(s);
    expect(s.score).toBe(300);
    expect(s.pending).toBe(0);
  });

  it('handbraking through the first bend builds drift points, and time runs out', () => {
    const s = create('hard');
    for (let i = 0; i < 4 * 60; i++) spec.update(s, 1 / 60, emptyInput(), () => 0.5);
    let peak = 0;
    for (let i = 0; i < 3 * 60; i++) {
      spec.update(s, 1 / 60, inputWith(i < 60 ? ['up'] : ['up', 'right', 'action']), () => 0.5);
      peak = Math.max(peak, s.pending);
    }
    expect(peak + s.score).toBeGreaterThan(0);
    for (let i = 0; i < 80 * 60 && !s.over; i++) spec.update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });
});
