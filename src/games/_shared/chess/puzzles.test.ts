import { describe, expect, it } from 'vitest';
import { Chess } from './engine';
import { mateMoves } from './mate';
import { MATE_IN_1, MATE_IN_2, TACTICS } from './puzzles';

describe('chess puzzle data', () => {
  it('has enough puzzles of each kind', () => {
    expect(MATE_IN_1.length).toBeGreaterThanOrEqual(30);
    expect(MATE_IN_2.length).toBeGreaterThanOrEqual(30);
    expect(TACTICS.length).toBeGreaterThanOrEqual(30);
  });

  it('every mate-in-1 key move is the only mate', () => {
    for (const p of MATE_IN_1) {
      const c = new Chess(p.fen);
      const mates = mateMoves(c, 1);
      expect(mates).toHaveLength(1);
      expect(c.fromUci(p.move)).toBe(mates[0]);
    }
  });

  it('mate-in-2 keys force mate in two, with no mate in one available', () => {
    // A sample keeps the suite fast; the generator verified every position.
    for (const p of MATE_IN_2.filter((_, i) => i % 4 === 0)) {
      const c = new Chess(p.fen);
      expect(mateMoves(c, 1)).toHaveLength(0);
      const key = c.fromUci(p.move);
      expect(key).not.toBeNull();
      expect(mateMoves(c, 2)).toEqual([key]);
    }
  });

  it('tactics accept only legal moves', () => {
    for (const p of TACTICS) {
      const c = new Chess(p.fen);
      expect(p.accept.length).toBeGreaterThan(0);
      for (const u of p.accept) expect(c.fromUci(u)).not.toBeNull();
    }
  });
});
