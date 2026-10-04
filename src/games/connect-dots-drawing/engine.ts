import type { DifficultySetting } from '@/types';
import { DRAWINGS, samplePath } from '../_shared/creative/drawings';
import type { Drawing, Pt } from '../_shared/creative/drawings';

/** Connect-the-dots: the outline of a drawing becomes numbered dots. */
export const PICTURES = 5;
export const DOTS: Record<DifficultySetting, number> = { easy: 12, normal: 20, hard: 30 };

export interface DotPuzzle {
  drawing: Drawing;
  dots: Pt[];
  closed: boolean;
  /** Where each number label sits, nudged away from the picture's centre. */
  labels: Pt[];
}

export function makePuzzle(d: Drawing, count: number): DotPuzzle {
  const outline = d.strokes[0];
  const first = outline[0];
  const last = outline[outline.length - 1];
  const closed = Math.hypot(first[0] - last[0], first[1] - last[1]) < 1;
  let dots = samplePath(outline, closed ? count + 1 : count);
  if (closed) dots = dots.slice(0, -1);
  const cx = dots.reduce((a, p) => a + p[0], 0) / dots.length;
  const cy = dots.reduce((a, p) => a + p[1], 0) / dots.length;
  const labels = dots.map(([x, y]): Pt => {
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [Math.round((x + (dx / len) * 5) * 10) / 10, Math.round((y + (dy / len) * 5) * 10) / 10];
  });
  return { drawing: d, dots, closed, labels };
}

export function pickPictures(random: () => number): Drawing[] {
  return [...DRAWINGS].sort(() => random() - 0.5).slice(0, PICTURES);
}

/** Result of tapping dot `i` when `next` is expected. */
export function tap(next: number, i: number): 'connect' | 'wrong' {
  return i === next ? 'connect' : 'wrong';
}
