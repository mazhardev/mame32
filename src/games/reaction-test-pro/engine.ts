/**
 * Reaction Test Pro: a three-part reaction battery.
 *  1. Simple — the panel turns green; respond as fast as possible.
 *  2. Choice — an arrow points left or right; press that side.
 *  3. Go / No-go — respond to green, hold still for red.
 * Each part has the same number of trials. Anticipating (responding before
 * the stimulus) counts as an error in every part.
 */
export type Level = 'easy' | 'normal' | 'hard';
export type Part = 'simple' | 'choice' | 'gonogo';
export const PARTS: Part[] = ['simple', 'choice', 'gonogo'];
export const TRIALS: Record<Level, number> = { easy: 4, normal: 5, hard: 6 };
export const NOGO_RATE = 0.3;
export const WINDOW_MS = 1200;

export interface Stimulus {
  part: Part;
  /** For choice trials. */
  side?: 'left' | 'right';
  /** For go/no-go trials: false means "don't respond". */
  go: boolean;
  delay: number;
}

export function makeStimulus(part: Part, random: () => number): Stimulus {
  const delay = 800 + random() * 1700;
  if (part === 'choice') return { part, side: random() < 0.5 ? 'left' : 'right', go: true, delay };
  if (part === 'gonogo') return { part, go: random() >= NOGO_RATE, delay };
  return { part, go: true, delay };
}

export interface Response {
  part: Part;
  ms: number | null;
  correct: boolean;
}

export type Input = { kind: 'early' } | { kind: 'press'; side?: 'left' | 'right'; ms: number } | { kind: 'timeout' };

/** Judges a response to a stimulus. */
export function judge(s: Stimulus, input: Input): Response {
  if (input.kind === 'early') return { part: s.part, ms: null, correct: false };
  if (input.kind === 'timeout') return { part: s.part, ms: null, correct: !s.go };
  if (!s.go) return { part: s.part, ms: input.ms, correct: false };
  if (s.part === 'choice') return { part: s.part, ms: input.ms, correct: input.side === s.side };
  return { part: s.part, ms: input.ms, correct: true };
}

export function partAverage(responses: Response[], part: Part): number | null {
  const ms = responses.filter((r) => r.part === part && r.correct && r.ms !== null).map((r) => r.ms as number);
  return ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : null;
}

/** Points: accuracy dominates, then speed in each part. */
export function batteryScore(responses: Response[]): number {
  const correct = responses.filter((r) => r.correct).length;
  let speed = 0;
  for (const p of PARTS) {
    const avg = partAverage(responses, p);
    if (avg !== null) speed += Math.max(0, 900 - avg);
  }
  return correct * 50 + Math.round(speed / 2);
}
