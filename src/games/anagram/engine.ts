import type { Rng } from '@/utils/random';
import { commonWords, isWord } from '../_shared/words/lexicon';

export const key = (w: string) => [...w].sort().join('');

let groups: string[][] | null = null;

/**
 * Sets of common words that are anagrams of each other (listen / silent /
 * enlist). Built once, lazily, from the common word list.
 */
export function anagramGroups(): string[][] {
  if (groups) return groups;
  const byKey = new Map<string, string[]>();
  for (const w of commonWords()) {
    if (w.length < 4) continue;
    // Skip simple plurals so "stop/pots/tops/spot" style sets stay interesting.
    const k = key(w);
    const list = byKey.get(k);
    if (list) list.push(w);
    else byKey.set(k, [w]);
  }
  groups = [...byKey.values()].filter((g) => g.length >= 2);
  return groups;
}

export function puzzlesFor(level: 'easy' | 'normal' | 'hard'): string[][] {
  const [min, max] = level === 'easy' ? [4, 4] : level === 'normal' ? [5, 5] : [6, 8];
  return anagramGroups().filter((g) => g[0].length >= min && g[0].length <= max);
}

export interface Puzzle {
  shown: string;
  answers: string[];
}

export function pickPuzzles(rng: Rng, level: 'easy' | 'normal' | 'hard', count: number): Puzzle[] {
  return rng
    .shuffle([...puzzlesFor(level)])
    .slice(0, count)
    .map((g) => {
      const shown = rng.pick(g);
      return { shown, answers: g.filter((w) => w !== shown) };
    });
}

/** A different real word made from exactly the same letters. */
export function isAnagramOf(input: string, shown: string): boolean {
  return input !== shown && key(input) === key(shown) && isWord(input);
}
