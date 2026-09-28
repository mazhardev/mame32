import { WORDS } from '../_shared/words/dictionary';
import { shuffleWith } from '@/utils/random';
import type { DifficultySetting } from '@/types';
export const SIZE = 10;
export function pathBetween(first: number, last: number, size = SIZE): number[] {
  const x = first % size,
    y = Math.floor(first / size),
    dx = (last % size) - x,
    dy = Math.floor(last / size) - y;
  if (dx !== 0 && dy !== 0 && Math.abs(dx) !== Math.abs(dy)) return [];
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  return Array.from(
    { length: steps + 1 },
    (_, i) => (y + Math.sign(dy) * i) * size + x + Math.sign(dx) * i,
  );
}
export interface Level {
  size: number;
  words: number;
  /** Allow words written backwards (right-to-left, bottom-to-top, reversed diagonals). */
  reverse: boolean;
}
export const LEVELS: Record<DifficultySetting, Level> = {
  easy: { size: 8, words: 5, reverse: false },
  normal: { size: 10, words: 7, reverse: true },
  hard: { size: 13, words: 10, reverse: true },
};
const FORWARD = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];
const BACKWARD = FORWARD.map(([dx, dy]) => [-dx, -dy]);
export function generate(level: Level = LEVELS.normal, random = Math.random) {
  const { size } = level;
  const grid = Array<string>(size * size).fill('');
  const placed: { word: string; path: number[] }[] = [];
  const dirs = level.reverse ? [...FORWARD, ...BACKWARD] : FORWARD;
  // Walk a shuffled pool so a word that will not fit is simply replaced by the next one.
  const pool = shuffleWith(
    WORDS.filter((w) => w.length >= 4 && w.length <= Math.min(8, size)),
    random,
  );
  for (const raw of pool) {
    if (placed.length === level.words) break;
    const word = raw.toUpperCase();
    if (placed.some((p) => p.word === word)) continue;
    for (let attempt = 0; attempt < 300; attempt++) {
      const start = Math.floor(random() * grid.length);
      const [dx, dy] = dirs[Math.floor(random() * dirs.length)];
      const endX = (start % size) + dx * (word.length - 1),
        endY = Math.floor(start / size) + dy * (word.length - 1);
      if (endX < 0 || endY < 0 || endX >= size || endY >= size) continue;
      const path = pathBetween(start, endY * size + endX, size);
      if (path.some((cell, i) => grid[cell] && grid[cell] !== word[i])) continue;
      path.forEach((cell, i) => (grid[cell] = word[i]));
      placed.push({ word, path });
      break;
    }
  }
  return {
    size,
    grid: grid.map((c) => c || String.fromCharCode(65 + Math.floor(random() * 26))),
    placed,
  };
}
export function matchWord(grid: string[], path: number[], word: string) {
  const s = path.map((i) => grid[i]).join('');
  return s === word || [...s].reverse().join('') === word;
}
