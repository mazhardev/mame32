/**
 * Tile-matching solitaire on stacked layouts. Positions use half-tile units:
 * a tile at (x, y, z) covers [x, x+2) × [y, y+2) on layer z.
 */
export interface Slot {
  x: number;
  y: number;
  z: number;
}
export interface TileSlot extends Slot {
  id: number;
  face: number;
}
export type LayoutName = 'pyramid' | 'fortress' | 'tower';

function rect(cols: number, rows: number, z: number, x0: number, y0: number): Slot[] {
  const out: Slot[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: x0 + c * 2, y: y0 + r * 2, z });
  return out;
}

export function layoutSlots(name: LayoutName): Slot[] {
  switch (name) {
    case 'pyramid':
      return [...rect(6, 4, 0, 0, 0), ...rect(4, 2, 1, 2, 2), ...rect(2, 1, 2, 4, 3)];
    case 'fortress':
      return [...rect(8, 6, 0, 0, 0), ...rect(6, 4, 1, 2, 2), ...rect(4, 2, 2, 4, 4), ...rect(2, 1, 3, 6, 5), { x: -2, y: 5, z: 0 }, { x: 16, y: 5, z: 0 }];
    case 'tower':
    default:
      return [...rect(10, 6, 0, 0, 0), ...rect(8, 4, 1, 2, 2), ...rect(6, 2, 2, 4, 4), ...rect(2, 2, 3, 8, 4)];
  }
}

const overlaps = (a: Slot, b: Slot) => Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;

/** A tile is free when nothing sits on it and one of its long sides is open. */
export function isFree(tiles: Slot[], t: Slot): boolean {
  let left = false;
  let right = false;
  for (const o of tiles) {
    if (o === t) continue;
    if (o.z === t.z + 1 && overlaps(o, t)) return false;
    if (o.z === t.z && Math.abs(o.y - t.y) < 2) {
      if (o.x === t.x - 2) left = true;
      if (o.x === t.x + 2) right = true;
    }
  }
  return !left || !right;
}

export const FACES = [
  '🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍍', '🥥', '🥕', '🌽', '🍄',
  '🌸', '🌻', '🌵', '🍀', '🐟', '🐢', '🐸', '🐝', '🦋', '🐞', '⭐', '🌙',
  '☀️', '⚡', '❄️', '🔥', '💧', '🎈', '🔔', '🎲', '🪁', '🧩', '🎵', '🚀',
];

/**
 * Deals a guaranteed-solvable game: starting from the full layout, it keeps
 * removing two random free tiles and gives them the same face. Replaying those
 * removals is always a solution. Retries if it ever gets stuck.
 */
export function deal(name: LayoutName, rand: () => number = Math.random): { tiles: TileSlot[]; solution: [number, number][] } {
  const slots = layoutSlots(name);
  for (let attempt = 0; attempt < 200; attempt++) {
    const remaining: (Slot & { id: number })[] = slots.map((s, id) => ({ ...s, id }));
    const faces = new Array<number>(slots.length).fill(-1);
    const solution: [number, number][] = [];
    // Faces come in pairs, each face used at most four times.
    const pool: number[] = [];
    for (let k = 0; pool.length < slots.length / 2; k++) pool.push(k % FACES.length);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    let ok = true;
    while (remaining.length) {
      const free = remaining.filter((t) => isFree(remaining, t));
      if (free.length < 2) {
        ok = false;
        break;
      }
      const a = free.splice(Math.floor(rand() * free.length), 1)[0];
      const b = free[Math.floor(rand() * free.length)];
      const face = pool.pop() as number;
      faces[a.id] = face;
      faces[b.id] = face;
      solution.push([a.id, b.id]);
      remaining.splice(remaining.indexOf(a), 1);
      remaining.splice(remaining.indexOf(b), 1);
    }
    if (ok) return { tiles: slots.map((s, id) => ({ ...s, id, face: faces[id] })), solution };
  }
  throw new Error('Could not deal a solvable layout');
}

/** Any pair of free tiles with the same face, or null. */
export function findPair(tiles: TileSlot[]): [TileSlot, TileSlot] | null {
  const free = tiles.filter((t) => isFree(tiles, t));
  const byFace = new Map<number, TileSlot>();
  for (const t of free) {
    const other = byFace.get(t.face);
    if (other) return [other, t];
    byFace.set(t.face, t);
  }
  return null;
}

/** Re-deals faces over the remaining positions, again guaranteeing a solution. */
export function reshuffle(tiles: TileSlot[], rand: () => number = Math.random): TileSlot[] {
  const faces = tiles.map((t) => t.face);
  for (let attempt = 0; attempt < 200; attempt++) {
    const remaining = [...tiles];
    const assign = new Map<number, number>();
    const counts = new Map<number, number>();
    for (const f of faces) counts.set(f, (counts.get(f) ?? 0) + 1);
    const pool: number[] = [];
    for (const [f, n] of counts) for (let k = 0; k < n / 2; k++) pool.push(f);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    let ok = true;
    while (remaining.length) {
      const free = remaining.filter((t) => isFree(remaining, t));
      if (free.length < 2) {
        ok = false;
        break;
      }
      const a = free.splice(Math.floor(rand() * free.length), 1)[0];
      const b = free[Math.floor(rand() * free.length)];
      const f = pool.pop() as number;
      assign.set(a.id, f);
      assign.set(b.id, f);
      remaining.splice(remaining.indexOf(a), 1);
      remaining.splice(remaining.indexOf(b), 1);
    }
    if (ok) return tiles.map((t) => ({ ...t, face: assign.get(t.id) as number }));
  }
  return tiles;
}
