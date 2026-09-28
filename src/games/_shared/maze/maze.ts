import type { Direction } from '@/game-engine/InputManager';

/**
 * Grid mazes. Each cell stores its walls as bit flags; a cell index is
 * `y * w + x`. Generation uses an iterative recursive backtracker, which
 * produces a "perfect" maze: exactly one path between any two cells.
 */
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

export interface Maze {
  w: number;
  h: number;
  walls: Uint8Array;
}

export const DIRS: Record<Direction, { bit: number; dx: number; dy: number; opposite: number }> = {
  up: { bit: N, dx: 0, dy: -1, opposite: S },
  right: { bit: E, dx: 1, dy: 0, opposite: W },
  down: { bit: S, dx: 0, dy: 1, opposite: N },
  left: { bit: W, dx: -1, dy: 0, opposite: E },
};

const ORDER: Direction[] = ['up', 'right', 'down', 'left'];

export const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export function generateMaze(w: number, h: number, random: () => number = Math.random): Maze {
  const walls = new Uint8Array(w * h).fill(N | E | S | W);
  const visited = new Uint8Array(w * h);
  const stack = [Math.floor(random() * w * h)];
  visited[stack[0]] = 1;
  while (stack.length) {
    const cell = stack[stack.length - 1];
    const x = cell % w;
    const y = Math.floor(cell / w);
    const options = ORDER.filter((d) => {
      const nx = x + DIRS[d].dx;
      const ny = y + DIRS[d].dy;
      return nx >= 0 && ny >= 0 && nx < w && ny < h && !visited[ny * w + nx];
    });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const d = options[Math.floor(random() * options.length)];
    const next = (y + DIRS[d].dy) * w + x + DIRS[d].dx;
    walls[cell] &= ~DIRS[d].bit;
    walls[next] &= ~DIRS[d].opposite;
    visited[next] = 1;
    stack.push(next);
  }
  return { w, h, walls };
}

/** The neighbouring cell reached by moving `dir`, or -1 if a wall is in the way. */
export function step(maze: Maze, cell: number, dir: Direction): number {
  if (maze.walls[cell] & DIRS[dir].bit) return -1;
  const x = (cell % maze.w) + DIRS[dir].dx;
  const y = Math.floor(cell / maze.w) + DIRS[dir].dy;
  if (x < 0 || y < 0 || x >= maze.w || y >= maze.h) return -1;
  return y * maze.w + x;
}

export function openDirections(maze: Maze, cell: number): Direction[] {
  return ORDER.filter((d) => step(maze, cell, d) >= 0);
}

/**
 * Moves along a corridor until reaching a junction, dead end or `stopAt`
 * cell. Used for swipes, so one gesture travels a whole passage.
 */
export function run(
  maze: Maze,
  cell: number,
  dir: Direction,
  stopAt: (c: number) => boolean = () => false,
): number[] {
  const path: number[] = [];
  let at = cell;
  let heading: Direction | null = dir;
  while (heading) {
    const next = step(maze, at, heading);
    if (next < 0) break;
    path.push(next);
    at = next;
    if (stopAt(at)) break;
    const back: Direction = OPPOSITE[heading];
    const ways: Direction[] = openDirections(maze, at).filter((d) => d !== back);
    heading = ways.length === 1 ? ways[0] : null;
  }
  return path;
}

/** Breadth-first distances from `from`; -1 marks unreachable cells. */
export function distances(maze: Maze, from: number, blocked?: (a: number, b: number) => boolean) {
  const dist = new Int32Array(maze.w * maze.h).fill(-1);
  const parent = new Int32Array(maze.w * maze.h).fill(-1);
  dist[from] = 0;
  const queue = [from];
  for (let qi = 0; qi < queue.length; qi++) {
    const cell = queue[qi];
    for (const d of ORDER) {
      const next = step(maze, cell, d);
      if (next < 0 || dist[next] >= 0 || blocked?.(cell, next)) continue;
      dist[next] = dist[cell] + 1;
      parent[next] = cell;
      queue.push(next);
    }
  }
  return { dist, parent };
}

/** Shortest path from `a` to `b` inclusive of both ends, or [] if unreachable. */
export function shortestPath(maze: Maze, a: number, b: number): number[] {
  const { dist, parent } = distances(maze, a);
  if (dist[b] < 0) return [];
  const path = [b];
  while (path[path.length - 1] !== a) path.push(parent[path[path.length - 1]]);
  return path.reverse();
}

/** A single SVG path string drawing every wall once. */
export function wallPath(maze: Maze, cell: number): string {
  const parts: string[] = [];
  const { w, h, walls } = maze;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = walls[y * w + x];
      const [x0, y0, x1, y1] = [x * cell, y * cell, (x + 1) * cell, (y + 1) * cell];
      if (y === 0 && v & N) parts.push(`M${x0} ${y0}H${x1}`);
      if (x === 0 && v & W) parts.push(`M${x0} ${y0}V${y1}`);
      if (v & E) parts.push(`M${x1} ${y0}V${y1}`);
      if (v & S) parts.push(`M${x0} ${y1}H${x1}`);
    }
  }
  return parts.join('');
}
