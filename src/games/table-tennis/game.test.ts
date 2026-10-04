import { describe, expect, it } from 'vitest';
import { serverFor, winnerOf } from './game';

describe('table tennis scoring', () => {
  it('service changes every two points', () => {
    expect(serverFor([0, 0], 0)).toBe(0);
    expect(serverFor([1, 0], 0)).toBe(0);
    expect(serverFor([1, 1], 0)).toBe(1);
    expect(serverFor([2, 1], 0)).toBe(1);
    expect(serverFor([2, 2], 0)).toBe(0);
  });

  it('service changes every point from 10–10', () => {
    expect(serverFor([10, 10], 0)).toBe(0);
    expect(serverFor([11, 10], 0)).toBe(1);
    expect(serverFor([11, 11], 0)).toBe(0);
  });

  it('a game needs 11 points and a two-point lead', () => {
    expect(winnerOf([11, 9])).toBe(0);
    expect(winnerOf([11, 10])).toBeNull();
    expect(winnerOf([12, 14])).toBe(1);
    expect(winnerOf([10, 3])).toBeNull();
  });
});
