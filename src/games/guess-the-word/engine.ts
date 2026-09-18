import type { Rng } from '@/utils/random';
import { answerWords, isWord } from '../_shared/words/lexicon';

export function hasRepeats(word: string): boolean {
  return new Set(word).size !== word.length;
}

/** Letters shared by two words with no repeated letters (position ignored). */
export function sharedLetters(guess: string, secret: string): number {
  let n = 0;
  for (const ch of new Set(guess)) if (secret.includes(ch)) n++;
  return n;
}

export function secretWords(length: number): string[] {
  return answerWords(length).filter((w) => !hasRepeats(w));
}

export function pickSecret(length: number, rng: Rng): string {
  return rng.pick(secretWords(length));
}

export type GuessCheck = { ok: true } | { ok: false; reason: string };

export function checkGuess(guess: string, length: number, previous: string[]): GuessCheck {
  if (guess.length !== length) return { ok: false, reason: `Words must have ${length} letters` };
  if (hasRepeats(guess)) return { ok: false, reason: 'Use words with no repeated letters' };
  if (!isWord(guess)) return { ok: false, reason: 'Not in the word list' };
  if (previous.includes(guess)) return { ok: false, reason: 'Already guessed' };
  return { ok: true };
}

/** Words still consistent with every clue so far (used for the hint counter). */
export function remainingCandidates(length: number, clues: [string, number][]): string[] {
  return secretWords(length).filter((w) => clues.every(([g, n]) => sharedLetters(g, w) === n));
}
