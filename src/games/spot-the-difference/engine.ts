import type { DifficultySetting } from '@/types';
import { createRng } from '@/utils/random';
import type { Rng } from '@/utils/random';

/**
 * Spot the Difference: a scene is generated from simple original objects,
 * copied, and then k objects are changed in the copy (recoloured, removed,
 * resized, flipped or added). The player finds each change by tapping it
 * in either picture.
 */
export const W = 400;
export const H = 300;

export type Kind = 'tree' | 'house' | 'flower' | 'balloon' | 'bird' | 'cloud' | 'sun' | 'butterfly' | 'mushroom' | 'kite';

export interface Obj {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  size: number;
  color: string;
  flip: boolean;
}

export type ChangeType = 'color' | 'missing' | 'size' | 'flip' | 'extra';

export interface Difference {
  id: number;
  type: ChangeType;
  /** Where to tap (scene units) and how close counts. */
  x: number;
  y: number;
  r: number;
}

export interface Scene {
  left: Obj[];
  right: Obj[];
  diffs: Difference[];
  sky: string;
  ground: string;
}

export const LEVELS: Record<DifficultySetting, { diffs: number; objects: number; seconds: number; types: ChangeType[] }> = {
  easy: { diffs: 5, objects: 14, seconds: 120, types: ['missing', 'color', 'extra'] },
  normal: { diffs: 7, objects: 18, seconds: 150, types: ['missing', 'color', 'extra', 'size', 'flip'] },
  hard: { diffs: 9, objects: 24, seconds: 180, types: ['color', 'size', 'flip', 'missing', 'extra'] },
};

const PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f8fafc', '#78350f'];
const LEAVES = ['#16a34a', '#65a30d', '#f97316', '#dc2626', '#ca8a04', '#0d9488'];

/** Colours each kind can take; kinds with one colour never get a colour change. */
export function paletteFor(kind: Kind): string[] {
  if (kind === 'cloud') return ['#ffffff'];
  if (kind === 'sun') return ['#facc15'];
  if (kind === 'tree') return LEAVES;
  return PALETTE;
}

/** Where each kind of object may appear: in the sky or on the ground. */
const ZONE: Record<Kind, 'sky' | 'ground'> = {
  tree: 'ground',
  house: 'ground',
  flower: 'ground',
  mushroom: 'ground',
  balloon: 'sky',
  bird: 'sky',
  cloud: 'sky',
  sun: 'sky',
  butterfly: 'sky',
  kite: 'sky',
};

const BASE_SIZE: Record<Kind, number> = {
  tree: 46,
  house: 50,
  flower: 20,
  mushroom: 22,
  balloon: 24,
  bird: 20,
  cloud: 44,
  sun: 36,
  butterfly: 20,
  kite: 26,
};

function randomObj(rng: Rng, id: number, kind: Kind, placed: Obj[]): Obj | null {
  const size = BASE_SIZE[kind] * rng.range(0.8, 1.2);
  for (let t = 0; t < 40; t++) {
    const x = rng.range(size * 0.6, W - size * 0.6);
    const y = ZONE[kind] === 'sky' ? rng.range(size * 0.6, H * 0.52) : rng.range(H * 0.6, H - size * 0.45);
    // Keep objects apart so each change is clearly attributable.
    if (placed.some((o) => Math.hypot(o.x - x, o.y - y) < (o.size + size) * 0.55)) continue;
    return { id, kind, x, y, size, color: rng.pick(paletteFor(kind)), flip: rng.bool() };
  }
  return null;
}

/** Objects whose mirror image looks different. */
const FLIPPABLE: Kind[] = ['bird', 'house', 'kite', 'mushroom'];

export function generateScene(difficulty: DifficultySetting, seed: string): Scene {
  const rng = createRng(seed);
  const level = LEVELS[difficulty];
  const kinds = Object.keys(ZONE) as Kind[];
  const left: Obj[] = [];
  let id = 1;
  // A sun (only one) then a mix of everything else.
  const sun = randomObj(rng, id++, 'sun', left);
  if (sun) left.push(sun);
  let guard = 0;
  while (left.length < level.objects && guard++ < 400) {
    const kind = rng.pick(kinds.filter((k) => k !== 'sun'));
    const o = randomObj(rng, id++, kind, left);
    if (o) left.push(o);
  }

  const right = left.map((o) => ({ ...o }));
  const diffs: Difference[] = [];
  const candidates = rng.shuffle(left.map((o) => o.id));
  // The planned changes, then extra removals if any change had no suitable object.
  const plan = Array.from({ length: level.diffs }, (_, k) => level.types[k % level.types.length]);
  for (let k = 0; k < plan.length + 6 && diffs.length < level.diffs; k++) {
    const type: ChangeType = k < plan.length ? plan[k] : 'missing';
    if (type === 'extra') {
      const kind = rng.pick(['flower', 'bird', 'butterfly', 'mushroom'] as Kind[]);
      const o = randomObj(rng, id++, kind, [...left, ...right]);
      if (!o) continue;
      right.push(o);
      diffs.push({ id: o.id, type, x: o.x, y: o.y, r: Math.max(18, o.size * 0.7) });
      continue;
    }
    // Only objects on which this change is visible qualify.
    const suits = (o: Obj) =>
      type === 'color' ? paletteFor(o.kind).length > 1 : type === 'flip' ? FLIPPABLE.includes(o.kind) : true;
    const targetId = candidates.find((cid) => {
      const o = right.find((r) => r.id === cid);
      return o && suits(o) && !diffs.some((d) => d.id === cid);
    });
    if (targetId === undefined) continue;
    const i = right.findIndex((o) => o.id === targetId);
    const o = right[i];
    if (type === 'missing') right.splice(i, 1);
    else if (type === 'color') right[i] = { ...o, color: rng.pick(paletteFor(o.kind).filter((c) => c !== o.color)) };
    else if (type === 'size') right[i] = { ...o, size: o.size * (rng.bool() ? 1.45 : 0.62) };
    else right[i] = { ...o, flip: !o.flip };
    diffs.push({ id: o.id, type, x: o.x, y: o.y, r: Math.max(18, o.size * 0.7) });
  }
  const skies = ['#bae6fd', '#c7d2fe', '#fde68a', '#a5f3fc'];
  const grounds = ['#86efac', '#bbf7d0', '#a3e635', '#fcd34d'];
  return { left, right, diffs, sky: rng.pick(skies), ground: rng.pick(grounds) };
}

/** The difference (if any, not yet found) at a tap position. */
export function hitDifference(scene: Scene, found: Set<number>, x: number, y: number): Difference | null {
  let best: Difference | null = null;
  let bestD = Infinity;
  for (const d of scene.diffs) {
    if (found.has(d.id)) continue;
    const dist = Math.hypot(d.x - x, d.y - y);
    if (dist <= d.r && dist < bestD) {
      best = d;
      bestD = dist;
    }
  }
  return best;
}

export function scoreFor(found: number, total: number, secondsLeft: number, mistakes: number, hints: number): number {
  return Math.max(0, found * 150 + (found === total ? Math.round(secondsLeft) * 5 : 0) - mistakes * 25 - hints * 100);
}
