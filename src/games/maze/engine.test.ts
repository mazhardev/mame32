import { describe, expect, it } from 'vitest';
import { parSeconds, scoreFor } from './engine';

describe('maze scoring', () => {
  it('awards the full base for a par-time, shortest-route escape', () => {
    expect(scoreFor(100, 30, 30, parSeconds(30) * 1000, 0)).toBe(400);
  });

  it('penalises slow escapes, wandering and hints', () => {
    const clean = scoreFor(256, 60, 60, 20_000, 0);
    expect(scoreFor(256, 60, 60, 90_000, 0)).toBeLessThan(clean);
    expect(scoreFor(256, 60, 120, 20_000, 0)).toBeLessThan(clean);
    expect(scoreFor(256, 60, 60, 20_000, 1)).toBeLessThan(clean);
  });

  it('never drops below 50', () => {
    expect(scoreFor(100, 20, 900, 9_000_000, 9)).toBe(50);
  });
});
