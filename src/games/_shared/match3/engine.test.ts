import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { createBoard, findMove, findRuns, isValidSwap, playSwap } from './engine';
import type { Board, Config, Special } from './engine';

const cfg: Config = { w: 5, h: 5, colors: 5, specials: true };
let id = 1000;
/** Builds a board from digit rows; a letter suffix map adds specials. */
function build(rows: string[], specials: Record<number, Special> = {}): Board {
  return rows.join('').split('').map((ch, i) => ({ id: id++, color: Number(ch), special: specials[i] ?? 'none' }));
}
const rng = () => createRng('m3').next;

describe('match-three board', () => {
  it('starts with no matches and at least one move', () => {
    for (let seed = 0; seed < 20; seed++) {
      const board = createBoard({ w: 8, h: 8, colors: 6, specials: true }, createRng(seed).next);
      expect(findRuns({ w: 8, h: 8, colors: 6, specials: true }, board)).toHaveLength(0);
      expect(findMove({ w: 8, h: 8, colors: 6, specials: true }, board)).not.toBeNull();
    }
  });

  it('finds horizontal and vertical runs', () => {
    const board = build(['11123', '42343', '14243', '21334', '32141']);
    const runs = findRuns(cfg, board);
    expect(runs.map((r) => r.cells)).toEqual([[0, 1, 2], [4, 9, 14]]);
  });
});

describe('swapping', () => {
  // Swapping cells 2 and 3 in the top row makes 1-1-1 across the top.
  const board = build(['11213', '23432', '34023', '40340', '02402']);

  it('only allows swaps that make a match', () => {
    expect(isValidSwap(cfg, board, 2, 3)).toBe(true);
    expect(isValidSwap(cfg, board, 5, 6)).toBe(false);
    expect(isValidSwap(cfg, board, 0, 6)).toBe(false); // not adjacent
    expect(playSwap(cfg, board, 5, 6, rng())).toBeNull();
  });

  it('clears the match, refills, and keeps the board full', () => {
    const steps = playSwap(cfg, board, 2, 3, rng())!;
    expect(steps[0].cleared.sort((a, b) => a - b)).toEqual([0, 1, 2]);
    expect(steps[0].clearedColors).toEqual([1, 1, 1]);
    const final = steps[steps.length - 1].board;
    expect(final.every((p) => p !== null)).toBe(true);
    expect(findRuns(cfg, final)).toHaveLength(0);
  });
});

describe('specials', () => {
  it('turns a line of four into a stripe piece', () => {
    // Swap 3 and 8 to complete 1-1-1-1 across the top row.
    const board = build(['11124', '23412', '34023', '40340', '02402']);
    const steps = playSwap(cfg, board, 3, 8, rng())!;
    expect(steps[0].created).toHaveLength(1);
    expect(steps[0].created[0].piece.special).toBe('col');
    expect(steps[0].cleared).toHaveLength(3);
  });

  it('turns a line of five into a rainbow piece', () => {
    // Swapping 2 (a 2) with 7 (a 1 below it) makes 1-1-1-1-1 across the top.
    const board = build(['11211', '23134', '34023', '40340', '02402']);
    const steps = playSwap(cfg, board, 2, 7, rng())!;
    expect(steps[0].created.map((c) => c.piece.special)).toContain('rainbow');
  });

  it('turns an L shape into a bomb', () => {
    // Moving the 1 at cell 15 up into cell 10 completes column 0 (rows 0–2)
    // and row 2 (cells 10–12) at once: an L with its corner at cell 10.
    const board = build(['12342', '13423', '31124', '14031', '20413']);
    const steps = playSwap(cfg, board, 10, 15, rng())!;
    expect(steps[0].created.map((c) => c.piece.special)).toContain('bomb');
  });

  it('fires a stripe caught in a match, clearing its whole row', () => {
    // Row 0: 1 1 [1 stripe-row] after swap; the row stripe clears the row.
    const board = build(['11213', '23432', '34023', '40340', '02402'], { 3: 'row' });
    const steps = playSwap(cfg, board, 2, 3, rng())!;
    expect(steps[0].cleared.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4]);
  });

  it('clears every piece of the swapped colour with a rainbow', () => {
    const board = build(['01234', '12340', '23401', '34012', '40123'], { 12: 'rainbow' });
    const steps = playSwap(cfg, board, 12, 13, rng())!;
    // Cell 13 is colour 0; there are five 0s on the board, plus the rainbow itself.
    expect(steps[0].cleared.length).toBe(6);
    expect(steps[0].clearedColors.filter((c) => c === 0)).toHaveLength(5);
  });
});
