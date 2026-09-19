import { describe, expect, it } from 'vitest';
import { cpuBets, cpuCalls, discards, strength } from './engine';
import type { Card, Suit } from '../_shared/cards/deck';

const S: Record<string, Suit> = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
const R: Record<string, number> = { A: 1, K: 13, Q: 12, J: 11, T: 10 };
const hand = (t: string): Card[] => t.split(' ').map((x, i) => ({ id: `${x}${i}`, rank: R[x[0]] ?? Number(x[0]), suit: S[x[1]], faceUp: true }));

describe('five-card draw strategy', () => {
  it('stands pat on made hands', () => {
    expect(discards(hand('2h 7h 9h Jh Kh'))).toEqual([]);
    expect(discards(hand('3c 4d 5h 6s 7c'))).toEqual([]);
  });

  it('keeps pairs and trips, drawing to them', () => {
    expect(discards(hand('9c 9d 2h 5s Kc')).sort()).toEqual([2, 3, 4]);
    expect(discards(hand('7c 7d 7h 2s Kc')).sort()).toEqual([3, 4]);
  });

  it('draws one to a four-flush or open straight', () => {
    expect(discards(hand('2h 7h 9h Jh Kc'))).toEqual([4]);
    expect(discards(hand('5c 6d 7h 8s Kc'))).toEqual([4]);
  });

  it('otherwise keeps the high cards', () => {
    expect(discards(hand('Ac 9d 6h 4s 2c'))).toHaveLength(4);
    expect(discards(hand('Kc Qd 6h 4s 2c'))).toHaveLength(3);
  });

  it('bets strong hands and calls with reasonable ones', () => {
    expect(strength(hand('Ac Ad Ah 4s 2c'))).toBeGreaterThan(strength(hand('Ac Ad 6h 4s 2c')));
    expect(cpuBets(hand('Kc Kd Kh 4s 2c'), 'normal', () => 0.99)).toBe(true);
    expect(cpuCalls(hand('Qc Qd 6h 4s 2c'), 'normal', () => 0.99)).toBe(true);
    expect(cpuCalls(hand('9c 7d 6h 4s 2c'), 'normal', () => 0.99)).toBe(false);
  });
});
