import type { Rng } from '@/utils/random';
import { answerWords, isWord } from '../_shared/words/lexicon';

export const LENGTHS = { easy: [4, 5], normal: [5, 6], hard: [7, 8] } as const;

export const sortLetters = (w: string) => [...w].sort().join('');

/** Shuffles until the result differs from the word (and isn't another real word). */
export function scramble(word: string, rng: Rng): string {
  for (let i = 0; i < 30; i++) {
    const s = rng.shuffle([...word]).join('');
    if (s !== word && !isWord(s)) return s;
  }
  return [...word].reverse().join('');
}

export function pickWords(rng: Rng, lengths: readonly number[], count: number): string[] {
  const pool = lengths.flatMap((n) => answerWords(n));
  return rng.shuffle([...pool]).slice(0, count);
}

/** The intended word, or any other real word using exactly the same letters. */
export function accepts(input: string, word: string): boolean {
  return input === word || (sortLetters(input) === sortLetters(word) && isWord(input));
}

/** Points: length-based, a bonus for time left, minus hint penalties. */
export function wordScore(word: string, secondsLeft: number, hints: number): number {
  return Math.max(10, word.length * 20 + Math.round(secondsLeft) * 2 - hints * 30);
}
