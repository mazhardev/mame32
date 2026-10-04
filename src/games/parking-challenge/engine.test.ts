import { describe, expect, it } from 'vitest';
import { corners, headingError, hitsRect, insideBay } from './engine';
import { LEVELS } from './levels';

describe('parking geometry', () => {
  it('detects collisions with rotated cars', () => {
    const c = corners(100, 100, Math.PI / 4);
    expect(hitsRect(c, { x: 110, y: 95, w: 20, h: 20, kind: 'cone' })).toBe(true);
    expect(hitsRect(c, { x: 140, y: 60, w: 10, h: 10, kind: 'cone' })).toBe(false);
  });

  it('checks the car is inside the bay and facing the right way', () => {
    const bay = { x: 280, y: 90, w: 46, h: 76, angle: -Math.PI / 2 };
    expect(insideBay(corners(280, 90, -Math.PI / 2), bay)).toBe(true);
    expect(insideBay(corners(280, 120, -Math.PI / 2), bay)).toBe(false);
    expect(headingError(Math.PI / 2, -Math.PI / 2)).toBeCloseTo(Math.PI);
    expect(headingError(Math.PI / 2, -Math.PI / 2, true)).toBeCloseTo(0);
  });

  it('every level starts clear of obstacles with a reachable empty bay', () => {
    for (const l of LEVELS) {
      const start = corners(l.start.x, l.start.y, l.start.angle);
      const parked = corners(l.bay.x, l.bay.y, l.bay.angle);
      for (const o of l.obstacles) {
        expect(hitsRect(start, o), `${l.name} start`).toBe(false);
        expect(hitsRect(parked, o), `${l.name} bay`).toBe(false);
      }
      expect(insideBay(parked, l.bay), l.name).toBe(true);
    }
  });
});
