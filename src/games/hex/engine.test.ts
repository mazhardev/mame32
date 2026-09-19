import { describe, expect, it } from 'vitest';
import { chooseMove, distance, neighbours, winningChain } from './engine';
import type { Cell } from './engine';

const N = 5;
const empty = (): Cell[] => Array(N * N).fill(0);

describe('hex', () => {
  it('has six neighbours inside the board and fewer on the edges', () => {
    expect(neighbours(12, N)).toHaveLength(6);
    expect(neighbours(0, N).sort((a, b) => a - b)).toEqual([1, 5]);
  });

  it('detects a winning chain for each colour along its own axis', () => {
    const b = empty();
    for (let r = 0; r < N; r++) b[r * N + 2] = 1;
    expect(winningChain(b, N, 1)).toHaveLength(N);
    expect(winningChain(b, N, 2)).toBeNull();
    const d = empty();
    // A diagonal-ish chain from left to right using the hex adjacencies.
    [10, 11, 7, 8, 9].forEach((i) => (d[i] = 2));
    expect(winningChain(d, N, 2)).not.toBeNull();
  });

  it('measures remaining distance with 0–1 costs', () => {
    const b = empty();
    expect(distance(b, N, 1)).toBe(N);
    b[2] = 1;
    b[7] = 1;
    expect(distance(b, N, 1)).toBe(N - 2);
    for (let c = 0; c < N; c++) b[2 * N + c] = 2;
    expect(distance(b, N, 1)).toBeGreaterThan(1e8);
  });

  it.each(['normal', 'hard'] as const)('%s computer completes its own chain', (level) => {
    const b = empty();
    [0, 1, 2, 3].forEach((c) => (b[2 * N + c] = 2));
    const m = chooseMove(b, N, 2, level);
    const after = [...b];
    after[m] = 2;
    expect(winningChain(after, N, 2)).not.toBeNull();
  });

  it.each(['normal', 'hard'] as const)('%s computer blocks a one-move win', (level) => {
    const b = empty();
    [0, 1, 2, 3].forEach((r) => (b[r * N + 1] = 1));
    b[20] = 2; // leaves (4,1) as the only finishing cell
    const m = chooseMove(b, N, 2, level);
    const after = [...b];
    after[m] = 2;
    expect(distance(after, N, 1)).toBeGreaterThan(1);
  });
});
