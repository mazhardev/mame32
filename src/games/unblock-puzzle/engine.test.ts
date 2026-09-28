import { describe, expect, it } from 'vitest';
import { EXIT_ROW, isSolved, parse, serialize, slide, slideRange, solve, validPieces } from './engine';
import { LEVEL_PACKS } from './levels';

// Key block 'a' on the exit row, blocked by vertical 'b' in column 3.
const simple = '......' + '...b..' + 'aa.b..' + '......' + '......' + '......';

describe('unblock rules', () => {
  it('parses blocks with the key block first', () => {
    const pieces = parse(simple);
    expect(pieces[0]).toEqual({ row: EXIT_ROW, col: 0, len: 2, horizontal: true });
    expect(pieces[1]).toEqual({ row: 1, col: 3, len: 2, horizontal: false });
    expect(serialize(pieces)).toBe(simple);
  });

  it('slides only along a block’s length and never through others', () => {
    const pieces = parse(simple);
    expect(slideRange(pieces, 0)).toEqual([0, 1]);
    expect(slideRange(pieces, 1)).toEqual([-1, 3]);
    expect(slide(pieces, 0, 2)).toBeNull();
    expect(slide(pieces, 1, 4)).toBeNull();
    expect(slide(pieces, 1, 2)![1].row).toBe(3);
  });

  it('solves with the fewest moves', () => {
    const pieces = parse(simple);
    const plan = solve(pieces)!;
    expect(plan).toHaveLength(2);
    let state = pieces;
    for (const [k, by] of plan) state = slide(state, k, by)!;
    expect(isSolved(state)).toBe(true);
  });

  it('rejects malformed saved layouts', () => {
    expect(validPieces(parse(simple))).toBe(true);
    expect(validPieces([{ row: 1, col: 0, len: 2, horizontal: true }])).toBe(false);
    expect(validPieces([...parse(simple), { row: 2, col: 3, len: 2, horizontal: false }])).toBe(false);
  });
});

describe('unblock level packs', () => {
  it('ships 20 levels per pack whose stored minimum matches the solver', () => {
    for (const [pack, levels] of Object.entries(LEVEL_PACKS)) {
      expect(levels.length, pack).toBe(20);
      for (const { level, moves } of levels) {
        expect(level).toHaveLength(36);
        const pieces = parse(level);
        expect(validPieces(pieces)).toBe(true);
        expect(solve(pieces)?.length, level).toBe(moves);
      }
    }
    expect(LEVEL_PACKS.hard[0].moves).toBeGreaterThanOrEqual(17);
  });
});
