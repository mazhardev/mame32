import { describe, expect, it } from 'vitest';
import { create, drop } from './game';

describe('stack tower', () => {
  it('keeps the full width on a perfect drop', () => {
    const s = create('normal');
    const base = s.tower[0];
    s.moving.x = base.x + 2;
    expect(drop(s)).toBe('perfect');
    expect(s.tower[1].w).toBe(base.w);
    expect(s.score).toBe(1);
  });

  it('slices off the overhang', () => {
    const s = create('normal');
    const base = s.tower[0];
    s.moving.x = base.x + 40;
    expect(drop(s)).toBe('cut');
    expect(s.tower[1].w).toBe(base.w - 40);
    expect(s.tower[1].x).toBe(base.x + 40);
    expect(s.falling).toHaveLength(1);
    expect(s.falling[0].w).toBe(40);
    // The next block has the new, narrower width.
    expect(s.moving.w).toBe(base.w - 40);
  });

  it('ends the game when the block misses the tower', () => {
    const s = create('normal');
    s.moving.x = s.tower[0].x + s.tower[0].w + 10;
    expect(drop(s)).toBe('miss');
    expect(s.over).toBe(true);
  });

  it('regrows after three perfect drops in a row', () => {
    const s = create('normal');
    s.tower[0].w = 120;
    s.tower[0].x = 120;
    for (let i = 0; i < 3; i++) {
      s.moving.x = s.tower[s.tower.length - 1].x;
      drop(s);
    }
    expect(s.tower[s.tower.length - 1].w).toBeGreaterThan(120);
  });
});
