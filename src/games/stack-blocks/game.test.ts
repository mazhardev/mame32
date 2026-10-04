import { describe, expect, it } from 'vitest';
import { BLOCK_W, create, land } from './game';

describe('stack blocks', () => {
  it('lands blocks, snapping near-perfect drops', () => {
    const s = create('normal');
    expect(land(s, 0, 'red')).toBe('perfect');
    expect(land(s, 3, 'red')).toBe('perfect');
    expect(s.tower[1].x).toBe(0);
    expect(land(s, 20, 'red')).toBe('ok');
  });

  it('misses when the block is not over the top block', () => {
    const s = create('normal');
    land(s, 0, 'red');
    expect(land(s, BLOCK_W, 'red')).toBe('miss');
    expect(s.tower).toHaveLength(1);
  });

  it('topples when too much weight hangs over one side', () => {
    const s = create('normal');
    land(s, 0, 'a');
    land(s, 30, 'b');
    expect(land(s, 58, 'c')).toBe('topple');
    expect(s.tower.length).toBeLessThan(3);
  });
});
