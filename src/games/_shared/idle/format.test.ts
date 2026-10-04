import { describe, expect, it } from 'vitest';
import { bulkCost, formatDuration, formatNumber, maxAffordable } from './format';
import { offlineSeconds } from './useIdleSave';

describe('idle helpers', () => {
  it('formats numbers compactly', () => {
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(12345)).toBe('12,345');
    expect(formatNumber(1.5e6)).toBe('1.50M');
    expect(formatNumber(2.25e12)).toBe('2.25T');
    expect(formatNumber(3.5)).toBe('3.5');
  });

  it('formats durations', () => {
    expect(formatDuration(9)).toBe('9s');
    expect(formatDuration(249)).toBe('4m 09s');
    expect(formatDuration(3900)).toBe('1h 05m');
  });

  it('bulk prices match buying one at a time', () => {
    let total = 0;
    for (let i = 0; i < 10; i++) total += 15 * 1.15 ** (3 + i);
    expect(bulkCost(15, 1.15, 3, 10)).toBeCloseTo(total, 6);
    const n = maxAffordable(15, 1.15, 3, total + 1);
    expect(n).toBe(10);
    expect(maxAffordable(15, 1.15, 0, 10)).toBe(0);
  });

  it('caps offline time', () => {
    expect(offlineSeconds(1000, 61000, 3600)).toBe(60);
    expect(offlineSeconds(1000, 1000 + 1e9, 3600)).toBe(3600);
    expect(offlineSeconds(0, 5000, 3600)).toBe(0);
  });
});
