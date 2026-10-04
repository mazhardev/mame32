import { describe, expect, it } from 'vitest';
import { create, grade, stop } from './game';

describe('perfect timing', () => {
  it('grades stops by distance from the zone centre', () => {
    expect(grade(0.5, 0.5, 0.2)).toBe('perfect');
    expect(grade(0.58, 0.5, 0.2)).toBe('hit');
    expect(grade(0.7, 0.5, 0.2)).toBe('miss');
  });

  it('a hit scores, shrinks the zone and speeds up', () => {
    const s = create('normal');
    s.pos = s.zoneCenter;
    const { zoneWidth, speed } = s;
    stop(s, () => 0.5);
    expect(s.score).toBe(20);
    expect(s.zoneWidth).toBeLessThan(zoneWidth);
    expect(s.speed).toBeGreaterThan(speed);
  });

  it('three misses end the game', () => {
    const s = create('easy');
    for (let i = 0; i < 3; i++) {
      s.pos = s.zoneCenter > 0.5 ? 0 : 1;
      stop(s, () => 0.5);
    }
    expect(s.over).toBe(true);
  });
});
