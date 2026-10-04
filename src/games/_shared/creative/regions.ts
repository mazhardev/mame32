/** A fillable shape in a colouring picture. */
export interface Region {
  id: string;
  shape: 'path' | 'rect' | 'circle' | 'ellipse' | 'polygon';
  attrs: Record<string, string | number>;
  /** Regions in the same group are filled together in symmetry mode. */
  group?: string;
  /** Decorative regions with a fixed fill (not paintable). */
  fixed?: string;
}

export const rect = (id: string, x: number, y: number, w: number, h: number, rx = 0): Region => ({
  id,
  shape: 'rect',
  attrs: { x, y, width: w, height: h, rx },
});
export const circle = (id: string, cx: number, cy: number, r: number): Region => ({
  id,
  shape: 'circle',
  attrs: { cx, cy, r },
});
export const ellipse = (id: string, cx: number, cy: number, rx: number, ry: number): Region => ({
  id,
  shape: 'ellipse',
  attrs: { cx, cy, rx, ry },
});
export const poly = (id: string, points: [number, number][]): Region => ({
  id,
  shape: 'polygon',
  attrs: { points: points.map((p) => p.join(',')).join(' ') },
});
export const path = (id: string, d: string): Region => ({ id, shape: 'path', attrs: { d } });

export const COLOR_PALETTE = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#facc15',
  '#a3e635',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#fde68a',
  '#fecaca',
  '#bbf7d0',
  '#bfdbfe',
  '#e9d5ff',
  '#78350f',
  '#a16207',
  '#6b7280',
  '#1f2937',
  '#ffffff',
];
