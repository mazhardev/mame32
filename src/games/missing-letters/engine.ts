import type { Rng } from '@/utils/random';
import { allWords, answerWords } from '../_shared/words/lexicon';

export const LEVELS = {
  easy: { lengths: [4, 5, 6], blanks: 1 },
  normal: { lengths: [5, 6, 7], blanks: 2 },
  hard: { lengths: [6, 7, 8], blanks: 3 },
} as const;

export interface Puzzle {
  word: string;
  /** Word with blanks as "_". */
  pattern: string;
}

/** Blanks never hide the first letter; they favour vowels on easier levels. */
export function makePuzzle(rng: Rng, word: string, blanks: number): Puzzle {
  const positions = rng.shuffle([...word].map((_, i) => i).filter((i) => i > 0)).slice(0, blanks);
  const pattern = [...word].map((ch, i) => (positions.includes(i) ? '_' : ch)).join('');
  return { word, pattern };
}

export function matchesPattern(input: string, pattern: string): boolean {
  if (input.length !== pattern.length) return false;
  for (let i = 0; i < pattern.length; i++)
    if (pattern[i] !== '_' && pattern[i] !== input[i]) return false;
  return true;
}

/** Every valid word that fits the pattern (any of them is accepted). */
export function solutions(pattern: string): string[] {
  return allWords().filter((w) => matchesPattern(w, pattern));
}

export function pickPuzzles(rng: Rng, level: keyof typeof LEVELS, count: number): Puzzle[] {
  const { lengths, blanks } = LEVELS[level];
  const pool = rng.shuffle(lengths.flatMap((n) => answerWords(n)));
  return pool.slice(0, count).map((w) => makePuzzle(rng, w, blanks));
}
