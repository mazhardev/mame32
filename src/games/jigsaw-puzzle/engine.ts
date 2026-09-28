import type { DifficultySetting } from '@/types';

/**
 * Jigsaw geometry. The picture is cut into cols × rows pieces. Each shared
 * edge gets a knob that sticks out of one neighbour and into the other.
 * Piece outlines are SVG path strings in piece-local units, where the
 * piece's base rectangle spans (0,0)–(pw,ph).
 */
export const GRID: Record<DifficultySetting, { cols: number; rows: number }> = {
  easy: { cols: 4, rows: 3 },
  normal: { cols: 6, rows: 4 },
  hard: { cols: 8, rows: 6 },
};

export const PICTURE = { w: 640, h: 480 };

export interface Tabs {
  /** h[r][c]: edge between (r,c) and (r,c+1); +1 = knob points right. */
  h: number[][];
  /** v[r][c]: edge between (r,c) and (r+1,c); +1 = knob points down. */
  v: number[][];
}

export function makeTabs(cols: number, rows: number, random: () => number): Tabs {
  const sign = () => (random() < 0.5 ? -1 : 1);
  return {
    h: Array.from({ length: rows }, () => Array.from({ length: cols - 1 }, sign)),
    v: Array.from({ length: rows - 1 }, () => Array.from({ length: cols }, sign)),
  };
}

type Pt = [number, number];

/** A knob drawn along the edge p0→p1; `out` is the outward normal, s = +1 knob out, −1 knob in. */
function edge(p0: Pt, p1: Pt, out: Pt, s: number, knob: number): string {
  if (s === 0) return `L${p1[0]} ${p1[1]}`;
  const at = (u: number, v: number): string => {
    const x = p0[0] + (p1[0] - p0[0]) * u + out[0] * v * knob * s;
    const y = p0[1] + (p1[1] - p0[1]) * u + out[1] * v * knob * s;
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  };
  return [
    `L${at(0.35, 0)}`,
    `C${at(0.39, 0)} ${at(0.41, 0.1)} ${at(0.38, 0.2)}`,
    `C${at(0.33, 0.36)} ${at(0.67, 0.36)} ${at(0.62, 0.2)}`,
    `C${at(0.59, 0.1)} ${at(0.61, 0)} ${at(0.65, 0)}`,
    `L${p1[0]} ${p1[1]}`,
  ].join(' ');
}

export function edgeSigns(tabs: Tabs, cols: number, rows: number, r: number, c: number) {
  return {
    top: r === 0 ? 0 : -tabs.v[r - 1][c],
    right: c === cols - 1 ? 0 : tabs.h[r][c],
    bottom: r === rows - 1 ? 0 : tabs.v[r][c],
    left: c === 0 ? 0 : -tabs.h[r][c - 1],
  };
}

export function piecePath(tabs: Tabs, cols: number, rows: number, r: number, c: number, pw: number, ph: number): string {
  const s = edgeSigns(tabs, cols, rows, r, c);
  const knob = Math.min(pw, ph);
  return [
    'M0 0',
    edge([0, 0], [pw, 0], [0, -1], s.top, knob),
    edge([pw, 0], [pw, ph], [1, 0], s.right, knob),
    edge([pw, ph], [0, ph], [0, 1], s.bottom, knob),
    edge([0, ph], [0, 0], [-1, 0], s.left, knob),
    'Z',
  ].join(' ');
}

export interface PieceState {
  r: number;
  c: number;
  /** Top-left of the piece's base rectangle in table units. */
  x: number;
  y: number;
  locked: boolean;
}

export interface Layout {
  kind: 'wide' | 'tall';
  w: number;
  h: number;
  /** Where the picture sits on the table. */
  px: number;
  py: number;
}

export function layoutFor(kind: 'wide' | 'tall'): Layout {
  return kind === 'wide'
    ? { kind, w: 1000, h: 540, px: 180, py: 30 }
    : { kind, w: 680, h: 1000, px: 20, py: 20 };
}

/** Scatters pieces over the free parts of the table, away from the picture. */
export function scatter(layout: Layout, cols: number, rows: number, random: () => number): PieceState[] {
  const pw = PICTURE.w / cols;
  const ph = PICTURE.h / rows;
  const pieces: PieceState[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let x: number;
      let y: number;
      if (layout.kind === 'wide') {
        const left = random() < 0.5;
        const zoneW = layout.px - pw - 10;
        x = left ? 5 + random() * Math.max(1, zoneW) : layout.px + PICTURE.w + 5 + random() * Math.max(1, zoneW);
        y = 5 + random() * (layout.h - ph - 10);
      } else {
        x = 5 + random() * (layout.w - pw - 10);
        y = layout.py + PICTURE.h + 20 + random() * (layout.h - layout.py - PICTURE.h - ph - 30);
      }
      pieces.push({ r, c, x, y, locked: false });
    }
  }
  // Shuffle draw order so neighbours are not stacked in reading order.
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
}

export function home(layout: Layout, cols: number, rows: number, p: { r: number; c: number }): [number, number] {
  return [layout.px + (p.c * PICTURE.w) / cols, layout.py + (p.r * PICTURE.h) / rows];
}

/** Snaps a dropped piece home when it lands within a quarter of a piece of its spot. */
export function trySnap(layout: Layout, cols: number, rows: number, p: PieceState): PieceState {
  const [hx, hy] = home(layout, cols, rows, p);
  const tolerance = Math.min(PICTURE.w / cols, PICTURE.h / rows) * 0.28;
  if (Math.hypot(p.x - hx, p.y - hy) <= tolerance) return { ...p, x: hx, y: hy, locked: true };
  return p;
}

export function scoreFor(pieces: number, ms: number, hints: number): number {
  return Math.max(100, Math.round(pieces * 60 - Math.max(0, ms / 1000 - pieces * 8) - hints * 90));
}
