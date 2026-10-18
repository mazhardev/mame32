import { ROWS, TILE, moverAt } from './levels';
import type { LevelData } from './levels';
import { PHYS, hazardUnder, newPlayer, stepPlayer, worldFor } from './player';
import type { PadInput, Player } from './player';

/**
 * Proves a level can be finished. A best-first search drives Pip with the
 * real movement code (no enemies), trying "left / none / right" with jump
 * held or not for a few frames at a time, until Pip reaches the goal pole
 * (or the boss arena). The winning input string can be replayed exactly.
 *
 * Input letters: L N R (no jump) and l n r (jump held), each lasting
 * MACRO frames of 1/60 s.
 */
export const MACRO = 6;
export const STEP = 1 / 60;
const ACTIONS = ['R', 'r', 'N', 'n', 'L', 'l'];

interface Sim {
  p: Player;
  t: number;
  prevJump: boolean;
  grid: string[];
}

export type Outcome = 'goal' | 'dead' | 'alive';

/** Where a level counts as finished: the goal pole, or a little way into the boss arena. */
export function finishX(level: LevelData): number {
  if (level.arenaX !== null) return level.arenaX + 2 * TILE;
  return (level.goalX ?? level.cols * TILE) - 6;
}

function startSim(level: LevelData): Sim {
  return { p: newPlayer(level.start.x, level.start.y), t: 0, prevJump: false, grid: level.grid };
}

/** Runs one macro step (MACRO frames) with the given action letter. Mutates sim. */
export function stepSim(level: LevelData, sim: Sim, action: string): Outcome {
  const jump = action === action.toLowerCase();
  const a = action.toUpperCase();
  const goal = finishX(level);
  for (let f = 0; f < MACRO; f++) {
    const input: PadInput = {
      left: a === 'L',
      right: a === 'R',
      jump,
      jumpPressed: jump && !sim.prevJump,
      downPressed: false,
    };
    sim.prevJump = jump;
    const t1 = sim.t + STEP;
    const ledges = level.movers.map((m) => ({ ...moverAt(m, t1), w: m.w }));
    const moves = level.movers.map((m) => {
      const a0 = moverAt(m, sim.t);
      const a1 = moverAt(m, t1);
      return { dx: a1.x - a0.x, dy: a1.y - a0.y };
    });
    sim.t = t1;
    stepPlayer(sim.p, input, STEP, worldFor(level, sim.grid, ledges, moves));
    if (sim.p.y > ROWS * TILE || hazardUnder(sim.p, sim.grid, level.cols)) return 'dead';
    if (sim.p.x + sim.p.w >= goal) return 'goal';
  }
  return 'alive';
}

/** Replays an input string from the start of the level. */
export function replay(level: LevelData, inputs: string): { outcome: Outcome; x: number } {
  const sim = startSim(level);
  for (const ch of inputs) {
    const out = stepSim(level, sim, ch);
    if (out !== 'alive') return { outcome: out, x: sim.p.x };
  }
  return { outcome: 'alive', x: sim.p.x };
}

interface Node {
  sim: Sim;
  parent: Node | null;
  action: string;
  steps: number;
  f: number;
}

class Heap {
  private a: Node[] = [];
  get size() {
    return this.a.length;
  }
  push(n: Node) {
    const a = this.a;
    a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): Node {
    const a = this.a;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

function key(level: LevelData, s: Sim): string {
  const p = s.p;
  let k = `${Math.round(p.x / 3)},${Math.round(p.y / 3)},${Math.round(p.vx / 40)},${Math.round(p.vy / 90)},${p.onGround ? 1 : 0},${s.prevJump ? 1 : 0}`;
  // Only platforms nearby matter for what Pip can do next; tracking far-away
  // ones too would multiply the search for nothing.
  for (const m of level.movers) {
    if (Math.abs(p.x - (m.x0 + m.x1) / 2) < 20 * TILE) k += `,${Math.floor(((s.t % m.period) / m.period) * 20)}`;
  }
  return k;
}

export interface SolveResult {
  ok: boolean;
  inputs: string;
  expanded: number;
  /** Furthest x reached (useful when a level cannot be solved). */
  bestX: number;
}

/**
 * Searches for a route. Tries an eager search first (it heads for the goal
 * and only backs off when stuck), then a more patient one.
 */
export function solveLevel(level: LevelData, maxExpand = 400_000): SolveResult {
  let total = 0;
  let best = 0;
  for (const weight of [3, 1.6]) {
    const r = search(level, maxExpand, weight);
    total += r.expanded;
    best = Math.max(best, r.bestX);
    if (r.ok) return { ...r, expanded: total, bestX: best };
  }
  return { ok: false, inputs: '', expanded: total, bestX: best };
}

function search(level: LevelData, maxExpand: number, weight: number): SolveResult {
  const goal = finishX(level);
  const macroDt = MACRO * STEP;
  const h = (x: number) => Math.max(0, goal - x) / PHYS.maxSpeed;
  const open = new Heap();
  const seen = new Set<string>();
  const start: Node = { sim: startSim(level), parent: null, action: '', steps: 0, f: 0 };
  start.f = h(start.sim.p.x);
  open.push(start);
  let expanded = 0;
  let bestX = 0;
  while (open.size && expanded < maxExpand) {
    const node = open.pop();
    expanded++;
    for (const action of ACTIONS) {
      const sim: Sim = { p: { ...node.sim.p }, t: node.sim.t, prevJump: node.sim.prevJump, grid: node.sim.grid };
      const out = stepSim(level, sim, action);
      if (out === 'dead') continue;
      bestX = Math.max(bestX, sim.p.x);
      const child: Node = { sim, parent: node, action, steps: node.steps + 1, f: 0 };
      if (out === 'goal') {
        let inputs = '';
        for (let n: Node | null = child; n && n.parent; n = n.parent) inputs = n.action + inputs;
        return { ok: true, inputs, expanded, bestX };
      }
      const k = key(level, sim);
      if (seen.has(k)) continue;
      seen.add(k);
      // Weighted towards the goal: we want a route, not the fastest one.
      child.f = child.steps * macroDt + weight * h(sim.p.x);
      open.push(child);
    }
  }
  return { ok: false, inputs: '', expanded, bestX };
}
