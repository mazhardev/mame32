import { describe, expect, it } from 'vitest';
import { buildDeck, canPlay, choose, deal, drawCard, pass, playCard } from './engine';
import type { CMCard, CMState } from './engine';
import { createRng } from '@/utils/random';

const card = (color: CMCard['color'], value: CMCard['value']): CMCard => ({ id: `${color}${value}${Math.random()}`, color, value });
const state = (hands: CMCard[][], topCard: CMCard): CMState => ({ hands, stock: Array.from({ length: 20 }, () => card('red', '1')), discard: [topCard], color: topCard.color as 'red', turn: 0, dir: 1, drew: false });

describe('color match cards', () => {
  it('has a 108-card deck and deals seven each onto a number card', () => {
    expect(buildDeck()).toHaveLength(108);
    const s = deal(4);
    expect(s.hands.every((h) => h.length === 7)).toBe(true);
    expect(s.discard[0].value).toMatch(/^\d$/);
  });

  it('matches colour or value; wilds always play', () => {
    const s = state([[], []], card('blue', '5'));
    expect(canPlay(s, card('blue', '9'))).toBe(true);
    expect(canPlay(s, card('red', '5'))).toBe(true);
    expect(canPlay(s, card('red', '6'))).toBe(false);
    expect(canPlay(s, card('wild', 'wild4'))).toBe(true);
  });

  it('applies skip, reverse and draw effects', () => {
    const skip = card('blue', 'skip');
    let s = state([[skip, card('red', '1')], [card('red', '2')], [card('red', '3')]], card('blue', '5'));
    expect(playCard(s, skip).turn).toBe(2);
    const rev = card('blue', 'reverse');
    s = state([[rev, card('red', '1')], [card('red', '2')], [card('red', '3')]], card('blue', '5'));
    const r = playCard(s, rev);
    expect(r.dir).toBe(-1);
    expect(r.turn).toBe(2);
    const plus = card('wild', 'wild4');
    s = state([[plus, card('red', '1')], [card('red', '2')]], card('blue', '5'));
    const w = playCard(s, plus, 'green');
    expect(w.hands[1]).toHaveLength(5);
    expect(w.turn).toBe(0);
    expect(w.color).toBe('green');
  });

  it('computer players finish a game with legal moves only', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const rng = createRng(level + 'cm').next;
      let s = deal(3, rng);
      for (let k = 0; k < 800 && s.hands.every((h) => h.length); k++) {
        const pick = choose(s, level, rng);
        if (pick) {
          expect(canPlay(s, pick.card)).toBe(true);
          s = playCard(s, pick.card, pick.color, rng);
        } else if (!s.drew) s = drawCard(s, rng);
        else s = pass(s);
      }
      expect(s.hands.some((h) => !h.length)).toBe(true);
    }
  });
});
