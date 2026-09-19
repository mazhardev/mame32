import { describe, expect, it } from 'vitest';
import { applyPass, chooseCard, choosePass, handScores, legal, newHand, passOffset, playCard, startPlay, turnOf } from './engine';
import type { HeartsState } from './engine';
import { createRng } from '@/utils/random';

function playHand(level: 'easy' | 'normal' | 'hard', seed: number): HeartsState {
  const rng = createRng(seed).next;
  let s = newHand(rng);
  const picks = s.hands.map((h) => choosePass(h, level, rng));
  s = startPlay({ ...s, hands: applyPass(s.hands, picks, passOffset(1)) });
  for (let k = 0; k < 52; k++) {
    const seat = turnOf(s);
    const card = chooseCard(s, level, rng);
    expect(legal(s, seat).map((c) => c.id)).toContain(card.id);
    s = playCard(s, card).state;
  }
  return s;
}

describe('hearts', () => {
  it('passes left, right, across, then holds', () => {
    expect([1, 2, 3, 4, 5].map(passOffset)).toEqual([1, 3, 2, 0, 1]);
  });

  it('moves the three passed cards to the right seat', () => {
    const s = newHand(createRng(3).next);
    const picks = s.hands.map((h) => h.slice(0, 3));
    const after = applyPass(s.hands, picks, 1);
    expect(after.every((h) => h.length === 13)).toBe(true);
    expect(after[1].map((c) => c.id)).toEqual(expect.arrayContaining(picks[0].map((c) => c.id)));
  });

  it('opens with the two of clubs and awards all 26 points over a hand', () => {
    for (const level of ['easy', 'normal', 'hard'] as const) {
      const s = playHand(level, 7);
      expect(s.hands.every((h) => !h.length)).toBe(true);
      expect(s.taken.reduce((a, b) => a + b)).toBe(26);
    }
  });

  it('shooting the moon gives everyone else 26', () => {
    expect(handScores([26, 0, 0, 0])).toEqual({ add: [0, 26, 26, 26], moon: 0 });
    expect(handScores([13, 5, 8, 0]).add).toEqual([13, 5, 8, 0]);
  });

  it('first lead must be the two of clubs', () => {
    const s = startPlay(newHand(createRng(11).next));
    const first = legal(s, s.leader);
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({ suit: 'clubs', rank: 2 });
  });
});
