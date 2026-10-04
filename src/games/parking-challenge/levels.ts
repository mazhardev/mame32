/**
 * Parking levels. Coordinates are in a 560×420 lot. Each level has a start
 * pose, a target bay (centre, size, required heading) and obstacles as
 * axis-aligned rectangles: parked cars, walls and cones.
 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: 'car' | 'wall' | 'cone';
  color?: string;
}

export interface Level {
  name: string;
  start: { x: number; y: number; angle: number };
  bay: { x: number; y: number; w: number; h: number; angle: number };
  /** Accept the car facing either way in the bay. */
  eitherWay?: boolean;
  obstacles: Rect[];
  par: number;
}

const car = (x: number, y: number, vertical = true, color = '#64748b'): Rect =>
  vertical ? { x: x - 15, y: y - 27, w: 30, h: 54, kind: 'car', color } : { x: x - 27, y: y - 15, w: 54, h: 30, kind: 'car', color };
const cones = (x0: number, y0: number, x1: number, y1: number, n: number): Rect[] =>
  Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : i / (n - 1);
    return { x: x0 + (x1 - x0) * t - 5, y: y0 + (y1 - y0) * t - 5, w: 10, h: 10, kind: 'cone' as const };
  });
const UP = -Math.PI / 2;
const DOWN = Math.PI / 2;

export const LEVELS: Level[] = [
  {
    name: 'Straight in',
    start: { x: 280, y: 360, angle: UP },
    bay: { x: 280, y: 90, w: 46, h: 76, angle: UP },
    eitherWay: true,
    obstacles: [car(220, 90), car(340, 90)],
    par: 8,
  },
  {
    name: 'Turn left',
    start: { x: 460, y: 360, angle: UP },
    bay: { x: 120, y: 100, w: 46, h: 76, angle: UP },
    eitherWay: true,
    obstacles: [car(60, 100, true, '#ef4444'), car(180, 100, true, '#22c55e'), { x: 0, y: 220, w: 330, h: 18, kind: 'wall' }],
    par: 12,
  },
  {
    name: 'Reverse in',
    start: { x: 280, y: 330, angle: UP },
    bay: { x: 280, y: 90, w: 46, h: 76, angle: DOWN },
    obstacles: [car(220, 90), car(340, 90), ...cones(170, 200, 390, 200, 3)],
    par: 14,
  },
  {
    name: 'Tight row',
    start: { x: 80, y: 360, angle: 0 },
    bay: { x: 330, y: 92, w: 42, h: 72, angle: UP },
    eitherWay: true,
    obstacles: [car(210, 92, true, '#a855f7'), car(270, 92, true, '#f59e0b'), car(390, 92, true, '#0ea5e9'), car(450, 92, true, '#ef4444'), { x: 0, y: 0, w: 560, h: 40, kind: 'wall' }],
    par: 14,
  },
  {
    name: 'Parallel',
    start: { x: 60, y: 300, angle: 0 },
    bay: { x: 300, y: 380, w: 80, h: 44, angle: 0 },
    eitherWay: true,
    obstacles: [car(210, 380, false, '#ef4444'), car(390, 380, false, '#22c55e'), { x: 0, y: 404, w: 560, h: 16, kind: 'wall' }],
    par: 16,
  },
  {
    name: 'Cone slalom',
    start: { x: 60, y: 360, angle: 0 },
    bay: { x: 480, y: 90, w: 46, h: 76, angle: UP },
    eitherWay: true,
    obstacles: [...cones(160, 300, 160, 420, 4), ...cones(280, 220, 280, 340, 4), ...cones(400, 300, 400, 420, 4), car(420, 90), car(540, 90)],
    par: 16,
  },
  {
    name: 'Corner bay',
    start: { x: 280, y: 360, angle: UP },
    bay: { x: 50, y: 50, w: 46, h: 76, angle: UP },
    eitherWay: true,
    obstacles: [car(110, 50, true, '#f97316'), { x: 0, y: 130, w: 60, h: 16, kind: 'wall' }, ...cones(180, 160, 420, 160, 5)],
    par: 16,
  },
  {
    name: 'Reverse parallel',
    start: { x: 100, y: 330, angle: 0 },
    bay: { x: 330, y: 390, w: 76, h: 42, angle: Math.PI },
    obstacles: [car(240, 390, false, '#14b8a6'), car(420, 390, false, '#ec4899'), { x: 0, y: 412, w: 560, h: 8, kind: 'wall' }],
    par: 18,
  },
  {
    name: 'Garage',
    start: { x: 280, y: 380, angle: UP },
    bay: { x: 280, y: 70, w: 44, h: 72, angle: UP },
    obstacles: [{ x: 240, y: 20, w: 12, h: 110, kind: 'wall' }, { x: 308, y: 20, w: 12, h: 110, kind: 'wall' }, { x: 240, y: 20, w: 80, h: 12, kind: 'wall' }, ...cones(150, 250, 410, 250, 2)],
    par: 12,
  },
  {
    name: 'Full house',
    start: { x: 60, y: 210, angle: 0 },
    bay: { x: 400, y: 330, w: 42, h: 72, angle: DOWN },
    obstacles: [
      car(160, 90), car(220, 90, true, '#ef4444'), car(280, 90, true, '#22c55e'), car(340, 90, true, '#f59e0b'), car(400, 90), car(460, 90, true, '#a855f7'),
      car(160, 330, true, '#0ea5e9'), car(220, 330), car(280, 330, true, '#ec4899'), car(340, 330), car(460, 330, true, '#14b8a6'),
    ],
    par: 18,
  },
];
