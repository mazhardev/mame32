import { WORDS } from '../_shared/words/dictionary';
import { shuffle } from '@/utils/random';
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
export function generate() {
  const grid = Array<string>(SIZE * SIZE).fill('');
  const placed: { word: string; path: number[] }[] = [];
  const pool = shuffle(WORDS.filter((w) => w.length >= 4 && w.length <= 8)).slice(0, 6);
  for (const raw of pool) {
    const word = raw.toUpperCase();
    for (let attempt = 0; attempt < 500; attempt++) {
      const start = Math.floor(Math.random() * grid.length);
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
      ];
      const [dx, dy] = dirs[Math.floor(Math.random() * dirs.length)];
      const endX = (start % SIZE) + dx * (word.length - 1),
        endY = Math.floor(start / SIZE) + dy * (word.length - 1);
      if (endX < 0 || endY < 0 || endX >= SIZE || endY >= SIZE) continue;
      const path = pathBetween(start, endY * SIZE + endX);
      if (path.some((cell, i) => grid[cell] && grid[cell] !== word[i])) continue;
      path.forEach((cell, i) => (grid[cell] = word[i]));
      placed.push({ word, path });
      break;
    }
  }
  return {
    grid: grid.map((c) => c || String.fromCharCode(65 + Math.floor(Math.random() * 26))),
    placed,
  };
}
export function matchWord(grid: string[], path: number[], word: string) {
  const s = path.map((i) => grid[i]).join('');
  return s === word || [...s].reverse().join('') === word;
}
