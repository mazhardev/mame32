import { describe, expect, it } from 'vitest';
import { CELLS, HOME, TARGET, apply, ccGame, initial, legalMoves, movesFrom, winner } from './engine';
import { searchBest } from '../_shared/board/search';

describe('chinese checkers', () => {
  it('builds the 121-hole star with 10-hole arms', () => {
    expect(CELLS).toHaveLength(121);
    expect(HOME[1]).toHaveLength(10);
    expect(HOME[2]).toHaveLength(10);
  });

  it('allows steps and chained jumps but not jumps over empty holes', () => {
    const s = initial();
    const moves = legalMoves(s);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves.every((m) => !s.board[m.to])).toBe(true);
    // Every jump in a path must pass over an occupied hole.
    for (const m of moves) {
      for (let k = 1; k < m.path.length; k++) {
        const a = CELLS[m.path[k - 1]];
        const b = CELLS[m.path[k]];
        const d = Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
        if (d === 2) {
          const mid = CELLS.findIndex((c) => c.x === (a.x + b.x) / 2 && c.y === (a.y + b.y) / 2 && c.z === (a.z + b.z) / 2);
          expect(s.board[mid]).not.toBe(0);
        } else expect(d).toBe(1);
      }
    }
    // A lone piece in open space can only step.
    const b = new Int8Array(121);
    const centre = CELLS.findIndex((c) => c.x === 0 && c.y === 0 && c.z === 0);
    b[centre] = 1;
    expect(movesFrom(b, centre)).toHaveLength(6);
  });

  it('detects a win, even when an opponent piece is left in the target', () => {
    const b = new Int8Array(121);
    for (const i of TARGET[1]) b[i] = 1;
    expect(winner(b)).toBe(1);
    b[TARGET[1][0]] = 2;
    expect(winner(b)).toBe(1);
    b[TARGET[1][1]] = 0;
    expect(winner(b)).toBeNull();
  });

  it('the computer moves forward from the start', () => {
    const s = apply(initial(), legalMoves(initial())[0]);
    const m = searchBest(ccGame, s, 1, 500, 0);
    expect(m).not.toBeNull();
    expect(CELLS[m!.to].z).toBeGreaterThan(CELLS[m!.from].z);
  });
});
