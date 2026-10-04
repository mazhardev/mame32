import { describe, expect, it } from 'vitest';
import { WORDS, award, cleanName, drawWord } from './words';

describe('pictionary words and scoring', () => {
  it('word lists are unique and do not repeat until exhausted', () => {
    for (const list of Object.values(WORDS)) expect(new Set(list).size).toBe(list.length);
    const used = new Set<string>();
    for (let i = 0; i < WORDS.easy.length; i++) used.add(drawWord('easy', used, Math.random));
    expect(used.size).toBe(WORDS.easy.length);
  });

  it('awards guesser and drawer, with a quick-guess bonus', () => {
    const players = [
      { name: 'A', score: 0 },
      { name: 'B', score: 0 },
      { name: 'C', score: 0 },
    ];
    const quick = award(players, 0, 2, 50, 60);
    expect(quick.map((p) => p.score)).toEqual([2, 0, 1]);
    const slow = award(players, 0, 1, 10, 60);
    expect(slow.map((p) => p.score)).toEqual([1, 1, 0]);
  });

  it('cleans player names', () => {
    expect(cleanName('  <b>Sam</b> ', 'P1')).toBe('bSam/b');
    expect(cleanName('   ', 'Player 2')).toBe('Player 2');
  });
});
