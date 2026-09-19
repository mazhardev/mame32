import { describe, expect, it } from 'vitest';
import { HOME, chooseToken, initial, movable, move, passTurn, trackSquare } from './engine';

describe('ludo', () => {
  it('needs a six to leave the yard, and a six rolls again', () => {
    const s = initial([0, 2]);
    expect(movable(s, 0, 5)).toEqual([]);
    expect(movable(s, 0, 6)).toEqual([0, 1, 2, 3]);
    const r = move(s, 0, 6);
    expect(r.state.tokens[0][0]).toBe(0);
    expect(r.extraTurn).toBe(true);
    expect(r.state.turn).toBe(0);
  });

  it('maps each colour onto the shared track from its own start', () => {
    expect(trackSquare(0, 0)).toBe(0);
    expect(trackSquare(2, 0)).toBe(26);
    expect(trackSquare(2, 30)).toBe(4);
    expect(trackSquare(1, 51)).toBe(-1);
  });

  it('captures an opponent on an unsafe square and earns another roll', () => {
    const s = initial([0, 2]);
    s.tokens[0][0] = 1;
    s.tokens[2][0] = 29; // square (26 + 29) % 52 = 3
    const r = move(s, 0, 2);
    expect(r.captured).toEqual([{ color: 2, token: 0 }]);
    expect(r.state.tokens[2][0]).toBe(-1);
    expect(r.extraTurn).toBe(true);
  });

  it('never captures on safe squares', () => {
    const s = initial([0, 2]);
    s.tokens[0][0] = 5;
    s.tokens[2][0] = 34; // (26 + 34) % 52 = 8, a star square
    expect(move(s, 0, 3).captured).toEqual([]);
  });

  it('requires an exact roll to finish, and a third six forfeits the extra roll', () => {
    const s = initial([0, 2]);
    s.tokens[0] = [54, HOME, HOME, HOME];
    expect(movable(s, 0, 3)).toEqual([]);
    const r = move(s, 0, 2);
    expect(r.finished).toBe(true);
    const t = initial([0, 2]);
    t.tokens[0][0] = 10;
    t.sixes = 2;
    expect(move(t, 0, 6).state.turn).toBe(1);
    expect(passTurn(t).turn).toBe(1);
  });

  it('the computer prefers a capture', () => {
    const s = initial([0, 2]);
    s.tokens[0] = [1, 20, -1, -1];
    s.tokens[2][0] = 29; // on square 3
    expect(chooseToken(s, 2, 'normal')).toBe(0);
    expect(chooseToken(s, 2, 'hard')).toBe(0);
  });
});
