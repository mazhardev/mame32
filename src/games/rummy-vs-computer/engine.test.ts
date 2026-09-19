import { describe, expect, it } from 'vitest';
import { arrange, bestDiscard, deal, discardCard, drawFrom, settle } from './engine';
import type { Card, Suit } from '../_shared/cards/deck';

const S: Record<string, Suit> = { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' };
const R: Record<string, number> = { A: 1, K: 13, Q: 12, J: 11, T: 10 };
const hand = (t: string): Card[] => t.split(' ').map((x, i) => ({ id: `${x}${i}`, rank: R[x[0]] ?? Number(x[0]), suit: S[x[1]], faceUp: true }));

describe('rummy', () => {
  it('deals ten each with one card face up on the discard pile', () => {
    const s = deal();
    expect(s.hands[0]).toHaveLength(10);
    expect(s.discard).toHaveLength(1);
    expect(s.stock).toHaveLength(31);
  });

  it('finds the arrangement with the least deadwood', () => {
    // 7♠8♠9♠ run plus 7♥7♦ — using 7♠ in the set would be worse.
    const a = arrange(hand('7s 8s 9s 7h 7d Kc'));
    expect(a.points).toBe(10 + 7 + 7);
    const b = arrange(hand('7s 8s 9s 7h 7d 7c Kc'));
    expect(b.points).toBe(10);
    expect(arrange(hand('As 2s 3s 4h 4d 4c')).points).toBe(0);
  });

  it('discards the card that hurts the hand least', () => {
    const r = bestDiscard(hand('7s 8s 9s 4h 4d 4c Kd Qh 2c 3d As'));
    expect(['Kd', 'Qh'].some((t) => r.card.id.startsWith(t))).toBe(true);
  });

  it('settles gin, knocks and undercuts', () => {
    const gin = settle(hand('As 2s 3s 4h 4d 4c 7c 8c 9c Tc'), hand('Kd Qh 2d'), 0);
    expect(gin).toMatchObject({ winner: 0, gin: true, points: 22 + 25 });
    const knock = settle(hand('As 2s 3s 4h 4d 4c 7c 8c 9c 5d'), hand('Kd Qh 2d 5h 6h 7h'), 0);
    expect(knock).toMatchObject({ winner: 0, points: 22 - 5 });
    const under = settle(hand('As 2s 3s 4h 4d 4c 7c 8c 9c 9d'), hand('Ks Kh Kc 2d 3d 4d 5d 5s 6s 7s'), 0);
    expect(under.undercut).toBe(true);
    expect(under.winner).toBe(1);
  });

  it('lets the defender lay off onto the knocker’s melds', () => {
    // 4♠ extends A-2-3♠ and T♣ extends 7-8-9♣, leaving only the K♦.
    const r = settle(hand('As 2s 3s 4h 4d 4c 7c 8c 9c 2h'), hand('4s Tc Kd'), 0);
    expect(r.deadwood[1]).toBe(10);
  });

  it('draws and discards on the right piles', () => {
    let s = deal();
    const up = s.discard[0];
    s = drawFrom(s, 'discard');
    expect(s.hands[0]).toContainEqual(up);
    s = discardCard(s, s.hands[0][0]);
    expect(s.turn).toBe(1);
    expect(s.hands[0]).toHaveLength(10);
  });
});
