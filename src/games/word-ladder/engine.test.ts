import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { checkStep, hint, makeLadder, oneLetterApart, shortestPath } from './engine';

describe('word ladder', () => {
  it('detects one-letter changes', () => {
    expect(oneLetterApart('cold', 'cord')).toBe(true);
    expect(oneLetterApart('cold', 'cold')).toBe(false);
    expect(oneLetterApart('cold', 'warm')).toBe(false);
  });

  it('finds a valid shortest ladder', () => {
    const path = shortestPath('cold', 'warm');
    expect(path).not.toBeNull();
    expect(path![0]).toBe('cold');
    expect(path![path!.length - 1]).toBe('warm');
    for (let i = 1; i < path!.length; i++)
      expect(oneLetterApart(path![i - 1], path![i])).toBe(true);
  });

  it('generates solvable ladders of the requested length', () => {
    const rng = createRng(4);
    for (const [len, min, max] of [
      [3, 3, 4],
      [4, 4, 5],
      [4, 5, 7],
    ] as const) {
      const l = makeLadder(rng, len, min, max);
      expect(l.optimal).toBeGreaterThanOrEqual(min);
      expect(l.optimal).toBeLessThanOrEqual(max);
      expect(shortestPath(l.start, l.end)!.length - 1).toBe(l.optimal);
    }
  });

  it('validates steps and gives hints along a shortest route', () => {
    expect(checkStep('cold', 'cord', ['cold']).ok).toBe(true);
    expect(checkStep('cold', 'warm', ['cold'])).toEqual({
      ok: false,
      reason: 'Change exactly one letter',
    });
    expect(checkStep('cold', 'cold', ['cold']).ok).toBe(false);
    const h = hint('cold', 'warm');
    expect(h && oneLetterApart('cold', h)).toBe(true);
  });
});
