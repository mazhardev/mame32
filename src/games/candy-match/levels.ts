import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';

/**
 * Candy Match level definitions, derived from a fixed seed per level so
 * each level is always the same. Goals rotate between reaching a score,
 * collecting candies of given colours, and clearing jelly tiles.
 */
export const LEVELS_PER_PACK = 24;
export const SIZE = 8;

export type Goal =
  | { kind: 'score'; target: number }
  | { kind: 'collect'; targets: { color: number; count: number }[] }
  | { kind: 'jelly' };

export interface LevelSpec {
  colors: number;
  moves: number;
  goal: Goal;
  /** Jelly layers per cell (0–2) for jelly levels, all zero otherwise. */
  jelly: number[];
}

const PACK = {
  easy: { colors: [5, 5], moves: [24, 20], scale: 0.8 },
  normal: { colors: [5, 6], moves: [22, 17], scale: 1 },
  hard: { colors: [6, 6], moves: [20, 15], scale: 1.25 },
};

export function levelSpec(pack: DifficultySetting, index: number): LevelSpec {
  const p = PACK[pack];
  const rng = createRng(`candy-${pack}-${index}`);
  const t = index / (LEVELS_PER_PACK - 1);
  const colors = t < 0.5 ? p.colors[0] : p.colors[1];
  const moves = Math.round(p.moves[0] + (p.moves[1] - p.moves[0]) * t);
  const kind = (['score', 'collect', 'jelly'] as const)[index % 3];
  const jelly = Array<number>(SIZE * SIZE).fill(0);
  let goal: Goal;
  if (kind === 'score') {
    goal = { kind, target: Math.round(((1500 + 2500 * t) * p.scale) / 100) * 100 };
  } else if (kind === 'collect') {
    const n = t < 0.4 ? 1 : 2;
    const picks = rng.shuffle(Array.from({ length: colors }, (_, c) => c)).slice(0, n);
    const count = Math.round(((n === 1 ? 22 : 16) + 14 * t) * p.scale);
    goal = { kind, targets: picks.map((color) => ({ color, count })) };
  } else {
    goal = { kind };
    // Symmetric jelly patterns; later levels add double-layer jelly.
    const cells = Math.round((10 + 18 * t) * p.scale);
    const half = SIZE / 2;
    let placed = 0;
    while (placed < cells) {
      const r = rng.int(1, SIZE - 1);
      const c = rng.int(0, half);
      const layers = rng.bool(t * 0.6) ? 2 : 1;
      for (const cc of [c, SIZE - 1 - c]) {
        const i = r * SIZE + cc;
        if (!jelly[i]) placed++;
        jelly[i] = Math.max(jelly[i], layers);
      }
    }
  }
  return { colors, moves, goal, jelly };
}

export function goalProgress(goal: Goal, score: number, collected: number[], jelly: number[]): number {
  if (goal.kind === 'score') return Math.min(1, score / goal.target);
  if (goal.kind === 'collect') {
    const need = goal.targets.reduce((a, g) => a + g.count, 0);
    const have = goal.targets.reduce((a, g) => a + Math.min(g.count, collected[g.color] ?? 0), 0);
    return have / need;
  }
  const total = jelly.length ? jelly.reduce((a, b) => a + b, 0) : 0;
  return total === 0 ? 1 : 0;
}

export function goalMet(goal: Goal, score: number, collected: number[], jelly: number[]): boolean {
  if (goal.kind === 'score') return score >= goal.target;
  if (goal.kind === 'collect') return goal.targets.every((g) => (collected[g.color] ?? 0) >= g.count);
  return jelly.every((j) => j === 0);
}

export function stars(movesLeft: number, moves: number): number {
  return movesLeft >= moves * 0.3 ? 3 : movesLeft >= moves * 0.1 ? 2 : 1;
}
