import type { Group } from './puzzles';

/**
 * Word Groups: sixteen words hide four groups of four. Pick four words and
 * submit; a correct pick reveals its group, a wrong one costs one of four
 * mistakes. Three right out of four earns a "one away" nudge.
 */
export const MAX_MISTAKES = 4;

export interface State {
  /** Index of the puzzle in the list. */
  puzzle: number;
  /** Words still on the board, in display order. */
  board: string[];
  /** Groups solved so far (indexes into the puzzle), in the order found. */
  solved: number[];
  mistakes: number;
  /** Every submitted pick, so the same wrong guess is not charged twice. */
  guesses: string[][];
}

export type Outcome = 'correct' | 'one-away' | 'wrong' | 'repeat' | 'invalid';

export function newState(puzzle: Group[], index: number, random: () => number): State {
  const board = puzzle.flatMap((g) => g.words);
  for (let i = board.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [board[i], board[j]] = [board[j], board[i]];
  }
  return { puzzle: index, board, solved: [], mistakes: 0, guesses: [] };
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((w) => b.includes(w));

export function submit(puzzle: Group[], s: State, pick: string[]): { state: State; outcome: Outcome; group?: number } {
  if (pick.length !== 4 || new Set(pick).size !== 4 || !pick.every((w) => s.board.includes(w))) return { state: s, outcome: 'invalid' };
  if (s.guesses.some((g) => sameSet(g, pick))) return { state: s, outcome: 'repeat' };
  const guesses = [...s.guesses, [...pick]];
  const hit = puzzle.findIndex((g, i) => !s.solved.includes(i) && sameSet(g.words, pick));
  if (hit >= 0) {
    return {
      state: { ...s, guesses, solved: [...s.solved, hit], board: s.board.filter((w) => !pick.includes(w)) },
      outcome: 'correct',
      group: hit,
    };
  }
  const best = Math.max(...puzzle.map((g, i) => (s.solved.includes(i) ? 0 : g.words.filter((w) => pick.includes(w)).length)));
  return { state: { ...s, guesses, mistakes: s.mistakes + 1 }, outcome: best === 3 ? 'one-away' : 'wrong' };
}

export const isWon = (s: State) => s.solved.length === 4;
export const isLost = (s: State) => s.mistakes >= MAX_MISTAKES && !isWon(s);

export function shuffleBoard(s: State, random: () => number): State {
  const board = s.board.slice();
  for (let i = board.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [board[i], board[j]] = [board[j], board[i]];
  }
  return { ...s, board };
}

/** Points: 100 per group (more for harder ones), minus 50 per mistake. */
export function scoreFor(puzzle: Group[], s: State): number {
  const groups = s.solved.reduce((n, i) => n + 100 + puzzle[i].level * 50, 0);
  return Math.max(0, groups - s.mistakes * 50 + (isWon(s) && s.mistakes === 0 ? 200 : 0));
}

/** The puzzle number for a calendar day, cycling through the list. */
export function dailyIndex(date: Date, count: number): number {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return ((day % count) + count) % count;
}

export function validState(v: unknown, puzzles: Group[][]): v is State {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  if (!Number.isInteger(s.puzzle) || (s.puzzle as number) < 0 || (s.puzzle as number) >= puzzles.length) return false;
  const words = puzzles[s.puzzle as number].flatMap((g) => g.words);
  return (
    Array.isArray(s.board) &&
    s.board.every((w) => typeof w === 'string' && words.includes(w)) &&
    Array.isArray(s.solved) &&
    s.solved.every((i) => Number.isInteger(i) && i >= 0 && i < 4) &&
    Number.isInteger(s.mistakes) &&
    (s.mistakes as number) >= 0 &&
    (s.mistakes as number) <= MAX_MISTAKES &&
    Array.isArray(s.guesses) &&
    s.guesses.every((g) => Array.isArray(g) && g.every((w) => typeof w === 'string'))
  );
}
