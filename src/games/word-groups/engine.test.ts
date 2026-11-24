import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { MAX_MISTAKES, dailyIndex, isLost, isWon, newState, scoreFor, shuffleBoard, submit, validState } from './engine';
import { PUZZLES } from './puzzles';

const puzzle = PUZZLES[1];
const start = () => newState(puzzle, 1, createRng('wg').next);

describe('word groups', () => {
  it('has thirty puzzles of four groups of four distinct words, one group at each level', () => {
    expect(PUZZLES).toHaveLength(30);
    for (const p of PUZZLES) {
      expect(p).toHaveLength(4);
      const words = p.flatMap((g) => g.words);
      expect(new Set(words).size).toBe(16);
      expect(new Set(p.map((g) => g.level))).toEqual(new Set([0, 1, 2, 3]));
      for (const w of words) expect(w).toMatch(/^[A-Z]+$/);
    }
  });

  it('deals all sixteen words', () => {
    expect(new Set(start().board)).toEqual(new Set(puzzle.flatMap((g) => g.words)));
  });

  it('reveals a correct group and removes its words', () => {
    const res = submit(puzzle, start(), [...puzzle[2].words]);
    expect(res.outcome).toBe('correct');
    expect(res.group).toBe(2);
    expect(res.state.board).toHaveLength(12);
    expect(res.state.mistakes).toBe(0);
  });

  it('says "one away" for three right, costs a mistake, and ignores a repeated guess', () => {
    const pick = [...puzzle[0].words.slice(0, 3), puzzle[1].words[0]];
    const res = submit(puzzle, start(), pick);
    expect(res.outcome).toBe('one-away');
    expect(res.state.mistakes).toBe(1);
    const again = submit(puzzle, res.state, [...pick].reverse());
    expect(again.outcome).toBe('repeat');
    expect(again.state.mistakes).toBe(1);
  });

  it('rejects picks that are not four words on the board', () => {
    expect(submit(puzzle, start(), puzzle[0].words.slice(0, 3)).outcome).toBe('invalid');
    expect(submit(puzzle, start(), ['X', 'Y', 'Z', 'W']).outcome).toBe('invalid');
  });

  it('is won with four groups and lost after four mistakes', () => {
    let s = start();
    for (const g of puzzle) s = submit(puzzle, s, [...g.words]).state;
    expect(isWon(s)).toBe(true);
    expect(scoreFor(puzzle, s)).toBeGreaterThan(600);

    let t = start();
    const wrongPicks = [
      [puzzle[0].words[0], puzzle[1].words[0], puzzle[2].words[0], puzzle[3].words[0]],
      [puzzle[0].words[1], puzzle[1].words[1], puzzle[2].words[1], puzzle[3].words[1]],
      [puzzle[0].words[2], puzzle[1].words[2], puzzle[2].words[2], puzzle[3].words[2]],
      [puzzle[0].words[3], puzzle[1].words[3], puzzle[2].words[3], puzzle[3].words[3]],
    ];
    for (const p of wrongPicks) t = submit(puzzle, t, p).state;
    expect(t.mistakes).toBe(MAX_MISTAKES);
    expect(isLost(t)).toBe(true);
  });

  it('shuffles without losing words and picks a daily puzzle in range', () => {
    const s = start();
    expect(new Set(shuffleBoard(s, Math.random).board)).toEqual(new Set(s.board));
    const d = dailyIndex(new Date(2026, 10, 24), 30);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThan(30);
    expect(dailyIndex(new Date(2026, 10, 25), 30)).toBe((d + 1) % 30);
  });

  it('accepts only well-formed saved states', () => {
    expect(validState(start(), PUZZLES)).toBe(true);
    expect(validState({ ...start(), puzzle: 99 }, PUZZLES)).toBe(false);
    expect(validState({ ...start(), board: ['NOPE'] }, PUZZLES)).toBe(false);
  });
});
