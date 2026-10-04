import { describe, expect, it } from 'vitest';
import { searchBest } from '../_shared/board/search';
import { ADJ, initial, inMill, legalMoves, morrisGame, play, removable, winner } from './engine';
import type { Cell, MorrisState } from './engine';

function boardWith(cells: Record<number, Cell>): Cell[] {
  const b: Cell[] = Array(24).fill(0);
  for (const [k, v] of Object.entries(cells)) b[Number(k)] = v;
  return b;
}

describe("nine men's morris", () => {
  it('has a symmetric adjacency graph with 32 lines', () => {
    expect(ADJ.flat().length).toBe(64);
    ADJ.forEach((ns, a) => ns.forEach((b) => expect(ADJ[b]).toContain(a)));
  });

  it('starts with 24 placements and alternates turns', () => {
    const s = initial();
    expect(legalMoves(s)).toHaveLength(24);
    const t = play(s, { from: -1, to: 0, remove: -1 });
    expect(t.turn).toBe(2);
    expect(t.inHand).toEqual([8, 9]);
  });

  it('forming a mill offers one move per removable man, protecting mills', () => {
    const s: MorrisState = { board: boardWith({ 0: 1, 1: 1, 9: 2, 10: 2, 11: 2, 23: 2 }), turn: 1, inHand: [5, 5], quiet: 0 };
    const mills = legalMoves(s).filter((m) => m.to === 2);
    // 9-10-11 is a mill, so only 23 can be taken.
    expect(mills.map((m) => m.remove)).toEqual([23]);
    expect(removable(boardWith({ 9: 2, 10: 2, 11: 2 }), 2)).toEqual([9, 10, 11]);
    expect(inMill(boardWith({ 0: 1, 1: 1, 2: 1 }), 1)).toBe(true);
  });

  it('slides to adjacent points, flies with three men, and loses below three', () => {
    const moving: MorrisState = { board: boardWith({ 0: 1, 4: 1, 22: 1, 14: 1, 6: 2, 8: 2, 20: 2, 21: 2 }), turn: 1, inHand: [0, 0], quiet: 0 };
    const fromZero = legalMoves(moving).filter((m) => m.from === 0).map((m) => m.to).sort((a, b) => a - b);
    expect(fromZero).toEqual([1, 9]);
    const flying: MorrisState = { ...moving, board: boardWith({ 0: 1, 4: 1, 22: 1, 6: 2, 8: 2, 20: 2, 21: 2 }) };
    expect(legalMoves(flying).filter((m) => m.from === 0).length).toBe(17);
    const lost: MorrisState = { ...moving, board: boardWith({ 0: 1, 4: 1, 6: 2, 8: 2, 20: 2 }) };
    expect(winner(lost)).toBe(2);
  });

  it('a blocked player loses', () => {
    const s: MorrisState = { board: boardWith({ 0: 1, 2: 1, 21: 1, 23: 1, 1: 2, 9: 2, 14: 2, 22: 2 }), turn: 1, inHand: [0, 0], quiet: 0 };
    expect(legalMoves(s)).toHaveLength(0);
    expect(winner(s)).toBe(2);
  });

  it('the computer completes a mill when it can and blocks one otherwise', () => {
    const win: MorrisState = { board: boardWith({ 0: 2, 1: 2, 9: 1, 10: 1 }), turn: 2, inHand: [7, 7], quiet: 0 };
    expect(searchBest(morrisGame, win, 2, 500)?.to).toBe(2);
    const block: MorrisState = { board: boardWith({ 3: 1, 4: 1, 23: 2 }), turn: 2, inHand: [7, 8], quiet: 0 };
    expect(searchBest(morrisGame, block, 3, 500)?.to).toBe(5);
  });
});
