/**
 * Floor layout for Dungeon Shooter: rooms on a 5×5 grid connected by a
 * random walk, so every room is reachable. The start room is the walk's
 * first cell; the stairs go in the room furthest from it (by doors).
 */
export const GRID = 5;

export interface RoomInfo {
  cell: number;
  doors: { n: boolean; e: boolean; s: boolean; w: boolean };
  /** Door distance from the start room. */
  depth: number;
  cleared: boolean;
  visited: boolean;
  stairs: boolean;
  /** Interior pillars as tile indices. */
  pillars: number[];
}

export interface Floor {
  rooms: Map<number, RoomInfo>;
  start: number;
  exit: number;
}

const STEP: Record<'n' | 'e' | 's' | 'w', number> = { n: -GRID, e: 1, s: GRID, w: -1 };
export const OPPOSITE = { n: 's', e: 'w', s: 'n', w: 'e' } as const;

export function neighbour(cell: number, dir: 'n' | 'e' | 's' | 'w'): number | null {
  const r = Math.floor(cell / GRID);
  const c = cell % GRID;
  if (dir === 'n' && r === 0) return null;
  if (dir === 's' && r === GRID - 1) return null;
  if (dir === 'w' && c === 0) return null;
  if (dir === 'e' && c === GRID - 1) return null;
  return cell + STEP[dir];
}

export function makeFloor(roomCount: number, random: () => number, pillarsFor: (random: () => number) => number[]): Floor {
  const start = Math.floor((GRID * GRID) / 2);
  const rooms = new Map<number, RoomInfo>();
  const blank = (cell: number): RoomInfo => ({ cell, doors: { n: false, e: false, s: false, w: false }, depth: 0, cleared: false, visited: false, stairs: false, pillars: [] });
  rooms.set(start, blank(start));
  let cur = start;
  const dirs = ['n', 'e', 's', 'w'] as const;
  let guard = 0;
  while (rooms.size < roomCount && guard++ < 1000) {
    const dir = dirs[Math.floor(random() * 4)];
    const next = neighbour(cur, dir);
    if (next === null) continue;
    if (!rooms.has(next)) rooms.set(next, blank(next));
    rooms.get(cur)!.doors[dir] = true;
    rooms.get(next)!.doors[OPPOSITE[dir]] = true;
    // Occasionally jump back to an existing room to branch.
    cur = random() < 0.3 ? [...rooms.keys()][Math.floor(random() * rooms.size)] : next;
  }
  // Breadth-first depth from the start.
  const queue = [start];
  const seen = new Set([start]);
  while (queue.length) {
    const c = queue.shift()!;
    const room = rooms.get(c)!;
    for (const d of dirs) {
      const n = neighbour(c, d);
      if (n !== null && room.doors[d] && !seen.has(n)) {
        seen.add(n);
        rooms.get(n)!.depth = room.depth + 1;
        queue.push(n);
      }
    }
  }
  let exit = start;
  for (const r of rooms.values()) if (r.depth > rooms.get(exit)!.depth) exit = r.cell;
  rooms.get(exit)!.stairs = true;
  const first = rooms.get(start)!;
  first.cleared = true;
  first.visited = true;
  for (const r of rooms.values()) if (r.cell !== start) r.pillars = pillarsFor(random);
  return { rooms, start, exit };
}
