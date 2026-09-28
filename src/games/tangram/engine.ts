import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';

/**
 * Tangram: the seven pieces cut from a square of side 4 — two large
 * triangles, a medium and two small triangles, a square and a
 * parallelogram — must be arranged to fill a silhouette.
 *
 * Every piece is convex. Pieces turn in 45° steps; the parallelogram can
 * also be flipped (the triangles and square look the same when flipped).
 * Targets are built from real arrangements of the seven pieces, so each
 * one is solvable, and a dropped piece snaps into any matching slot.
 */
export type Vec = [number, number];
export type Kind = 'L' | 'M' | 'S' | 'Q' | 'P';

export interface PieceDef {
  id: string;
  kind: Kind;
  name: string;
  /** Vertices in local units around the origin. */
  points: Vec[];
  color: string;
}

const R2 = Math.SQRT2;

export const PIECES: PieceDef[] = [
  { id: 'L1', kind: 'L', name: 'large triangle', points: [[-2, 0], [2, 0], [0, 2]], color: '#ef4444' },
  { id: 'L2', kind: 'L', name: 'large triangle', points: [[-2, 0], [2, 0], [0, 2]], color: '#3b82f6' },
  { id: 'M', kind: 'M', name: 'medium triangle', points: [[-R2, 0], [R2, 0], [0, R2]], color: '#22c55e' },
  { id: 'S1', kind: 'S', name: 'small triangle', points: [[-1, 0], [1, 0], [0, 1]], color: '#eab308' },
  { id: 'S2', kind: 'S', name: 'small triangle', points: [[-1, 0], [1, 0], [0, 1]], color: '#a855f7' },
  { id: 'Q', kind: 'Q', name: 'square', points: [[0, -1], [1, 0], [0, 1], [-1, 0]], color: '#f97316' },
  { id: 'P', kind: 'P', name: 'parallelogram', points: [[-1.5, -0.5], [0.5, -0.5], [1.5, 0.5], [-0.5, 0.5]], color: '#06b6d4' },
];

export interface Placement {
  x: number;
  y: number;
  /** Rotation in 45° steps (clockwise on screen). */
  rot: number;
  flip: boolean;
}

export function transform(def: PieceDef, p: Placement): Vec[] {
  const a = (p.rot * Math.PI) / 4;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const pts = def.points.map(([x0, y0]): Vec => {
    const x = p.flip ? -x0 : x0;
    return [p.x + x * cos - y0 * sin, p.y + x * sin + y0 * cos];
  });
  // Flipping reverses the winding; keep a consistent order.
  return p.flip ? pts.reverse() : pts;
}

/** Orientation as seen on screen: equal keys mean identical outlines. */
export function orientationKey(kind: Kind, p: Placement): string {
  const r = ((p.rot % 8) + 8) % 8;
  if (kind === 'Q') return `${r % 2}`;
  if (kind === 'P') return `${r % 4}${p.flip ? 'f' : ''}`;
  return `${r}`; // triangles are symmetric, so a flip changes nothing
}

export function polygonArea(pts: Vec[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/** Convex polygons overlap (with positive area) unless some edge axis separates them. */
export function overlaps(a: Vec[], b: Vec[], eps = 1e-6): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      const axis: Vec = [y1 - y2, x2 - x1];
      const proj = (pts: Vec[]) => pts.map(([x, y]) => x * axis[0] + y * axis[1]);
      const pa = proj(a);
      const pb = proj(b);
      const len = Math.hypot(axis[0], axis[1]);
      if (Math.max(...pa) <= Math.min(...pb) + eps * len || Math.max(...pb) <= Math.min(...pa) + eps * len) return false;
    }
  }
  return true;
}

export interface Puzzle {
  name: string;
  /** Solution placement for each piece, indexed like PIECES. */
  solution: Placement[];
}

/** The classic square: the seven pieces as cut from a 4×4 square. */
export const SQUARE: Puzzle = {
  name: 'The Square',
  solution: [
    { x: 2, y: 0, rot: 0, flip: false }, // top large triangle
    { x: 0, y: 2, rot: 6, flip: false }, // left large triangle
    { x: 3, y: 3, rot: 7, flip: false }, // medium triangle, bottom-right corner
    { x: 4, y: 1, rot: 2, flip: false }, // small triangle on the right edge
    { x: 2, y: 3, rot: 4, flip: false }, // small triangle in the middle
    { x: 3, y: 2, rot: 0, flip: false }, // square
    { x: 1.5, y: 3.5, rot: 0, flip: true }, // parallelogram along the bottom
  ],
};

