import type { Rng } from '@/utils/random';
import { allWords, isCommonWord, isWord } from '../_shared/words/lexicon';

/** Letter weights for random tiles (vowels are topped up separately). */
const WEIGHTED =
  'eeeeeeeeeeaaaaaaaaiiiiiiioooooooonnnnnnrrrrrrttttttssssssllllluuuuddddgggbbccmmpphhffyywwvkjxqz';

export function makeGrid(rng: Rng, size: number): string[] {
  for (;;) {
    const cells = Array.from({ length: size * size }, () => rng.pick(WEIGHTED.split('')));
    const vowels = cells.filter((c) => 'aeiou'.includes(c)).length;
    // Keep grids playable: enough vowels, at most one rare letter.
    const rare = cells.filter((c) => 'jxqz'.includes(c)).length;
    if (vowels >= Math.round(size * size * 0.3) && rare <= 1) return cells;
  }
}

export function neighbours(i: number, size: number): number[] {
  const r = Math.floor(i / size);
  const c = i % size;
  const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) out.push(nr * size + nc);
    }
  }
  return out;
}

export function isPath(path: number[], size: number): boolean {
  const seen = new Set<number>();
  for (let i = 0; i < path.length; i++) {
    if (seen.has(path[i])) return false;
    seen.add(path[i]);
    if (i > 0 && !neighbours(path[i - 1], size).includes(path[i])) return false;
  }
  return true;
}

/** Finds a tile path spelling `word`, or null. Used for typed answers. */
export function findPath(grid: string[], size: number, word: string): number[] | null {
  const dfs = (path: number[]): number[] | null => {
    if (path.length === word.length) return path;
    const last = path[path.length - 1];
    for (const n of neighbours(last, size)) {
      if (!path.includes(n) && grid[n] === word[path.length]) {
        const found = dfs([...path, n]);
        if (found) return found;
      }
    }
    return null;
  };
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === word[0]) {
      const p = dfs([i]);
      if (p) return p;
    }
  }
  return null;
}

let prefixes: Set<string> | null = null;
function prefixSet(): Set<string> {
  if (prefixes) return prefixes;
  prefixes = new Set();
  for (const w of allWords()) for (let i = 1; i < w.length; i++) prefixes.add(w.slice(0, i));
  return prefixes;
}

/** Every valid word in the grid (depth-first search pruned by prefixes). */
export function solveGrid(grid: string[], size: number, minLength: number): string[] {
  const pre = prefixSet();
  const found = new Set<string>();
  const walk = (i: number, word: string, used: Set<number>) => {
    if (word.length >= minLength && isWord(word)) found.add(word);
    if (!pre.has(word)) return;
    for (const n of neighbours(i, size)) {
      if (used.has(n)) continue;
      used.add(n);
      walk(n, word + grid[n], used);
      used.delete(n);
    }
  };
  for (let i = 0; i < grid.length; i++) walk(i, grid[i], new Set([i]));
  return [...found].sort((a, b) => b.length - a.length || a.localeCompare(b));
}

export function wordPoints(word: string): number {
  const n = word.length;
  return n <= 3 ? 10 : n === 4 ? 20 : n === 5 ? 35 : n === 6 ? 50 : n === 7 ? 70 : 100;
}

/** The missed words worth showing: common ones first. */
export function notableMissed(all: string[], found: string[], limit = 12): string[] {
  const missed = all.filter((w) => !found.includes(w));
  return [...missed.filter(isCommonWord), ...missed.filter((w) => !isCommonWord(w))].slice(
    0,
    limit,
  );
}
