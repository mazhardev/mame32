import { SIZE, cellColor } from '../_shared/creative/sprites';
import type { Sprite } from '../_shared/creative/sprites';
import { isRecord } from '../_shared/puzzle/useSavedGame';

export const PALETTE = [
  '#000000',
  '#ffffff',
  '#9ca3af',
  '#4b5563',
  '#7f1d1d',
  '#dc2626',
  '#f97316',
  '#facc15',
  '#fde68a',
  '#16a34a',
  '#86efac',
  '#0ea5e9',
  '#1d4ed8',
  '#7c3aed',
  '#ec4899',
  '#78350f',
];

export type Cells = (string | null)[];

export const blank = (size: number): Cells => new Array(size * size).fill(null);

export function spriteCells(s: Sprite): Cells {
  const out: Cells = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) out.push(cellColor(s, x, y));
  return out;
}

/**
 * How closely a drawing matches a target: cells that are right, out of every
 * cell that is filled in either picture.
 */
export function accuracy(drawn: Cells, target: Cells): number {
  let union = 0;
  let right = 0;
  for (let i = 0; i < target.length; i++) {
    const a = drawn[i]?.toLowerCase() ?? null;
    const b = target[i]?.toLowerCase() ?? null;
    if (a === null && b === null) continue;
    union++;
    if (a === b) right++;
  }
  return union === 0 ? 0 : right / union;
}

/** The cell mirrored left-to-right. */
export const mirrorOf = (i: number, size: number) =>
  Math.floor(i / size) * size + (size - 1 - (i % size));

export interface Artwork {
  size: number;
  cells: Cells;
  savedAt: number;
}

export interface PixelSave {
  gallery: Artwork[];
}

const isColor = (c: unknown) =>
  c === null || (typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c));

export function validSave(v: unknown): v is PixelSave {
  if (!isRecord(v) || !Array.isArray(v.gallery) || v.gallery.length > 12) return false;
  return v.gallery.every(
    (a) =>
      isRecord(a) &&
      (a.size === 16 || a.size === 32) &&
      Array.isArray(a.cells) &&
      a.cells.length === (a.size as number) ** 2 &&
      a.cells.every(isColor) &&
      typeof a.savedAt === 'number',
  );
}
