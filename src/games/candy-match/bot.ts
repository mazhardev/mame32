import { createRng } from '@/utils/random';
import { allMoves, countChocolate, countIcing, countJelly, countLocks, createState, playMove } from './engine';
import type { State, Step } from './engine';
import { allDone, goalStatus } from './levels';
import type { Level, Tracker } from './levels';

/**
 * A simple one-move-lookahead player used to calibrate and test levels. It
 * tries every legal swap on a copy of the board (with its own random refills,
 * so it cannot see the real ones) and picks the swap that does the most for
 * the level's goals. It plays roughly like a careful casual player.
 */

function ingredientDepth(s: State): number {
  let n = 0;
  s.pieces.forEach((p, i) => p?.kind === 'ingredient' && (n += Math.floor(i / s.w)));
  return n;
}

function specials(s: State): number {
  return s.pieces.reduce((n, p) => n + (p?.kind === 'candy' && p.special !== 'none' ? 1 : 0), 0);
}

function value(lvl: Level, before: Tracker, steps: Step[]): number {
  const after = steps[steps.length - 1].state;
  const points = steps.reduce((n, st) => n + st.points, 0);
  let v = points / 200 + (specials(after) - specials(before.state)) * 4;
  // Opening the board up always helps a little.
  v += (countLocks(before.state) - countLocks(after)) * 1.5 + (countIcing(before.state) - countIcing(after)) * 1;
  v += (countChocolate(before.state) - countChocolate(after)) * 2;
  for (const g of lvl.goals) {
    if (g.kind === 'collect') {
      const need = Math.max(0, g.count - (before.collected[g.color] ?? 0));
      const got = steps.reduce((n, st) => n + st.colors.filter((c) => c === g.color).length, 0);
      v += Math.min(need, got) * 3;
    } else if (g.kind === 'jelly') v += (countJelly(before.state) - countJelly(after)) * 6;
    else if (g.kind === 'icing') v += (countIcing(before.state) - countIcing(after)) * 6;
    else if (g.kind === 'chocolate') v += (countChocolate(before.state) - countChocolate(after)) * 8;
    else if (g.kind === 'ingredients')
      v += (after.ingredients.collected - before.state.ingredients.collected) * 60 + (ingredientDepth(after) - ingredientDepth(before.state)) * 4;
    else if (g.kind === 'score') v += points / 60;
  }
  return v;
}

export interface BotResult {
  won: boolean;
  movesUsed: number;
  score: number;
}

/**
 * Plays a level until its goals are met or `maxMoves` run out. `skill` is the
 * chance of playing the best move found; otherwise it plays any legal move,
 * which is closer to how a casual player gets on.
 */
export function botPlay(lvl: Level, seed: string, maxMoves: number, skill = 1, sample = 24): BotResult {
  const rng = createRng(seed);
  const start = createState(lvl.layout, rng.next);
  const tr: Tracker = { score: 0, collected: [], state: start };
  const scoreOnly = lvl.goals.every((g) => g.kind === 'score');
  for (let move = 1; move <= maxMoves; move++) {
    let moves = allMoves(tr.state);
    if (!moves.length) break;
    if (rng.next() >= skill) moves = [moves[rng.int(0, moves.length)]];
    // Look at a random sample of moves when there are many, to keep it quick.
    if (moves.length > sample) moves = rng.shuffle(moves).slice(0, sample);
    let best = moves[0];
    let bestV = -Infinity;
    moves.forEach(([a, b], k) => {
      const sim = playMove(tr.state, a, b, createRng(`${seed}:${move}:${k}`).next);
      if (!sim) return;
      const v = value(lvl, tr, sim) + rng.next() * 0.01;
      if (v > bestV) {
        bestV = v;
        best = [a, b];
      }
    });
    const steps = playMove(tr.state, best[0], best[1], rng.next)!;
    for (const st of steps) {
      tr.score += st.points;
      st.colors.forEach((c) => (tr.collected[c] = (tr.collected[c] ?? 0) + 1));
    }
    tr.state = steps[steps.length - 1].state;
    if (!scoreOnly && allDone(goalStatus(lvl, start, tr))) return { won: true, movesUsed: move, score: tr.score };
  }
  const won = allDone(goalStatus(lvl, start, tr));
  return { won, movesUsed: maxMoves, score: tr.score };
}
