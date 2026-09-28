import type { Direction } from '@/game-engine/InputManager';

/**
 * Sokoban: push every box onto a goal. The keeper walks freely but can
 * only push (never pull) one box at a time.
 *
 * Levels use the common text notation: '#' wall, ' ' floor, '.' goal,
 * '$' box, '*' box on goal, '@' keeper, '+' keeper on goal.
 */
export interface Level {
  w: number;
  h: number;
  walls: Set<number>;
  goals: Set<number>;
}

export interface State {
  player: number;
  boxes: number[];
}

export function parseLevel(text: string): { level: Level; state: State } {
  const rows = text.split('\n');
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const walls = new Set<number>();
  const goals = new Set<number>();
  const boxes: number[] = [];
  let player = -1;
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const ch = row[x] ?? ' ';
      const i = y * w + x;
      if (ch === '#') walls.add(i);
      if (ch === '.' || ch === '*' || ch === '+') goals.add(i);
      if (ch === '$' || ch === '*') boxes.push(i);
      if (ch === '@' || ch === '+') player = i;
    }
  });
  return { level: { w, h, walls, goals }, state: { player, boxes: boxes.sort((a, b) => a - b) } };
}

export function serializeLevel(level: Level, state: State): string {
  const rows: string[] = [];
  for (let y = 0; y < level.h; y++) {
    let row = '';
    for (let x = 0; x < level.w; x++) {
      const i = y * level.w + x;
      const goal = level.goals.has(i);
      const box = state.boxes.includes(i);
      row += level.walls.has(i)
        ? '#'
        : box
          ? goal
            ? '*'
            : '$'
          : i === state.player
            ? goal
              ? '+'
              : '@'
            : goal
              ? '.'
              : ' ';
    }
    rows.push(row.replace(/\s+$/, ''));
  }
  return rows.join('\n');
}

const DELTA = (w: number): Record<Direction, number> => ({ up: -w, down: w, left: -1, right: 1 });

/** One keeper step. Returns the new state and whether a box was pushed. */
export function step(level: Level, state: State, dir: Direction): { state: State; pushed: boolean } | null {
  const d = DELTA(level.w)[dir];
  const to = state.player + d;
  if (level.walls.has(to)) return null;
  const bi = state.boxes.indexOf(to);
  if (bi < 0) return { state: { player: to, boxes: state.boxes }, pushed: false };
  const beyond = to + d;
  if (level.walls.has(beyond) || state.boxes.includes(beyond)) return null;
  const boxes = state.boxes.slice();
  boxes[bi] = beyond;
  return { state: { player: to, boxes: boxes.sort((a, b) => a - b) }, pushed: true };
}

export function isSolved(level: Level, state: State): boolean {
  return state.boxes.every((b) => level.goals.has(b));
}

export function boxesOnGoals(level: Level, state: State): number {
  return state.boxes.filter((b) => level.goals.has(b)).length;
}

/** Floor cells the keeper can reach without pushing anything. */
export function reachable(level: Level, player: number, boxes: number[]): Set<number> {
  const seen = new Set([player]);
  const stack = [player];
  const blocked = new Set(boxes);
  while (stack.length) {
    const c = stack.pop()!;
    for (const d of [-level.w, level.w, -1, 1]) {
      const n = c + d;
      if (level.walls.has(n) || blocked.has(n) || seen.has(n)) continue;
      seen.add(n);
      stack.push(n);
    }
  }
  return seen;
}

/**
 * Squares from which a box can never reach a goal: found by "pulling" from
 * every goal. Pushing a box onto one of these is always a mistake.
 */
export function deadSquares(level: Level): Set<number> {
  const live = new Set<number>();
  const stack = [...level.goals];
  stack.forEach((g) => live.add(g));
  while (stack.length) {
    const c = stack.pop()!;
    for (const d of [-level.w, level.w, -1, 1]) {
      // A box at c+d can be pushed to c if the keeper can stand at c+2d.
      const from = c + d;
      const keeper = c + 2 * d;
      if (level.walls.has(from) || level.walls.has(keeper) || live.has(from)) continue;
      if (from < 0 || keeper < 0 || from >= level.w * level.h || keeper >= level.w * level.h) continue;
      live.add(from);
      stack.push(from);
    }
  }
  const dead = new Set<number>();
  for (let i = 0; i < level.w * level.h; i++) if (!level.walls.has(i) && !live.has(i)) dead.add(i);
  return dead;
}

/**
 * Fewest pushes to solve, by breadth-first search over (boxes, keeper
 * region) states. Returns null when unsolvable or over `limit` states.
 */
export function solvePushes(level: Level, start: State, limit = 400_000): number | null {
  const dead = deadSquares(level);
  if (start.boxes.some((b) => dead.has(b) && !level.goals.has(b))) return null;
  const norm = (s: State) => {
    const region = reachable(level, s.player, s.boxes);
    return `${Math.min(...region)}|${s.boxes.join(',')}`;
  };
  const seen = new Set([norm(start)]);
  let frontier: State[] = [start];
  let pushes = 0;
  while (frontier.length) {
    if (frontier.some((s) => isSolved(level, s))) return pushes;
    const next: State[] = [];
    for (const s of frontier) {
      const region = reachable(level, s.player, s.boxes);
      for (const box of s.boxes) {
        for (const d of [-level.w, level.w, -1, 1]) {
          const stand = box - d;
          const target = box + d;
          if (!region.has(stand) || level.walls.has(target) || s.boxes.includes(target) || dead.has(target))
            continue;
          const boxes = s.boxes.map((b) => (b === box ? target : b)).sort((a, b) => a - b);
          const t = { player: box, boxes };
          const k = norm(t);
          if (seen.has(k)) continue;
          seen.add(k);
          next.push(t);
        }
      }
      if (seen.size > limit) return null;
    }
    frontier = next;
    pushes++;
  }
  return null;
}
