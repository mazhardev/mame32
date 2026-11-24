import { createRng } from '@/utils/random';
import { allWords, commonWords } from '../_shared/words/lexicon';

/**
 * Hive Words: seven letters in a honeycomb. Make words of four or more letters
 * that use the centre letter; letters may repeat. A word that uses all seven
 * letters is a "full hive" worth a bonus.
 *
 * Puzzles come from words with exactly seven different letters (no S, so
 * plurals cannot pad the list). The answer list is the everyday word list;
 * rarer words are accepted as bonus finds.
 */
export interface Hive {
  /** The six outer letters, then the centre letter last. */
  letters: string[];
  center: string;
  answers: string[];
  pangrams: string[];
  max: number;
}

const mask = (w: string) => {
  let m = 0;
  for (const ch of w) m |= 1 << (ch.charCodeAt(0) - 97);
  return m;
};
const popcount = (m: number) => {
  let c = 0;
  while (m) {
    m &= m - 1;
    c++;
  }
  return c;
};

let cache: { common: string[]; masks: number[]; sets: number[]; all: Set<string> } | null = null;
function data() {
  if (!cache) {
    const common = commonWords().filter((w) => w.length >= 4 && !w.includes('s'));
    const masks = common.map(mask);
    const sets = [...new Set(masks.filter((m) => popcount(m) === 7))].sort((a, b) => a - b);
    cache = { common, masks, sets, all: new Set(allWords()) };
  }
  return cache;
}

export function points(word: string, pangram: boolean): number {
  return (word.length === 4 ? 1 : word.length) + (pangram ? 7 : 0);
}

export function hiveFrom(set: number, center: string): Hive {
  const { common, masks } = data();
  const c = 1 << (center.charCodeAt(0) - 97);
  const answers = common.filter((_, i) => (masks[i] & ~set) === 0 && masks[i] & c).sort();
  const pangrams = answers.filter((w) => mask(w) === set);
  const outer: string[] = [];
  for (let b = 0; b < 26; b++) if (set & (1 << b) && 1 << b !== c) outer.push(String.fromCharCode(97 + b));
  return {
    letters: [...outer, center],
    center,
    answers,
    pangrams,
    max: answers.reduce((n, w) => n + points(w, pangrams.includes(w)), 0),
  };
}

/** A hive with a good number of answers (20–55), chosen with `random`. */
export function makeHive(random: () => number): Hive {
  const { sets } = data();
  for (;;) {
    const set = sets[Math.floor(random() * sets.length)];
    const letters: string[] = [];
    for (let b = 0; b < 26; b++) if (set & (1 << b)) letters.push(String.fromCharCode(97 + b));
    // Try the centres in a random order.
    for (const center of letters.sort(() => random() - 0.5)) {
      const hive = hiveFrom(set, center);
      if (hive.answers.length >= 20 && hive.answers.length <= 55) return hive;
    }
  }
}

export type Check =
  | { ok: true; points: number; pangram: boolean; bonus: boolean }
  | { ok: false; reason: 'short' | 'center' | 'letters' | 'unknown' | 'found' };

export function check(hive: Hive, word: string, found: readonly string[]): Check {
  const w = word.toLowerCase();
  if (w.length < 4) return { ok: false, reason: 'short' };
  if ([...w].some((ch) => !hive.letters.includes(ch))) return { ok: false, reason: 'letters' };
  if (!w.includes(hive.center)) return { ok: false, reason: 'center' };
  if (found.includes(w)) return { ok: false, reason: 'found' };
  const inList = hive.answers.includes(w);
  if (!inList && !data().all.has(w)) return { ok: false, reason: 'unknown' };
  const pangram = new Set(w).size === 7;
  return { ok: true, points: points(w, pangram), pangram, bonus: !inList };
}

export const MESSAGES: Record<Exclude<Check, { ok: true }>['reason'], string> = {
  short: 'Too short: four letters or more',
  center: 'Use the centre letter',
  letters: 'Only the hive’s letters',
  unknown: 'Not in the word list',
  found: 'Already found',
};

export const RANKS: [number, string][] = [
  [0, 'Beginner'],
  [0.02, 'Warming Up'],
  [0.05, 'Busy'],
  [0.08, 'Good'],
  [0.15, 'Solid'],
  [0.25, 'Nice'],
  [0.4, 'Great'],
  [0.5, 'Amazing'],
  [0.7, 'Genius'],
  [1, 'Hive Master'],
];

export function rankIndex(score: number, max: number): number {
  let r = 0;
  RANKS.forEach(([f], i) => {
    if (score >= Math.round(f * max)) r = i;
  });
  return r;
}

export const scoreOf = (_hive: Hive, found: readonly string[]) =>
  found.reduce((n, w) => n + points(w, new Set(w).size === 7), 0);

/** The hive for a seed: a date key gives everyone the same daily hive. */
export function hiveForSeed(seed: string): Hive {
  return makeHive(createRng(`hive-words-${seed}`).next);
}
