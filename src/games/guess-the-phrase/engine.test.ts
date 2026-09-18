import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { PhraseRound, VOWEL_COST } from './engine';
import { PHRASES } from './phrases';

describe('PhraseRound', () => {
  const make = () => new PhraseRound('PIECE OF CAKE', 'Phrase', 3, createRng(1));

  it('hides letters but keeps spaces', () => {
    expect(make().board).toBe('_____ __ ____');
  });

  it('pays the prize for each consonant revealed', () => {
    const r = make();
    const prize = r.prize;
    const res = r.guess('c');
    expect(res.ok).toBe(true);
    expect(res.count).toBe(2);
    expect(r.points).toBe(prize * 2);
    expect(r.board).toBe('___C_ __ C___');
  });

  it('charges for vowels and refuses them without enough points', () => {
    const r = make();
    expect(r.guess('e').ok).toBe(false);
    expect(r.lives).toBe(3);
    r.guess('c');
    const before = r.points;
    expect(r.guess('e').ok).toBe(true);
    expect(r.points).toBe(before - VOWEL_COST);
  });

  it('a miss or a wrong solve costs a life; three misses end the round', () => {
    const r = make();
    r.guess('z');
    expect(r.lives).toBe(2);
    expect(r.solve('PIECE OF PIE')).toBe(false);
    expect(r.lives).toBe(1);
    r.guess('x');
    expect(r.over).toBe(true);
  });

  it('solving pays a bonus for hidden letters, ignoring punctuation and case', () => {
    const r = make();
    expect(r.solve('piece of cake')).toBe(true);
    expect(r.points).toBe(300 + 11 * 50);
    expect(r.over).toBe(true);
  });

  it('revealing every letter solves the round', () => {
    const r = new PhraseRound('TIME', 'Phrase', 3, createRng(2));
    r.guess('t');
    r.guess('m');
    r.guess('i');
    r.guess('e');
    expect(r.solved).toBe(true);
  });

  it('every phrase is uppercase letters, spaces and apostrophes', () => {
    for (const [, p] of PHRASES) expect(/^[A-Z ’]+$/.test(p)).toBe(true);
  });
});
