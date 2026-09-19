import { describe, expect, it } from 'vitest';
import { CENTRE, allJumps, apply, jumpsFrom, layout, pegCount, solve } from './engine';

describe('peg solitaire', () => {
  it('sets up the classic board with 32 pegs and an empty centre', () => {
    const b = layout('classic');
    expect(b.filter((h) => h !== -1)).toHaveLength(33);
    expect(pegCount(b)).toBe(32);
    expect(b[CENTRE]).toBe(0);
    expect(allJumps(b)).toHaveLength(4);
  });

  it('jumps a peg over a neighbour into an empty hole and removes it', () => {
    const b = layout('classic');
    const [j] = jumpsFrom(b, 10);
    expect(j).toEqual({ from: 10, over: 17, to: 24 });
    const after = apply(b, j);
    expect(pegCount(after)).toBe(31);
    expect(after[17]).toBe(0);
    expect(after[24]).toBe(1);
  });

  it('cannot jump off the board or into the cut-off corners', () => {
    const b = layout('classic');
    expect(jumpsFrom(b, 2)).toEqual([]);
  });

  it.each(['plus', 'pyramid'] as const)('the %s layout can be solved to a single centre peg', (name) => {
    const path = solve(layout(name), true);
    expect(path).not.toBeNull();
    const end = (path ?? []).reduce(apply, layout(name));
    expect(pegCount(end)).toBe(1);
    expect(end[CENTRE]).toBe(1);
  });
});
