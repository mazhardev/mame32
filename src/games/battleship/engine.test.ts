import { describe, expect, it } from 'vitest';
import { FLEET, N, chooseShot, fire, placement, randomFleet, remainingSizes } from './engine';
import type { Ship, Shots } from './engine';
import { createRng } from '@/utils/random';

describe('sea battle', () => {
  it('places a full, non-overlapping fleet inside the grid', () => {
    for (let k = 0; k < 20; k++) {
      const ships = randomFleet();
      const cells = ships.flatMap((s) => s.cells);
      expect(ships.map((s) => s.cells.length)).toEqual(FLEET.map((f) => f.size));
      expect(new Set(cells).size).toBe(cells.length);
      expect(cells.every((c) => c >= 0 && c < N * N)).toBe(true);
    }
  });

  it('rejects placements that run off the edge', () => {
    expect(placement(8, 3, false)).toBeNull();
    expect(placement(80, 3, true)).toBeNull();
    expect(placement(0, 3, true)).toEqual([0, 10, 20]);
  });

  it('reports misses, hits, sinking and the end of the game', () => {
    const ships: Ship[] = [
      { name: 'A', cells: [0, 1] },
      { name: 'B', cells: [50] },
    ];
    let shots: Shots = {};
    let r = fire(ships, shots, 5);
    expect(r.mark).toBe('miss');
    r = fire(ships, r.shots, 0);
    expect(r.mark).toBe('hit');
    r = fire(ships, r.shots, 1);
    expect(r.mark).toBe('sunk');
    expect(r.shots[0]).toBe('sunk');
    expect(r.allSunk).toBe(false);
    shots = r.shots;
    expect(remainingSizes(ships, shots)).toEqual([1]);
    expect(fire(ships, shots, 50).allSunk).toBe(true);
  });

  it.each(['normal', 'hard'] as const)('%s computer follows up a hit next to it', (level) => {
    const shots: Shots = { 44: 'hit' };
    const pick = chooseShot(shots, [5, 4, 3, 3, 2], level, createRng(3).next);
    expect([34, 54, 43, 45]).toContain(pick);
  });

  it.each(['easy', 'normal', 'hard'] as const)('%s computer always sinks a random fleet within 100 shots', (level) => {
    const rng = createRng(11).next;
    const ships = randomFleet(rng);
    let shots: Shots = {};
    let n = 0;
    for (;;) {
      const i = chooseShot(shots, remainingSizes(ships, shots), level, rng);
      expect(shots[i]).toBeUndefined();
      const r = fire(ships, shots, i);
      shots = r.shots;
      n++;
      if (r.allSunk) break;
    }
    expect(n).toBeLessThanOrEqual(100);
  });
});
