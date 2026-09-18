import { COMMON_WORDS, EXTENDED_WORDS } from './lexiconData';
import type { Rng } from '@/utils/random';

/**
 * Word lookup for word games. Only game chunks import this module, so the
 * ~180 KB list is never part of the homepage bundle.
 *
 * - COMMON: everyday words, used for answers and hints.
 * - ALL: COMMON plus less frequent words, accepted as valid guesses.
 */
const common = COMMON_WORDS.split(' ');
const all = [...common, ...EXTENDED_WORDS.split(' ')];
const COMMON_SET = new Set(common);
const ALL_SET = new Set(all);

export function isWord(word: string): boolean {
  return ALL_SET.has(word.toLowerCase());
}

export function isCommonWord(word: string): boolean {
  return COMMON_SET.has(word.toLowerCase());
}

/** Plurals and past tenses make weak answers ("areas", "asked"). */
function looksInflected(w: string): boolean {
  return (
    (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) ||
    w.endsWith('ed')
  );
}

const answerCache = new Map<number, string[]>();

/** Good answer words of an exact length: common and not plural or past tense. */
export function answerWords(length: number): string[] {
  let list = answerCache.get(length);
  if (!list) {
    list = common.filter((w) => w.length === length && !looksInflected(w));
    answerCache.set(length, list);
  }
  return list;
}

export function pickAnswer(length: number, rng: Rng): string {
  return rng.pick(answerWords(length));
}

export function letterCounts(word: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const ch of word) m.set(ch, (m.get(ch) ?? 0) + 1);
  return m;
}

/** Can `word` be spelled using each letter of `letters` at most once? */
export function canSpell(word: string, letters: string): boolean {
  const available = letterCounts(letters);
  for (const ch of word) {
    const n = available.get(ch) ?? 0;
    if (n === 0) return false;
    available.set(ch, n - 1);
  }
  return true;
}

/** Every word (min length) spellable from the letters, longest first. */
export function wordsFromLetters(letters: string, minLength = 3, commonOnly = false): string[] {
  const pool = commonOnly ? common : all;
  return pool
    .filter((w) => w.length >= minLength && w.length <= letters.length && canSpell(w, letters))
    .sort((a, b) => b.length - a.length || a.localeCompare(b));
}

export function commonWords(): readonly string[] {
  return common;
}

export function allWords(): readonly string[] {
  return all;
}
