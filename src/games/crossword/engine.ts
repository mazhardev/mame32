import type { Rng } from '@/utils/random';

export type Dir = 'across' | 'down';

export interface Placed {
  answer: string;
  clue: string;
  row: number;
  col: number;
  dir: Dir;
  number: number;
}

export interface Puzzle {
  size: number;
  /** Solution letter per cell, or null for a block. */
  cells: (string | null)[];
  entries: Placed[];
}

const DR = { across: 0, down: 1 };
const DC = { across: 1, down: 0 };

/**
 * Greedy crossword builder. Words are placed only where they cross an
 * existing word on a shared letter and never touch another word side by
 * side, so every run of letters is a real entry.
 */
export function generate(
  rng: Rng,
  clues: [string, string][],
  size: number,
  target: number,
): Puzzle {
  let best: Omit<Placed, 'number'>[] = [];
  for (let attempt = 0; attempt < 12 && best.length < target; attempt++) {
    const grid: (string | null)[] = Array(size * size).fill(null);
    const placed: Omit<Placed, 'number'>[] = [];
    const pool = rng
      .shuffle(clues.filter(([a]) => a.length <= size).map(([a, c]) => ({ answer: a, clue: c })))
      .sort((a, b) => b.answer.length - a.answer.length);

    const at = (r: number, c: number) =>
      r >= 0 && c >= 0 && r < size && c < size ? grid[r * size + c] : null;
    const inside = (r: number, c: number) => r >= 0 && c >= 0 && r < size && c < size;

    const fits = (word: string, r0: number, c0: number, dir: Dir): number => {
      const dr = DR[dir];
      const dc = DC[dir];
      const endR = r0 + dr * (word.length - 1);
      const endC = c0 + dc * (word.length - 1);
      if (!inside(r0, c0) || !inside(endR, endC)) return -1;
      // Cells just before and after the word must be empty.
      if (at(r0 - dr, c0 - dc) !== null || at(endR + dr, endC + dc) !== null) return -1;
      let crossings = 0;
      for (let i = 0; i < word.length; i++) {
        const r = r0 + dr * i;
        const c = c0 + dc * i;
        const existing = at(r, c);
        if (existing !== null) {
          if (existing !== word[i]) return -1;
          crossings++;
        } else {
          // A new letter may not sit beside another letter (perpendicular neighbours).
          if (at(r + dc, c + dr) !== null || at(r - dc, c - dr) !== null) return -1;
        }
      }
      return crossings;
    };

    const put = (word: string, clue: string, r: number, c: number, dir: Dir) => {
      for (let i = 0; i < word.length; i++)
        grid[(r + DR[dir] * i) * size + c + DC[dir] * i] = word[i];
      placed.push({ answer: word, clue, row: r, col: c, dir });
    };

    const first = pool.shift();
    if (!first) break;
    put(
      first.answer,
      first.clue,
      Math.floor(size / 2),
      Math.floor((size - first.answer.length) / 2),
      'across',
    );

    for (const { answer, clue } of pool) {
      if (placed.length >= target) break;
      if (placed.some((p) => p.answer === answer)) continue;
      let options: [number, number, Dir, number][] = [];
      for (const p of placed) {
        const dir: Dir = p.dir === 'across' ? 'down' : 'across';
        for (let i = 0; i < p.answer.length; i++) {
          for (let j = 0; j < answer.length; j++) {
            if (p.answer[i] !== answer[j]) continue;
            const cr = p.row + DR[p.dir] * i;
            const cc = p.col + DC[p.dir] * i;
            const r = cr - DR[dir] * j;
            const c = cc - DC[dir] * j;
            const score = fits(answer, r, c, dir);
            if (score > 0) options.push([r, c, dir, score]);
          }
        }
      }
      if (!options.length) continue;
      const top = Math.max(...options.map((o) => o[3]));
      options = options.filter((o) => o[3] === top);
      const [r, c, dir] = rng.pick(options);
      put(answer, clue, r, c, dir);
    }
    if (placed.length > best.length) best = placed;
  }
  return finalize(best, size);
}

/** Builds the cell grid and assigns clue numbers in reading order. */
export function finalize(placed: Omit<Placed, 'number'>[], size: number): Puzzle {
  const cells: (string | null)[] = Array(size * size).fill(null);
  for (const p of placed) {
    for (let i = 0; i < p.answer.length; i++)
      cells[(p.row + DR[p.dir] * i) * size + p.col + DC[p.dir] * i] = p.answer[i];
  }
  const starts = [...new Set(placed.map((p) => p.row * size + p.col))].sort((a, b) => a - b);
  const numberOf = new Map(starts.map((s, i) => [s, i + 1]));
  const entries = placed
    .map((p) => ({ ...p, number: numberOf.get(p.row * size + p.col)! }))
    .sort((a, b) => a.number - b.number || (a.dir === 'across' ? -1 : 1));
  return { size, cells, entries };
}

export function cellsOf(e: Placed, size: number): number[] {
  return Array.from(
    { length: e.answer.length },
    (_, i) => (e.row + DR[e.dir] * i) * size + e.col + DC[e.dir] * i,
  );
}

export function isComplete(puzzle: Puzzle, letters: (string | null)[]): boolean {
  return puzzle.cells.every((c, i) => c === null || letters[i] === c);
}
