import { describe, expect, it } from 'vitest';
import { hardModeViolation, keyboardStates, roundScore, scoreGuess } from './engine';
import { answerWords, isWord } from '../_shared/words/lexicon';

describe('scoreGuess', () => {
  it('marks exact, present and absent letters', () => {
    expect(scoreGuess('crane', 'react')).toEqual([
      'present',
      'present',
      'correct',
      'absent',
      'present',
    ]);
    expect(scoreGuess('react', 'react')).toEqual(Array(5).fill('correct'));
    expect(scoreGuess('fudgy', 'react')).toEqual(Array(5).fill('absent'));
  });

  it('never marks more copies of a letter than the answer has', () => {
    // "speed" vs "abide": one E exists, so only the first E is marked.
    expect(scoreGuess('speed', 'abide')).toEqual([
      'absent',
      'absent',
      'present',
      'absent',
      'present',
    ]);
    // Exact match takes priority over an earlier present copy.
    expect(scoreGuess('eerie', 'there')).toEqual([
      'present',
      'absent',
      'present',
      'absent',
      'correct',
    ]);
    expect(scoreGuess('allee', 'lapel')).toEqual([
      'present',
      'present',
      'present',
      'correct',
      'absent',
    ]);
  });

  it('keyboard keeps the best state for each letter', () => {
    const k = keyboardStates(['crane', 'trace'], 'react');
    expect(k.c).toBe('correct');
    expect(k.t).toBe('present');
    expect(k.a).toBe('correct');
  });
});

describe('hard mode', () => {
  it('requires green letters in place and yellow letters somewhere', () => {
    expect(hardModeViolation('trace', ['crane'], 'react')).toBe(null);
    expect(hardModeViolation('boxes', ['crane'], 'react')).toMatch(/Letter 3 must be A/);
    expect(hardModeViolation('blast', ['crane'], 'react')).toMatch(/must contain/);
  });
});

describe('word lists', () => {
  it('has plenty of five-letter answers that are all valid guesses', () => {
    const answers = answerWords(5);
    expect(answers.length).toBeGreaterThan(500);
    for (const w of answers) expect(isWord(w)).toBe(true);
    expect(answers.every((w) => /^[a-z]{5}$/.test(w))).toBe(true);
  });

  it('scores fewer guesses higher', () => {
    expect(roundScore(1, 6, false)).toBeGreaterThan(roundScore(6, 6, false));
    expect(roundScore(3, 6, true)).toBeGreaterThan(roundScore(3, 6, false));
  });
});
