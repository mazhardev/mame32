import { describe, expect, it } from 'vitest';
import { anteBonus, qualifies, settle, shouldPlay } from './engine';
import type { Card, Suit } from '../_shared/cards/deck';

const S: Record<string, Suit> = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
const R: Record<string, number> = { A: 1, K: 13, Q: 12, J: 11, T: 10 };
const hand = (t: string): Card[] => t.split(' ').map((x, i) => ({ id: `${x}${i}`, rank: R[x[0]] ?? Number(x[0]), suit: S[x[1]], faceUp: true }));

describe('three card game', () => {
  it('dealer qualifies with queen-high or better', () => {
    expect(qualifies(hand('Qs 5d 2c'))).toBe(true);
    expect(qualifies(hand('Js 9d 2c'))).toBe(false);
    expect(qualifies(hand('3s 3d 2c'))).toBe(true);
  });

  it('pays ante bonuses on straights and better', () => {
    expect(anteBonus(hand('4c 5d 6h'))).toBe(1);
    expect(anteBonus(hand('7c 7d 7h'))).toBe(4);
    expect(anteBonus(hand('4h 5h 6h'))).toBe(5);
    expect(anteBonus(hand('Ah Kd 2c'))).toBe(0);
  });

  it('settles folds, non-qualifying dealers, wins, losses and pushes', () => {
    expect(settle(hand('2c 5d 9h'), hand('Ks Kd 2c'), 10, true).net).toBe(-10);
    expect(settle(hand('2c 5d 9h'), hand('Js 9d 2c'), 10, false)).toMatchObject({ net: 10, outcome: 'no-qualify' });
    expect(settle(hand('Ac Ad 9h'), hand('Ks Kd 2c'), 10, false)).toMatchObject({ net: 20, outcome: 'win' });
    expect(settle(hand('Qc 5d 2h'), hand('Ks Kd 2c'), 10, false)).toMatchObject({ net: -20, outcome: 'lose' });
    expect(settle(hand('Qc 5d 2h'), hand('Qs 5h 2d'), 10, false)).toMatchObject({ net: 0, outcome: 'push' });
  });

  it('plays queen-six-four or better', () => {
    expect(shouldPlay(hand('Qc 6d 4h'))).toBe(true);
    expect(shouldPlay(hand('Qc 6d 3h'))).toBe(false);
    expect(shouldPlay(hand('Kc 3d 2h'))).toBe(true);
    expect(shouldPlay(hand('2c 2d 3h'))).toBe(true);
  });
});
