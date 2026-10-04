/**
 * Memory Training: an N-back trainer. Letters appear one at a time; press
 * MATCH when the current letter is the same as the one N steps back.
 * Performance adapts N between blocks, like the classic working-memory
 * training task: 80 % or better moves you up a level, under 50 % moves you down.
 */
export type Level = 'easy' | 'normal' | 'hard';

export const LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'];
export const START_N: Record<Level, number> = { easy: 1, normal: 2, hard: 3 };
export const STEP_MS: Record<Level, number> = { easy: 2600, normal: 2300, hard: 2000 };
export const BLOCK = 20;
export const BLOCKS = 3;

/**
 * A block of `BLOCK + n` letters with about 30 % matches. The first n letters
 * cannot be matches.
 */
export function makeBlock(n: number, random: () => number): string[] {
  const seq: string[] = [];
  for (let i = 0; i < BLOCK + n; i++) {
    if (i >= n && random() < 0.3) seq.push(seq[i - n]);
    else {
      let l = LETTERS[Math.floor(random() * LETTERS.length)];
      // Avoid accidental matches so the match rate stays near 30 %.
      while (i >= n && l === seq[i - n]) l = LETTERS[Math.floor(random() * LETTERS.length)];
      seq.push(l);
    }
  }
  return seq;
}

export const isMatch = (seq: string[], i: number, n: number) => i >= n && seq[i] === seq[i - n];

export interface BlockResult {
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
}

/** Scores one block from the player's responses (true = pressed MATCH). */
export function scoreBlock(seq: string[], n: number, pressed: boolean[]): BlockResult {
  const r: BlockResult = { hits: 0, misses: 0, falseAlarms: 0, correctRejections: 0 };
  for (let i = n; i < seq.length; i++) {
    const m = isMatch(seq, i, n);
    if (m && pressed[i]) r.hits++;
    else if (m) r.misses++;
    else if (pressed[i]) r.falseAlarms++;
    else r.correctRejections++;
  }
  return r;
}

export const accuracy = (r: BlockResult) => {
  const total = r.hits + r.misses + r.falseAlarms + r.correctRejections;
  return total ? (r.hits + r.correctRejections) / total : 0;
};

export function nextN(n: number, r: BlockResult): number {
  const a = accuracy(r);
  if (a >= 0.8) return n + 1;
  if (a < 0.5) return Math.max(1, n - 1);
  return n;
}
