import { describe, expect, it } from 'vitest';
import { checkGuess, hasRepeats, remainingCandidates, secretWords, sharedLetters } from './engine';

describe('guess the word', () => {
  it('counts shared letters regardless of position', () => {
    expect(sharedLetters('stone', 'notes')).toBe(5);
    expect(sharedLetters('crane', 'blimp')).toBe(0);
    expect(sharedLetters('plant', 'table')).toBe(3);
  });

  it('secret words never repeat letters', () => {
    for (const len of [4, 5]) {
      const words = secretWords(len);
      expect(words.length).toBeGreaterThan(200);
      expect(words.some(hasRepeats)).toBe(false);
    }
  });

  it('validates guesses', () => {
    expect(checkGuess('apple', 5, [])).toEqual({
      ok: false,
      reason: 'Use words with no repeated letters',
    });
    expect(checkGuess('xqzvw', 5, [])).toEqual({ ok: false, reason: 'Not in the word list' });
    expect(checkGuess('stone', 5, ['stone'])).toEqual({ ok: false, reason: 'Already guessed' });
    expect(checkGuess('stone', 5, []).ok).toBe(true);
  });

  it('narrows candidates consistently with the clues', () => {
    const secret = 'plant';
    const clues: [string, number][] = [['stone', sharedLetters('stone', secret)]];
    const left = remainingCandidates(5, clues);
    expect(left).toContain(secret);
    expect(left.every((w) => sharedLetters('stone', w) === clues[0][1])).toBe(true);
  });
});
