import type { Rng } from '@/utils/random';
import { canSpell, isWord, wordsFromLetters } from '../_shared/words/lexicon';

/**
 * Tile values by how often each letter is used in English: frequent letters
 * are cheap, rare ones are valuable. (Our own table.)
 */
export const VALUES: Record<string, number> = {
  e: 1,
  a: 1,
  i: 1,
  o: 1,
  n: 1,
  r: 1,
  t: 1,
  l: 1,
  s: 1,
  u: 2,
  d: 2,
  g: 2,
  h: 2,
  b: 3,
  c: 3,
  m: 3,
  p: 3,
  y: 3,
  f: 4,
  v: 4,
  w: 4,
  k: 4,
  j: 6,
  x: 6,
  q: 8,
  z: 8,
};

/** Tiles in the bag: roughly English letter frequency, 100 tiles. */
const COUNTS: Record<string, number> = {
  e: 12,
  a: 9,
  i: 8,
  o: 8,
  n: 6,
  r: 6,
  t: 6,
  l: 4,
  s: 5,
  u: 4,
  d: 4,
  g: 3,
  h: 3,
  b: 2,
  c: 3,
  m: 2,
  p: 2,
  y: 2,
  f: 2,
  v: 2,
  w: 2,
  k: 1,
  j: 1,
  x: 1,
  q: 1,
  z: 1,
};

export const RACK_SIZE = 7;

export function newBag(rng: Rng): string[] {
  const tiles = Object.entries(COUNTS).flatMap(([ch, n]) => Array<string>(n).fill(ch));
  return rng.shuffle(tiles);
}

/** Draws until the rack is full or the bag is empty. Returns [rack, bag]. */
export function refill(rack: string[], bag: string[]): [string[], string[]] {
  const r = [...rack];
  const b = [...bag];
  while (r.length < RACK_SIZE && b.length) r.push(b.pop()!);
  return [r, b];
}

export function wordValue(word: string): number {
  const base = [...word].reduce((sum, ch) => sum + (VALUES[ch] ?? 0), 0);
  const multiplier = word.length >= 7 ? 2 : word.length >= 5 ? 1.5 : 1;
  const bonus = word.length === RACK_SIZE ? 50 : 0;
  return Math.round(base * multiplier) + bonus;
}

export type PlayCheck = { ok: true; points: number } | { ok: false; reason: string };

export function checkPlay(word: string, rack: string[]): PlayCheck {
  if (word.length < 3) return { ok: false, reason: 'Words need at least 3 letters' };
  if (!canSpell(word, rack.join(''))) return { ok: false, reason: 'You don’t have those tiles' };
  if (!isWord(word)) return { ok: false, reason: 'Not in the word list' };
  return { ok: true, points: wordValue(word) };
}

/** Removes the letters of `word` from the rack (one tile per letter). */
export function removeTiles(rack: string[], word: string): string[] {
  const r = [...rack];
  for (const ch of word) r.splice(r.indexOf(ch), 1);
  return r;
}

/** The highest-scoring word the rack could have made (shown after each turn). */
export function bestPlay(rack: string[]): { word: string; points: number } | null {
  let best: { word: string; points: number } | null = null;
  for (const w of wordsFromLetters(rack.join(''), 3)) {
    const p = wordValue(w);
    if (!best || p > best.points) best = { word: w, points: p };
  }
  return best;
}
