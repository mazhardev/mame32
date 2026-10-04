import { describe, expect, it } from 'vitest';
import { SPINS, WHEELS, expectedMultiplier, finished, newWheel, pickSegment, spin } from './engine';

describe('spin the wheel', () => {
  it('pays stake × multiplier and counts down spins', () => {
    const s = newWheel();
    const seg = WHEELS.normal.indexOf(2);
    const next = spin(s, 'normal', 25, seg);
    expect(next.points).toBe(125);
    expect(next.spinsLeft).toBe(SPINS - 1);
  });

  it('never stakes more than the balance and ends when broke', () => {
    let s = { ...newWheel(), points: 5 };
    s = spin(s, 'normal', 50, WHEELS.normal.indexOf(0));
    expect(s.points).toBe(0);
    expect(finished(s)).toBe(true);
  });

  it('wheels get stingier with difficulty and every segment can be picked', () => {
    expect(expectedMultiplier('easy')).toBeGreaterThan(expectedMultiplier('normal'));
    expect(expectedMultiplier('normal')).toBeGreaterThan(expectedMultiplier('hard'));
    const seen = new Set<number>();
    for (let i = 0; i < 8; i++) seen.add(pickSegment('easy', () => (i + 0.5) / 8));
    expect(seen.size).toBe(8);
  });
});
