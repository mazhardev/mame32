import type { P } from '../_shared/golf/golf';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface MiniHole {
  name: string;
  par: number;
  tee: P;
  cup: P;
  outline: P[];
  blocks?: P[][];
  bumpers?: { x: number; y: number; r: number }[];
  sand?: Rect[];
  water?: Rect[];
  slopes?: (Rect & { ax: number; ay: number })[];
  spinner?: { x: number; y: number; len: number; speed: number };
}

const rect = (x0: number, y0: number, x1: number, y1: number): P[] => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];

/** Nine original holes on a 400 × 600 canvas. */
export const HOLES: MiniHole[] = [
  {
    name: 'Warm-Up',
    par: 2,
    tee: { x: 200, y: 510 },
    cup: { x: 200, y: 120 },
    outline: rect(120, 60, 280, 560),
  },
  {
    name: 'Dogleg',
    par: 2,
    tee: { x: 120, y: 510 },
    cup: { x: 290, y: 135 },
    outline: [
      { x: 60, y: 70 },
      { x: 340, y: 70 },
      { x: 340, y: 220 },
      { x: 180, y: 220 },
      { x: 180, y: 560 },
      { x: 60, y: 560 },
    ],
  },
  {
    name: 'The Block',
    par: 3,
    tee: { x: 200, y: 520 },
    cup: { x: 200, y: 110 },
    outline: rect(80, 60, 320, 560),
    blocks: [rect(140, 260, 260, 340)],
  },
  {
    name: 'Pinball',
    par: 3,
    tee: { x: 200, y: 520 },
    cup: { x: 200, y: 110 },
    outline: rect(70, 60, 330, 560),
    bumpers: [
      { x: 200, y: 300, r: 22 },
      { x: 130, y: 210, r: 16 },
      { x: 270, y: 210, r: 16 },
      { x: 140, y: 400, r: 16 },
      { x: 260, y: 400, r: 16 },
    ],
  },
  {
    name: 'Sand Bar',
    par: 3,
    tee: { x: 200, y: 520 },
    cup: { x: 150, y: 110 },
    outline: rect(100, 60, 300, 560),
    sand: [
      { x: 100, y: 230, w: 200, h: 50 },
      { x: 200, y: 80, w: 100, h: 70 },
    ],
  },
  {
    name: 'Water Crossing',
    par: 3,
    tee: { x: 100, y: 515 },
    cup: { x: 300, y: 110 },
    outline: rect(60, 60, 340, 560),
    water: [
      { x: 60, y: 280, w: 110, h: 60 },
      { x: 230, y: 280, w: 110, h: 60 },
    ],
  },
  {
    name: 'Windmill',
    par: 3,
    tee: { x: 200, y: 520 },
    cup: { x: 200, y: 110 },
    outline: rect(120, 60, 280, 560),
    blocks: [rect(120, 300, 172, 330), rect(228, 300, 280, 330)],
    spinner: { x: 200, y: 315, len: 64, speed: 1.4 },
  },
  {
    name: 'Uphill',
    par: 3,
    tee: { x: 200, y: 520 },
    cup: { x: 200, y: 110 },
    outline: rect(120, 60, 280, 560),
    slopes: [{ x: 120, y: 180, w: 160, h: 220, ax: 0, ay: 150 }],
    bumpers: [{ x: 160, y: 140, r: 12 }],
  },
  {
    name: 'Switchback',
    par: 4,
    tee: { x: 100, y: 515 },
    cup: { x: 290, y: 115 },
    outline: rect(60, 60, 340, 560),
    blocks: [rect(60, 380, 260, 410), rect(140, 230, 340, 260)],
  },
];