function edges(pts: Vec[]): [Vec, Vec][] {
  return pts.map((p, i) => [p, pts[(i + 1) % pts.length]]);
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/**
 * Builds a random silhouette by gluing pieces edge to edge: each new piece
 * lays one of its edges along part of an existing edge (flush at either end
 * or centred), on the outside, without overlapping anything. `compactness`
 * (area over bounding-box area) filters out straggly shapes.
 */
export function generatePuzzle(seed: string, minCompactness: number): Puzzle {
  const rng = createRng(seed);
  for (let attempt = 0; attempt < 400; attempt++) {
    const order = rng.shuffle(PIECES.map((_, i) => i));
    const placed = new Map<number, { place: Placement; pts: Vec[] }>();
    const first = order[0];
    const p0: Placement = { x: 0, y: 0, rot: rng.int(0, 8), flip: PIECES[first].kind === 'P' && rng.bool() };
    placed.set(first, { place: p0, pts: transform(PIECES[first], p0) });
    let ok = true;
    for (const idx of order.slice(1)) {
      const def = PIECES[idx];
      const candidates: { place: Placement; pts: Vec[] }[] = [];
      for (const { pts: host } of placed.values()) {
        for (const [a, b] of edges(host)) {
          const hostLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const dir: Vec = [(b[0] - a[0]) / hostLen, (b[1] - a[1]) / hostLen];
          for (let rot = 0; rot < 8; rot++) {
            for (const flip of def.kind === 'P' ? [false, true] : [false]) {
              const base = transform(def, { x: 0, y: 0, rot, flip });
              for (const [c, d] of edges(base)) {
                const len = Math.hypot(d[0] - c[0], d[1] - c[1]);
                if (len > hostLen + 1e-6) continue;
                // The new edge must run opposite to the host edge (d→c along a→b).
                const ndir: Vec = [(c[0] - d[0]) / len, (c[1] - d[1]) / len];
                if (!near(ndir[0], dir[0]) || !near(ndir[1], dir[1])) continue;
                const offsets = near(len, hostLen) ? [0] : [0, (hostLen - len) / 2, hostLen - len];
                for (const off of offsets) {
                  // Put d at a + off along the host edge.
                  const tx = a[0] + dir[0] * off - d[0];
                  const ty = a[1] + dir[1] * off - d[1];
                  const place: Placement = { x: tx, y: ty, rot, flip };
                  const pts = transform(def, place);
                  if ([...placed.values()].some((q) => overlaps(q.pts, pts))) continue;
                  candidates.push({ place, pts });
                }
              }
            }
          }
        }
      }
      if (!candidates.length) {
        ok = false;
        break;
      }
      // Prefer spots that keep the figure compact.
      const scored = candidates
        .map((cnd) => {
          const all = [...[...placed.values()].flatMap((q) => q.pts), ...cnd.pts];
          const xs = all.map((p) => p[0]);
          const ys = all.map((p) => p[1]);
          const box = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
          return { cnd, box };
        })
        .sort((x, y) => x.box - y.box);
      const pick = scored[Math.floor(Math.pow(rng.next(), 2) * Math.min(scored.length, 12))].cnd;
      placed.set(idx, pick);
    }
    if (!ok) continue;
    const all = [...placed.values()].flatMap((q) => q.pts);
    const xs = all.map((p) => p[0]);
    const ys = all.map((p) => p[1]);
    const box = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
    if (16 / box < minCompactness) continue;
    // Re-centre so the silhouette sits around the origin.
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    const solution = PIECES.map((_, i) => {
      const p = placed.get(i)!.place;
      return { ...p, x: p.x - cx, y: p.y - cy };
    });
    return { name: '', solution };
  }
  return SQUARE;
}

export function puzzleBounds(puzzle: Puzzle) {
  const pts = PIECES.flatMap((def, i) => transform(def, puzzle.solution[i]));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

export const LEVELS_PER_PACK = 20;

export function levelPuzzle(pack: DifficultySetting, index: number): Puzzle {
  if (pack === 'easy' && index === 0) return SQUARE;
  const compact = pack === 'easy' ? 0.55 : pack === 'normal' ? 0.45 : 0.35;
  const p = generatePuzzle(`tangram-${pack}-${index}`, compact);
  return { ...p, name: `Figure ${index + 1}` };
}

/**
 * Finds a free solution slot this piece fits: same shape, same outline
 * orientation, and close enough. Identical pieces (the two large or two
 * small triangles) can use each other's slots.
 */
export function findSlot(
  puzzle: Puzzle,
  pieceIndex: number,
  place: Placement,
  taken: Set<number>,
  offset: Vec,
  tolerance: number,
): number {
  const def = PIECES[pieceIndex];
  const key = orientationKey(def.kind, place);
  let best = -1;
  let bestDist = tolerance;
  PIECES.forEach((other, slot) => {
    if (other.kind !== def.kind || taken.has(slot)) return;
    const target = puzzle.solution[slot];
    if (orientationKey(other.kind, target) !== key) return;
    // Compare outline centres, which ignore symmetric rotations.
    const c1 = centroid(transform(def, place));
    const c2 = centroid(transform(other, { ...target, x: target.x + offset[0], y: target.y + offset[1] }));
    const d = Math.hypot(c1[0] - c2[0], c1[1] - c2[1]);
    if (d < bestDist) {
      bestDist = d;
      best = slot;
    }
  });
  return best;
}

export function centroid(pts: Vec[]): Vec {
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}
