import { describe, expect, it } from 'vitest';
import { deal, findPair, isFree, layoutSlots, reshuffle } from './engine';
import type { LayoutName, TileSlot } from './engine';
import { createRng } from '@/utils/random';

describe('tile solitaire', () => {
  it.each(['pyramid', 'fortress', 'tower'] as LayoutName[])('%s has an even number of unique positions', (name) => {
    const slots = layoutSlots(name);
    expect(slots.length % 2).toBe(0);
    expect(new Set(slots.map((s) => `${s.x},${s.y},${s.z}`)).size).toBe(slots.length);
  });

  it('treats covered tiles and tiles boxed in on both sides as blocked', () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 2, y: 0, z: 0 };
    const c = { x: 4, y: 0, z: 0 };
    const top = { x: 2, y: 0, z: 1 };
    expect(isFree([a, b, c], b)).toBe(false);
    expect(isFree([a, b, c], a)).toBe(true);
    expect(isFree([a, b, top], a)).toBe(true);
    expect(isFree([a, b, top], b)).toBe(false);
  });

  it.each(['pyramid', 'fortress', 'tower'] as LayoutName[])('%s deals are solvable by the recorded solution', (name) => {
    const { tiles, solution } = deal(name, createRng(name).next);
    let left: TileSlot[] = tiles;
    for (const [a, b] of solution) {
      const ta = left.find((t) => t.id === a) as TileSlot;
      const tb = left.find((t) => t.id === b) as TileSlot;
      expect(ta.face).toBe(tb.face);
      expect(isFree(left, ta) && isFree(left, tb)).toBe(true);
      left = left.filter((t) => t !== ta && t !== tb);
    }
    expect(left).toHaveLength(0);
  });

  it('reshuffles into a position that still has a pair', () => {
    const { tiles } = deal('fortress', createRng(5).next);
    const mixed = reshuffle(tiles, createRng(9).next);
    expect(mixed.map((t) => t.face).sort()).toEqual(tiles.map((t) => t.face).sort());
    expect(findPair(mixed)).not.toBeNull();
  });
});
