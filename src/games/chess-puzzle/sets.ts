import { Chess } from '../_shared/chess/engine';
import { MATE_IN_1, MATE_IN_2 } from '../_shared/chess/puzzles';
import type { MatePuzzle } from '../_shared/chess/puzzles';

export interface PuzzleSet {
  label: string;
  movesToMate: 1 | 2;
  items: MatePuzzle[];
}

let split: { checking: MatePuzzle[]; quiet: MatePuzzle[] } | null = null;

/** Mate-in-2 puzzles whose key move is not a check are much harder to spot. */
function splitMateInTwo() {
  if (split) return split;
  const checking: MatePuzzle[] = [];
  const quiet: MatePuzzle[] = [];
  for (const p of MATE_IN_2) {
    const c = new Chess(p.fen);
    const m = c.fromUci(p.move);
    if (m === null) continue;
    c.make(m);
    (c.inCheck() ? checking : quiet).push(p);
  }
  split = { checking, quiet };
  return split;
}

export function puzzleSet(level: 'easy' | 'normal' | 'hard'): PuzzleSet {
  if (level === 'easy') return { label: 'Mate in 1', movesToMate: 1, items: MATE_IN_1 };
  const { checking, quiet } = splitMateInTwo();
  if (level === 'normal') return { label: 'Mate in 2', movesToMate: 2, items: checking.length >= 10 ? checking : MATE_IN_2 };
  return { label: 'Quiet mate in 2', movesToMate: 2, items: quiet.length >= 10 ? quiet : MATE_IN_2 };
}
