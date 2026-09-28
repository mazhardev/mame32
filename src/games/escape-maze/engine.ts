import type { DifficultySetting } from '@/types';
import { distances, generateMaze, shortestPath, step, openDirections } from '../_shared/maze/maze';
import type { Maze } from '../_shared/maze/maze';
import type { Direction } from '@/game-engine/InputManager';

/**
 * Escape Maze: a dark maze seen through a small circle of light, with
 * locked doors whose keys lie elsewhere, bonus coins, and a countdown.
 * A run is LEVELS_PER_RUN mazes of growing size.
 */
export const LEVELS_PER_RUN = 5;

export interface Settings {
  vision: number;
  secondsPerStep: number;
  baseSize: number;
  doors: (level: number) => number;
}

export const SETTINGS: Record<DifficultySetting, Settings> = {
  easy: { vision: 3.3, secondsPerStep: 1.3, baseSize: 7, doors: (l) => (l >= 3 ? 1 : 0) },
  normal: { vision: 2.5, secondsPerStep: 1.0, baseSize: 8, doors: (l) => (l >= 4 ? 2 : l >= 2 ? 1 : 0) },
  hard: { vision: 1.8, secondsPerStep: 0.8, baseSize: 9, doors: (l) => (l >= 4 ? 3 : l >= 2 ? 2 : 1) },
};

export interface Door {
  a: number;
  b: number;
  color: number;
}

export interface Level {
  maze: Maze;
  start: number;
  exit: number;
  doors: Door[];
  /** keys[i] opens the door with colour i. */
  keys: number[];
  coins: number[];
  seconds: number;
}

export function sizeFor(settings: Settings, level: number): number {
  return settings.baseSize + (level - 1) * 2;
}

const edgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** Cells reachable from `from` without crossing any of the given door edges. */
function component(maze: Maze, from: number, doors: Door[]): Set<number> {
  const blocked = new Set(doors.map((d) => edgeKey(d.a, d.b)));
  const { dist } = distances(maze, from, (a, b) => blocked.has(edgeKey(a, b)));
  const out = new Set<number>();
  dist.forEach((d, i) => d >= 0 && out.add(i));
  return out;
}

export function buildLevel(
  difficulty: DifficultySetting,
  level: number,
  random: () => number = Math.random,
): Level {
  const settings = SETTINGS[difficulty];
  const size = sizeFor(settings, level);
  const maze = generateMaze(size, size, random);
  const start = 0;
  const exit = size * size - 1;
  const route = shortestPath(maze, start, exit);
  const doorCount = Math.min(settings.doors(level), 3);

  // Doors sit on the only route to the exit (the maze is a tree), spread
  // between 25% and 85% of the way along it.
  const doors: Door[] = [];
  for (let i = 0; i < doorCount; i++) {
    const t = 0.25 + ((i + 1) / (doorCount + 1)) * 0.6;
    const at = Math.min(route.length - 2, Math.max(1, Math.floor(t * (route.length - 1))));
    if (doors.some((d) => d.a === route[at])) continue;
    doors.push({ a: route[at], b: route[at + 1], color: doors.length });
  }

  // Key i must be reachable once doors 0..i-1 are open, i.e. inside the
  // region between door i-1 and door i. Prefer a spot far off the route.
  const onRoute = new Set(route);
  const keys: number[] = [];
  for (let i = 0; i < doors.length; i++) {
    const regionStart = i === 0 ? start : doors[i - 1].b;
    const region = component(maze, regionStart, doors);
    const { dist } = distances(maze, doors[i].a);
    const candidates = [...region].filter((c) => !onRoute.has(c) && c !== start);
    const pool = candidates.length ? candidates : [...region].filter((c) => c !== start);
    pool.sort((x, y) => dist[y] - dist[x]);
    const far = pool.slice(0, Math.max(1, Math.ceil(pool.length / 3)));
    keys.push(far[Math.floor(random() * far.length)]);
  }

  // Coins go in dead ends that hold nothing else.
  const taken = new Set([start, exit, ...keys]);
  const deadEnds: number[] = [];
  for (let c = 0; c < size * size; c++) {
    if (!taken.has(c) && openDirections(maze, c).length === 1) deadEnds.push(c);
  }
  for (let i = deadEnds.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deadEnds[i], deadEnds[j]] = [deadEnds[j], deadEnds[i]];
  }
  const coins = deadEnds.slice(0, 2 + level);

  // Time budget: the full tour through every key to the exit, with slack.
  let tour = 0;
  let from = start;
  for (const k of keys) {
    tour += shortestPath(maze, from, k).length - 1;
    from = k;
  }
  tour += shortestPath(maze, from, exit).length - 1;
  const seconds = Math.ceil(tour * settings.secondsPerStep * 1.6 + 12);

  return { maze, start, exit, doors, keys, coins, seconds };
}

export interface RunnerState {
  pos: number;
  held: number[];
  opened: number[];
  coins: number[];
}

/**
 * One step of movement. Walking into a locked door uses its key if the
 * player holds it; otherwise the door blocks like a wall.
 */
export function move(
  lvl: Level,
  state: RunnerState,
  dir: Direction,
): { state: RunnerState; event: 'moved' | 'blocked' | 'locked' | 'unlocked' | 'key' | 'coin' } {
  const next = step(lvl.maze, state.pos, dir);
  if (next < 0) return { state, event: 'blocked' };
  const door = lvl.doors.find(
    (d) => !state.opened.includes(d.color) && edgeKey(d.a, d.b) === edgeKey(state.pos, next),
  );
  let held = state.held;
  let opened = state.opened;
  let event: 'moved' | 'unlocked' | 'key' | 'coin' = 'moved';
  if (door) {
    if (!held.includes(door.color)) return { state, event: 'locked' };
    held = held.filter((k) => k !== door.color);
    opened = [...opened, door.color];
    event = 'unlocked';
  }
  const keyHere = lvl.keys.findIndex(
    (k, color) => k === next && !held.includes(color) && !opened.includes(color),
  );
  if (keyHere >= 0) {
    held = [...held, keyHere];
    event = 'key';
  }
  let coins = state.coins;
  if (lvl.coins.includes(next) && !coins.includes(next)) {
    coins = [...coins, next];
    if (event === 'moved') event = 'coin';
  }
  return { state: { pos: next, held, opened, coins }, event };
}

/** Cells lit by the player's lamp: everything within `radius` cell-centres. */
export function visibleCells(maze: Maze, pos: number, radius: number): number[] {
  const px = pos % maze.w;
  const py = Math.floor(pos / maze.w);
  const r = Math.ceil(radius);
  const out: number[] = [];
  for (let y = Math.max(0, py - r); y <= Math.min(maze.h - 1, py + r); y++) {
    for (let x = Math.max(0, px - r); x <= Math.min(maze.w - 1, px + r); x++) {
      if ((x - px) ** 2 + (y - py) ** 2 <= radius * radius) out.push(y * maze.w + x);
    }
  }
  return out;
}

export function levelScore(level: number, secondsLeft: number, coins: number): number {
  return level * 100 + Math.round(secondsLeft) * 10 + coins * 50;
}
