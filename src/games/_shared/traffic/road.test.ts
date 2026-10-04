import { describe, expect, it } from 'vitest';
import { inputWith } from '../arcade/kit';
import { laneCentre, laneOf, makeRoad, overlap, spawnVehicle, steer, updateTraffic } from './road';

describe('traffic road kit', () => {
  it('maps lanes to positions and back', () => {
    const r = makeRoad(400, 600, 4, 80);
    for (let l = 0; l < 4; l++) expect(laneOf(r, laneCentre(r, l))).toBe(l);
  });

  it('slower traffic falls behind a faster player', () => {
    const r = makeRoad(400, 600, 3, 90);
    const v = spawnVehicle(r, 300, () => 0.5, { minSpeed: 100, maxSpeed: 100, truckChance: 0 })!;
    const y0 = v.y;
    updateTraffic(r, 300, 1, () => 0.9, 0);
    expect(v.y).toBeGreaterThan(y0);
  });

  it('detects overlaps and steers within bounds', () => {
    expect(overlap({ x: 0, y: 0, w: 40, h: 60 }, { x: 30, y: 0, w: 40, h: 60 })).toBe(true);
    expect(overlap({ x: 0, y: 0, w: 40, h: 60 }, { x: 50, y: 0, w: 40, h: 60 })).toBe(false);
    expect(steer(100, inputWith(['left']), 200, 10, 50, 350)).toBe(50);
  });
});
