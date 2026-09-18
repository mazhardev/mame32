import type { Rng } from '@/utils/random';
import { answerWords, canSpell, isWord, wordsFromLetters } from '../_shared/words/lexicon';

export interface Level {
  letters: string[];
  targets: string[];
}

/**
 * A letter wheel built from one common word. Targets are common words the
 * letters can spell — enough to be satisfying, capped so a level fits on
 * screen. Always includes the base word itself.
 */
export function makeLevel(rng: Rng, baseLength: number, maxTargets: number): Level {
  for (let attempt = 0; attempt < 100; attempt++) {
    const base = rng.pick(answerWords(baseLength));
    const options = wordsFromLetters(base, 3, true).filter((w) => !/s$/.test(w) || w === base);
    if (options.length < 5) continue;
    const others = rng.shuffle(options.filter((w) => w !== base)).slice(0, maxTargets - 1);
    const targets = [base, ...others].sort((a, b) => a.length - b.length || a.localeCompare(b));
    return { letters: rng.shuffle([...base]), targets };
  }
  throw new Error('could not build a letter wheel');
}

export type Attempt =
  | { kind: 'target'; word: string }
  | { kind: 'bonus'; word: string }
  | { kind: 'repeat' }
  | { kind: 'invalid'; reason: string };

export function tryWord(word: string, level: Level, found: string[], bonus: string[]): Attempt {
  if (word.length < 3) return { kind: 'invalid', reason: 'At least 3 letters' };
  if (!canSpell(word, level.letters.join('')))
    return { kind: 'invalid', reason: 'Use the letters on the wheel' };
  if (found.includes(word) || bonus.includes(word)) return { kind: 'repeat' };
  if (level.targets.includes(word)) return { kind: 'target', word };
  if (isWord(word)) return { kind: 'bonus', word };
  return { kind: 'invalid', reason: 'Not in the word list' };
}
