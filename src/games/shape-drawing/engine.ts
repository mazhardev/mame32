import type { DifficultySetting } from '@/types';
import { arc, box, ring, samplePath } from '../_shared/creative/drawings';
import type { Pt, Stroke } from '../_shared/creative/drawings';

/**
 * Shape Drawing: draw a requested shape freehand; it is compared with an
 * ideal template after both are scaled to the same size and position.
 */
export interface ShapeSpec {
  id: string;
  name: string;
  strokes: Stroke[];
}

function starPts(points: number, ro: number, ri: number): Stroke {
  const out: Stroke = [];
  for (let i = 0; i <= points * 2; i++) {
    const a = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 ? ri : ro;
    out.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]);
  }
  return out;
}

function heartPts(): Stroke {
  const out: Stroke = [];
  for (let i = 0; i <= 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    out.push([
      50 + 16 * Math.sin(t) ** 3 * 2.6,
      50 - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 2.6,
    ]);
  }
  return out;
}

function spiralPts(): Stroke {
  const out: Stroke = [];
  for (let i = 0; i <= 80; i++) {
    const a = (i / 80) * Math.PI * 6;
    const r = 4 + (i / 80) * 40;
    out.push([50 + Math.cos(a) * r, 50 + Math.sin(a) * r]);
  }
  return out;
}

function infinityPts(): Stroke {
  const out: Stroke = [];
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    const d = 1 + Math.sin(t) ** 2;
    out.push([50 + (44 * Math.cos(t)) / d, 50 + (44 * Math.sin(t) * Math.cos(t)) / d]);
  }
  return out;
}

export const SHAPES: ShapeSpec[] = [
  { id: 'circle', name: 'Circle', strokes: [ring(50, 50, 40, 48)] },
  { id: 'square', name: 'Square', strokes: [box(10, 10, 80, 80)] },
  {
    id: 'triangle',
    name: 'Triangle',
    strokes: [
      [
        [50, 10],
        [90, 85],
        [10, 85],
        [50, 10],
      ],
    ],
  },
  {
    id: 'diamond',
    name: 'Diamond',
    strokes: [
      [
        [50, 5],
        [80, 50],
        [50, 95],
        [20, 50],
        [50, 5],
      ],
    ],
  },
  { id: 'star', name: 'Star', strokes: [starPts(5, 45, 18)] },
  { id: 'heart', name: 'Heart', strokes: [heartPts()] },
  {
    id: 'house',
    name: 'House shape',
    strokes: [
      [
        [15, 90],
        [15, 45],
        [50, 10],
        [85, 45],
        [85, 90],
        [15, 90],
      ],
    ],
  },
  { id: 'spiral', name: 'Spiral', strokes: [spiralPts()] },
  { id: 'infinity', name: 'Infinity sign', strokes: [infinityPts()] },
  {
    id: 'moon',
    name: 'Crescent moon',
    strokes: [[...arc(50, 50, 40, 40, 60, 300, 30), ...arc(66, 50, 30, 36, 240, 120, 24)]],
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    strokes: [
      Array.from({ length: 7 }, (_, i): Pt => [
        50 + Math.cos((i * Math.PI) / 3) * 42,
        50 + Math.sin((i * Math.PI) / 3) * 42,
      ]),
    ],
  },
];

export interface Tuning {
  shapes: string[];
  tolerance: number;
}

export const TUNING: Record<DifficultySetting, Tuning> = {
  easy: { shapes: ['circle', 'square', 'triangle', 'diamond', 'heart', 'star'], tolerance: 0.16 },
  normal: {
    shapes: ['circle', 'square', 'triangle', 'star', 'heart', 'house', 'spiral', 'hexagon', 'moon'],
    tolerance: 0.12,
  },
  hard: {
    shapes: [
      'circle',
      'star',
      'heart',
      'house',
      'spiral',
      'hexagon',
      'moon',
      'infinity',
      'triangle',
    ],
    tolerance: 0.09,
  },
};

export const ROUNDS = 8;

/** Concatenates strokes, resamples evenly and scales to fit a unit box (keeping proportions). */
export function normalise(strokes: Stroke[], n = 64): Pt[] {
  const pts = strokes.flatMap((s) =>
    s.length > 1
      ? samplePath(
          s,
          Math.max(
            2,
            Math.round(
              (n * s.length) /
                Math.max(
                  1,
                  strokes.reduce((a, b) => a + b.length, 0),
                ),
            ),
          ),
        )
      : s,
  );
  if (pts.length === 0) return [];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const size = Math.max(maxX - minX, maxY - minY) || 1;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return pts.map(([x, y]): Pt => [(x - cx) / size, (y - cy) / size]);
}

function meanNearest(a: Pt[], b: Pt[]): number {
  let total = 0;
  for (const p of a) {
    let best = Infinity;
    for (const q of b) best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1]));
    total += best;
  }
  return total / a.length;
}

/** Accuracy 0–1: how far, on average, each drawing is from the other. */
export function accuracy(drawn: Stroke[], shape: ShapeSpec, tolerance: number): number {
  const a = normalise(drawn, 96);
  const b = normalise(shape.strokes, 160);
  if (a.length < 4) return 0;
  const d = (meanNearest(a, b) + meanNearest(b, a)) / 2;
  return Math.max(0, Math.min(1, 1 - d / tolerance / 2));
}

export function pickShapes(t: Tuning, random: () => number): string[] {
  const out: string[] = [];
  const pool = [...t.shapes].sort(() => random() - 0.5);
  while (out.length < ROUNDS) out.push(pool[out.length % pool.length]);
  return out;
}
