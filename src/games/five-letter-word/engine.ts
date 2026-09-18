import type { LetterState } from '../_shared/words/WordUI';

export type Mark = Exclude<LetterState, 'empty' | 'pending'>;

/**
 * Colours a guess against the answer. Exact matches are marked first; a
 * letter is only "present" while unmatched copies remain in the answer, so
 * guessing "speed" against "abide" marks just one E.
 */
export function scoreGuess(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array(guess.length).fill('absent');
  const remaining = new Map<string, number>();
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) marks[i] = 'correct';
    else remaining.set(answer[i], (remaining.get(answer[i]) ?? 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    if (marks[i] === 'correct') continue;
    const n = remaining.get(guess[i]) ?? 0;
    if (n > 0) {
      marks[i] = 'present';
      remaining.set(guess[i], n - 1);
    }
  }
  return marks;
}

const RANK: Record<Mark, number> = { absent: 0, present: 1, correct: 2 };

/** Best-known state for each letter, for colouring the keyboard. */
export function keyboardStates(guesses: string[], answer: string): Record<string, Mark> {
  const out: Record<string, Mark> = {};
  for (const g of guesses) {
    scoreGuess(g, answer).forEach((m, i) => {
      const prev = out[g[i]];
      if (!prev || RANK[m] > RANK[prev]) out[g[i]] = m;
    });
  }
  return out;
}

/**
 * Hard-mode rule: revealed hints must be reused. Returns a message for the
 * first violation, or null when the guess is allowed.
 */
export function hardModeViolation(
  guess: string,
  previous: string[],
  answer: string,
): string | null {
  for (const p of previous) {
    const marks = scoreGuess(p, answer);
    for (let i = 0; i < p.length; i++) {
      if (marks[i] === 'correct' && guess[i] !== p[i]) {
        return `Letter ${i + 1} must be ${p[i].toUpperCase()}`;
      }
    }
    const needed = new Map<string, number>();
    marks.forEach((m, i) => {
      if (m !== 'absent') needed.set(p[i], (needed.get(p[i]) ?? 0) + 1);
    });
    for (const [ch, n] of needed) {
      const have = [...guess].filter((c) => c === ch).length;
      if (have < n) return `Guess must contain ${ch.toUpperCase()}`;
    }
  }
  return null;
}

/** Fewer guesses score more; hard mode is worth a bonus. */
export function roundScore(guessesUsed: number, maxGuesses: number, hard: boolean): number {
  const base = (maxGuesses - guessesUsed + 1) * 100;
  return hard ? Math.round(base * 1.5) : base;
}
