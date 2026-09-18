import type { Rng } from '@/utils/random';
import { allWords, commonWords, isWord } from '../_shared/words/lexicon';

const prefixCache = new Map<string, string[]>();

/** Common words starting with the prefix (for choosing fair prefixes and showing examples). */
export function commonWithPrefix(prefix: string): string[] {
  let list = prefixCache.get(prefix);
  if (!list) {
    list = commonWords().filter((w) => w.startsWith(prefix) && w.length > prefix.length);
    prefixCache.set(prefix, list);
  }
  return list;
}

export function countAllWithPrefix(prefix: string): number {
  return allWords().filter((w) => w.startsWith(prefix) && w.length > prefix.length).length;
}

/** Prefixes with plenty of common completions. Longer prefixes on harder levels. */
export function pickPrefixes(rng: Rng, level: 'easy' | 'normal' | 'hard', count: number): string[] {
  const size = level === 'hard' ? 3 : 2;
  const minCommon = level === 'easy' ? 40 : level === 'normal' ? 25 : 10;
  const candidates = new Set<string>();
  for (const w of commonWords()) if (w.length > size + 1) candidates.add(w.slice(0, size));
  const good = [...candidates].filter((p) => commonWithPrefix(p).length >= minCommon);
  return rng.shuffle(good).slice(0, count);
}

export type Check = { ok: true; points: number } | { ok: false; reason: string };

export function checkWord(word: string, prefix: string, found: string[]): Check {
  if (!word.startsWith(prefix))
    return { ok: false, reason: `Must start with ${prefix.toUpperCase()}` };
  if (word.length <= prefix.length) return { ok: false, reason: 'Add at least one letter' };
  if (found.includes(word)) return { ok: false, reason: 'Already found' };
  if (!isWord(word)) return { ok: false, reason: 'Not in the word list' };
  // Longer words are worth more; the prefix itself earns nothing.
  return { ok: true, points: 10 * (word.length - prefix.length) + (word.length >= 7 ? 20 : 0) };
}
