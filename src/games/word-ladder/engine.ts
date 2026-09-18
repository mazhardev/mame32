import type { Rng } from '@/utils/random';
import { answerWords, isWord } from '../_shared/words/lexicon';

export function oneLetterApart(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i] && ++diff > 1) return false;
  return diff === 1;
}

const graphs = new Map<number, Map<string, string[]>>();

/**
 * Neighbour graph over common words of one length, built with wildcard
 * buckets ("c*t" → cat, cot, cut) so it stays fast for thousands of words.
 */
export function wordGraph(length: number): Map<string, string[]> {
  const cached = graphs.get(length);
  if (cached) return cached;
  const words = answerWords(length);
  const buckets = new Map<string, string[]>();
  for (const w of words) {
    for (let i = 0; i < length; i++) {
      const k = `${w.slice(0, i)}*${w.slice(i + 1)}`;
      const b = buckets.get(k);
      if (b) b.push(w);
      else buckets.set(k, [w]);
    }
  }
  const graph = new Map<string, string[]>();
  for (const w of words) {
    const n = new Set<string>();
    for (let i = 0; i < length; i++) {
      for (const o of buckets.get(`${w.slice(0, i)}*${w.slice(i + 1)}`) ?? [])
        if (o !== w) n.add(o);
    }
    graph.set(w, [...n]);
  }
  graphs.set(length, graph);
  return graph;
}

/** Shortest ladder between two words through common words, or null. */
export function shortestPath(from: string, to: string): string[] | null {
  if (from.length !== to.length) return null;
  const graph = wordGraph(from.length);
  if (from === to) return [from];
  const prev = new Map<string, string>([[from, '']]);
  const queue = [from];
  for (let qi = 0; qi < queue.length; qi++) {
    const w = queue[qi];
    for (const n of graph.get(w) ?? []) {
      if (prev.has(n)) continue;
      prev.set(n, w);
      if (n === to) {
        const path = [to];
        let cur = w;
        while (cur) {
          path.unshift(cur);
          cur = prev.get(cur)!;
        }
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}

/** Distances from `from` to every reachable word (BFS layers). */
function distances(from: string): Map<string, number> {
  const graph = wordGraph(from.length);
  const dist = new Map<string, number>([[from, 0]]);
  const queue = [from];
  for (let qi = 0; qi < queue.length; qi++) {
    const w = queue[qi];
    for (const n of graph.get(w) ?? []) {
      if (!dist.has(n)) {
        dist.set(n, dist.get(w)! + 1);
        queue.push(n);
      }
    }
  }
  return dist;
}

export interface Ladder {
  start: string;
  end: string;
  optimal: number;
}

/** A start/end pair whose shortest ladder is `minSteps`–`maxSteps` changes long. */
export function makeLadder(rng: Rng, length: number, minSteps: number, maxSteps: number): Ladder {
  const words = answerWords(length).filter((w) => (wordGraph(length).get(w)?.length ?? 0) >= 2);
  for (let attempt = 0; attempt < 200; attempt++) {
    const start = rng.pick(words);
    const dist = distances(start);
    const targets = [...dist].filter(([, d]) => d >= minSteps && d <= maxSteps).map(([w]) => w);
    if (targets.length) {
      const end = rng.pick(targets);
      return { start, end, optimal: dist.get(end)! };
    }
  }
  throw new Error(`no ladder of ${minSteps}-${maxSteps} steps for length ${length}`);
}

export type StepCheck = { ok: true } | { ok: false; reason: string };

/** Player steps may use any valid word, not just common ones. */
export function checkStep(prev: string, next: string, used: string[]): StepCheck {
  if (next.length !== prev.length) return { ok: false, reason: `Use ${prev.length} letters` };
  if (!oneLetterApart(prev, next)) return { ok: false, reason: 'Change exactly one letter' };
  if (!isWord(next)) return { ok: false, reason: 'Not in the word list' };
  if (used.includes(next)) return { ok: false, reason: 'Already used' };
  return { ok: true };
}

/** Next word on a shortest route from `current` to `end` (for hints). */
export function hint(current: string, end: string): string | null {
  const path = shortestPath(current, end);
  return path && path.length > 1 ? path[1] : null;
}
