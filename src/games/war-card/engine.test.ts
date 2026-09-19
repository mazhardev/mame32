import { describe, expect, it } from 'vitest';
import { battle, deal } from './engine';
import type { Card } from '../_shared/cards/deck';

const card = (rank: number, i: number): Card => ({ id: `c${i}-${rank}`, rank, suit: 'spades', faceUp: false });

describe('war', () => {
  it('deals 26 cards each', () => {
    const s = deal();
    expect(s.you).toHaveLength(26);
    expect(s.cpu).toHaveLength(26);
  });

  it('the higher card (aces high) takes both', () => {
    const r = battle({ you: [card(1, 0), card(2, 1)], cpu: [card(13, 2), card(3, 3)], round: 0 });
    expect(r.winner).toBe('you');
    expect(r.state.you).toHaveLength(3);
    expect(r.state.cpu).toHaveLength(1);
  });

  it('a tie starts a war with three face-down cards', () => {
    const you = [5, 2, 2, 2, 12, 4].map(card);
    const cpu = [5, 3, 3, 3, 9, 6].map((r, i) => card(r, i + 10));
    const r = battle({ you, cpu, round: 0 });
    expect(r.stages).toHaveLength(2);
    expect(r.pot).toBe(10);
    expect(r.winner).toBe('you');
    expect(r.state.you).toHaveLength(11);
  });

  it('keeps all 52 cards in play over a whole game', () => {
    let s = deal();
    for (let k = 0; k < 500 && s.you.length && s.cpu.length; k++) s = battle(s).state;
    expect(s.you.length + s.cpu.length).toBe(52);
  });
});
