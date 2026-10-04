/**
 * Color Tap: a colour name appears; tap the swatch of that colour before the
 * timer bar runs out. On Normal the word is printed in a different ink colour
 * now and then (the Stroop effect); on Hard it always is, and the swatches
 * shuffle every round.
 */
export type Level = 'easy' | 'normal' | 'hard';

export interface Colour {
  name: string;
  hex: string;
}

export const COLOURS: Colour[] = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Orange', hex: '#f97316' },
];

export interface Round {
  target: number;
  ink: number;
  options: number[];
  time: number;
}

const SETTINGS: Record<Level, { options: number; stroop: number; time: number; shuffle: boolean }> = {
  easy: { options: 4, stroop: 0, time: 2.2, shuffle: false },
  normal: { options: 4, stroop: 0.5, time: 1.8, shuffle: false },
  hard: { options: 6, stroop: 1, time: 1.5, shuffle: true },
};

export function makeRound(level: Level, streak: number, random: () => number, prevOptions?: number[]): Round {
  const cfg = SETTINGS[level];
  let options = prevOptions && !cfg.shuffle ? prevOptions : shuffled(COLOURS.length, random).slice(0, cfg.options);
  if (options.length !== cfg.options) options = shuffled(COLOURS.length, random).slice(0, cfg.options);
  const target = options[Math.floor(random() * options.length)];
  let ink = target;
  if (random() < cfg.stroop) {
    const others = COLOURS.map((_, i) => i).filter((i) => i !== target);
    ink = others[Math.floor(random() * others.length)];
  }
  // The window tightens as the streak grows, down to 60 % of the start.
  const time = cfg.time * Math.max(0.6, 1 - streak * 0.015);
  return { target, ink, options, time };
}

function shuffled(n: number, random: () => number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pointsFor = (streak: number, remainingFraction: number) =>
  10 + Math.round(remainingFraction * 10) + Math.min(20, Math.floor(streak / 5) * 5);
