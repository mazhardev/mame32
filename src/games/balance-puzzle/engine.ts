/**
 * Balance Puzzle: balanced scales reveal how heavy shapes are relative to one
 * another. Use them to work out how many of one shape balance the question
 * scale. Puzzles are generated so that every weight assignment consistent
 * with the clues gives the same, whole-number answer.
 */
export type Level = 'easy' | 'normal' | 'hard';

export const SHAPES = ['🔺', '🟦', '🟣', '⭐'];
export const QUESTIONS = 8;

/** Count of each shape on one pan, indexed like SHAPES. */
export type Pan = number[];
export interface Scale {
  left: Pan;
  right: Pan;
}

export interface Puzzle {
  shapes: number;
  weights: number[];
  clues: Scale[];
  /** The left pan of the question scale. */
  ask: Pan;
  /** Shape that goes on the right pan. */
  unit: number;
  answer: number;
}

const CONFIG: Record<Level, { shapes: number; maxW: number; maxPan: number }> = {
  easy: { shapes: 3, maxW: 6, maxPan: 3 },
  normal: { shapes: 3, maxW: 9, maxPan: 4 },
  hard: { shapes: 4, maxW: 9, maxPan: 4 },
};

const weigh = (pan: Pan, w: number[]) => pan.reduce((a, n, i) => a + n * w[i], 0);
const size = (pan: Pan) => pan.reduce((a, b) => a + b, 0);

function randomPan(shapes: number, maxPan: number, random: () => number): Pan {
  const pan = Array(shapes).fill(0);
  const items = 1 + Math.floor(random() * maxPan);
  for (let i = 0; i < items; i++) pan[Math.floor(random() * shapes)] += 1;
  return pan;
}

/** Every weight vector with entries in 1..maxW that balances all the scales. */
export function consistent(clues: Scale[], shapes: number, maxW: number): number[][] {
  const out: number[][] = [];
  const w = Array(shapes).fill(1);
  const rec = (k: number) => {
    if (k === shapes) {
      if (clues.every((c) => weigh(c.left, w) === weigh(c.right, w))) out.push([...w]);
      return;
    }
    for (let v = 1; v <= maxW; v++) {
      w[k] = v;
      rec(k + 1);
    }
  };
  rec(0);
  return out;
}

/** The answer if it is the same whole number for every consistent weighting. */
export function uniqueAnswer(clues: Scale[], ask: Pan, unit: number, shapes: number, maxW: number): number | null {
  let answer: number | null = null;
  for (const w of consistent(clues, shapes, maxW)) {
    const total = weigh(ask, w);
    if (total % w[unit] !== 0) return null;
    const a = total / w[unit];
    if (answer !== null && a !== answer) return null;
    answer = a;
  }
  return answer;
}

export function generate(level: Level, random: () => number): Puzzle {
  const { shapes, maxW, maxPan } = CONFIG[level];
  for (let attempt = 0; attempt < 200; attempt++) {
    // Distinct weights keep the shapes meaningfully different.
    const pool = Array.from({ length: maxW }, (_, i) => i + 1);
    const weights = Array.from({ length: shapes }, () => pool.splice(Math.floor(random() * pool.length), 1)[0]);
    const unit = Math.floor(random() * shapes);
    const ask: Pan = randomPan(shapes, maxPan, random);
    ask[unit] = 0;
    if (size(ask) === 0) ask[(unit + 1) % shapes] = 1;
    if (weigh(ask, weights) % weights[unit] !== 0) continue;
    const answer = weigh(ask, weights) / weights[unit];
    if (answer < 1 || answer > 12) continue;
    const clues: Scale[] = [];
    for (let tries = 0; tries < 400 && clues.length < shapes + 1; tries++) {
      const left = randomPan(shapes, maxPan, random);
      const right = randomPan(shapes, maxPan, random);
      // A useful clue compares different things and actually balances.
      if (left.every((n, i) => n === right[i])) continue;
      if (left.some((n, i) => n > 0 && right[i] > 0)) continue;
      if (weigh(left, weights) !== weigh(right, weights)) continue;
      clues.push({ left, right });
      if (uniqueAnswer(clues, ask, unit, shapes, maxW) === answer) return { shapes, weights, clues, ask, unit, answer };
    }
  }
  // Fallback that is always solvable: each shape weighed directly against the unit.
  const weights = [1, 2, 3, 4].slice(0, shapes);
  const unit = 0;
  const clues = weights.slice(1).map((w, i) => {
    const left = Array(shapes).fill(0);
    left[i + 1] = 1;
    const right = Array(shapes).fill(0);
    right[0] = w;
    return { left, right };
  });
  const ask = Array(shapes).fill(0);
  ask[1] = 1;
  ask[2] = 1;
  return { shapes, weights, clues, ask, unit, answer: weights[1] + weights[2] };
}

/** Four distinct answer options including the right one. */
export function options(answer: number, random: () => number): number[] {
  const set = new Set([answer]);
  while (set.size < 4) {
    const d = Math.floor(random() * 7) - 3;
    const v = answer + (d === 0 ? 4 : d);
    if (v >= 1) set.add(v);
  }
  return [...set].sort((a, b) => a - b);
}
