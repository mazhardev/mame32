import { describe, expect, it } from 'vitest';
import { compareHands, evaluate3, evaluate5 } from './poker';
import type { Card, Suit } from './deck';

const S: Record<string, Suit> = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
const R: Record<string, number> = { A: 1, K: 13, Q: 12, J: 11, T: 10 };
/** Parses "As Kd 7c" style hands. */
const hand = (text: string): Card[] =>
  text.split(' ').map((t, i) => ({ id: `${t}${i}`, rank: R[t[0]] ?? Number(t[0]), suit: S[t[1]], faceUp: true }));

describe('poker hand evaluation', () => {
  it.each([
    ['As Ks Qs Js Ts', 'Straight flush'],
    ['9c 9d 9h 9s 2c', 'Four of a kind'],
    ['3c 3d 3h 5s 5c', 'Full house'],
    ['2h 7h 9h Jh Kh', 'Flush'],
    ['As 2d 3h 4s 5c', 'Straight'],
    ['7c 7d 7h Ks 2c', 'Three of a kind'],
    ['7c 7d 5h 5s 2c', 'Two pair'],
    ['Ac Ad 5h 9s 2c', 'One pair'],
    ['Ac Qd 5h 9s 2c', 'High card'],
  ])('%s is %s', (cards, name) => {
    expect(evaluate5(hand(cards)).name).toBe(name);
  });

  it('breaks ties with kickers and treats the wheel as the lowest straight', () => {
    expect(compareHands(evaluate5(hand('Ac Ad 9h 5s 2c')), evaluate5(hand('Ah As 8h 5d 3c')))).toBeGreaterThan(0);
    expect(compareHands(evaluate5(hand('As 2d 3h 4s 5c')), evaluate5(hand('2s 3d 4h 5s 6c')))).toBeLessThan(0);
    expect(compareHands(evaluate5(hand('Kc Kd 9h 5s 2c')), evaluate5(hand('Kh Ks 9d 5d 2h')))).toBe(0);
  });

  it('ranks three-card hands with straights above flushes', () => {
    expect(evaluate3(hand('4c 5d 6h')).name).toBe('Straight');
    expect(evaluate3(hand('2h 9h Kh')).name).toBe('Flush');
    expect(compareHands(evaluate3(hand('4c 5d 6h')), evaluate3(hand('2h 9h Kh')))).toBeGreaterThan(0);
    expect(evaluate3(hand('Qc Qd 3h')).name).toBe('Pair');
    expect(compareHands(evaluate3(hand('Qc Qd 3h')), evaluate3(hand('Qh Qs 2h')))).toBeGreaterThan(0);
  });
});
