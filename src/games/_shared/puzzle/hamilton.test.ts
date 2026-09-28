import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { areAdjacent, hamiltonianPath } from './hamilton';

describe('hamiltonian paths', () => {
  it('visits every cell exactly once through adjacent steps', () => {
    for (const [w, h] of [
      [5, 5],
      [6, 6],
      [7, 9],
    ]) {
      for (let seed = 0; seed < 10; seed++) {
        const path = hamiltonianPath(w, h, createRng(`${w}x${h}-${seed}`).next);
        expect(path).toHaveLength(w * h);
        expect(new Set(path).size).toBe(w * h);
        for (let i = 1; i < path.length; i++) expect(areAdjacent(path[i - 1], path[i], w)).toBe(true);
      }
    }
  });

  it('is not simply the starting serpentine', () => {
    const path = hamiltonianPath(6, 6, createRng('mix').next);
    const serpentine = [0, 1, 2, 3, 4, 5, 11, 10, 9, 8, 7, 6];
    expect(path.slice(0, 12)).not.toEqual(serpentine);
  });
});
