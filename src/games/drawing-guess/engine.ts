import type { DifficultySetting } from '@/types';
import { DECOY_NAMES, DRAWINGS, strokeLength } from '../_shared/creative/drawings';
import type { Drawing } from '../_shared/creative/drawings';

/**
 * Drawing Guess: the computer sketches a picture stroke by stroke and you
 * name it from a list. Guessing earlier scores more; similar-looking wrong
 * answers make it trickier.
 */
export const ROUNDS = 10;

export interface Tuning {
  options: number;
  drawTime: number;
}

export const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { options: 3, drawTime: 9 },
  normal: { options: 4, drawTime: 7 },
  hard: { options: 6, drawTime: 5.5 },
};

export function pointsFor(progress: number): number {
  return Math.round(20 + 80 * (1 - Math.min(1, Math.max(0, progress))));
}

/** Answer choices: the right name, lookalikes first, then others, shuffled. */
export function choicesFor(d: Drawing, count: number, random: () => number): string[] {
  const names = new Set<string>([d.name]);
  const look = (d.lookalikes ?? []).map(
    (id) => DRAWINGS.find((x) => x.id === id)?.name ?? id[0].toUpperCase() + id.slice(1),
  );
  for (const n of look) if (names.size < count) names.add(n);
  const pool = [...DRAWINGS.map((x) => x.name), ...DECOY_NAMES].sort(() => random() - 0.5);
  for (const n of pool) if (names.size < count) names.add(n);
  return [...names].sort(() => random() - 0.5);
}

export function pickRounds(random: () => number): Drawing[] {
  return [...DRAWINGS].sort(() => random() - 0.5).slice(0, ROUNDS);
}

/** How much of each stroke is drawn at a given overall progress (0–1). */
export function strokeProgress(d: Drawing, progress: number): number[] {
  const lengths = d.strokes.map(strokeLength);
  const total = lengths.reduce((a, b) => a + b, 0);
  let left = total * progress;
  return lengths.map((l) => {
    const drawn = Math.max(0, Math.min(l, left));
    left -= l;
    return drawn;
  });
}
