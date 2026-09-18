import type { Rng } from '@/utils/random';
import { canSpell, commonWords, isWord } from '../_shared/words/lexicon';

export const sortKey = (w: string) => [...w].sort().join('');

/** A step adds exactly one letter; the old letters may be rearranged. */
export function isValidStep(prev: string, next: string): boolean {
  return next.length === prev.length + 1 && canSpell(prev, next) && isWord(next);
}

let depthCache: Map<string, number> | null = null;
let childrenCache: Map<string, string[]> | null = null;

/**
 * For each letter multiset of common words, the common words one letter
 * longer that contain it. Depth = longest chain of common-word steps.
 */
function build(): { depth: Map<string, number>; children: Map<string, string[]> } {
  if (depthCache && childrenCache) return { depth: depthCache, children: childrenCache };
  const words = commonWords().filter((w) => w.length >= 3 && w.length <= 8);
  const children = new Map<string, string[]>();
  const keys = new Set(words.map(sortKey));
  for (const w of words) {
    const k = sortKey(w);
    for (let i = 0; i < k.length; i++) {
      const parent = k.slice(0, i) + k.slice(i + 1);
      if (!keys.has(parent) || parent.length < 3) continue;
      const list = children.get(parent) ?? [];
      if (!list.includes(w)) list.push(w);
      children.set(parent, list);
    }
  }
  const depth = new Map<string, number>();
  const byLength = [...keys].sort((a, b) => b.length - a.length);
  for (const k of byLength) {
    let best = 0;
    for (const c of children.get(k) ?? []) best = Math.max(best, 1 + (depth.get(sortKey(c)) ?? 0));
    depth.set(k, best);
  }
  depthCache = depth;
  childrenCache = children;
  return { depth, children };
}

/** Common words one letter longer that extend `word` (for hints). */
export function nextOptions(word: string): string[] {
  return build().children.get(sortKey(word)) ?? [];
}

export function chainDepth(word: string): number {
  return build().depth.get(sortKey(word)) ?? 0;
}

/** A three-letter starting word from which a long chain is possible. */
export function pickStart(rng: Rng, minDepth: number): string {
  const starts = commonWords().filter((w) => w.length === 3 && chainDepth(w) >= minDepth);
  return rng.pick(starts);
}

export function stepScore(word: string): number {
  return word.length * word.length * 5;
}
