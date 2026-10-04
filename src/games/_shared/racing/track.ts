/**
 * Closed race tracks built from a handful of control points. The centre line
 * is a Catmull-Rom spline sampled every few pixels, with the cumulative
 * distance along it, so cars can ask "how far round the lap am I" and "how
 * far am I from the centre line" cheaply.
 */
export interface Track {
  /** Sampled centre line. */
  xs: number[];
  ys: number[];
  /** Distance from the start to each sample. */
  dist: number[];
  length: number;
  /** Road width in pixels. */
  width: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function buildTrack(points: [number, number][], width: number, step = 6): Track {
  const n = points.length;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    const segLen = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const samples = Math.max(2, Math.ceil(segLen / step));
    for (let k = 0; k < samples; k++) {
      const t = k / samples;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      xs.push(f(p0[0], p1[0], p2[0], p3[0]));
      ys.push(f(p0[1], p1[1], p2[1], p3[1]));
    }
  }
  const dist = [0];
  for (let i = 1; i < xs.length; i++) dist.push(dist[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  const length = dist[dist.length - 1] + Math.hypot(xs[0] - xs[xs.length - 1], ys[0] - ys[ys.length - 1]);
  return {
    xs,
    ys,
    dist,
    length,
    width,
    minX: Math.min(...xs) - width,
    minY: Math.min(...ys) - width,
    maxX: Math.max(...xs) + width,
    maxY: Math.max(...ys) + width,
  };
}

export interface Nearest {
  index: number;
  /** Signed distance from the centre line (positive = right of travel). */
  offset: number;
  /** Distance along the lap. */
  along: number;
}

/**
 * Nearest centre-line sample. Pass the previous index as a hint to search a
 * small window; without one the whole track is scanned.
 */
export function nearest(t: Track, x: number, y: number, hint = -1): Nearest {
  const n = t.xs.length;
  let best = 0;
  let bestD = Infinity;
  const scan = (i: number) => {
    const d = (t.xs[i] - x) ** 2 + (t.ys[i] - y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  };
  if (hint >= 0) for (let k = -30; k <= 30; k++) scan((hint + k + n) % n);
  if (hint < 0 || bestD > (t.width * 2) ** 2) for (let i = 0; i < n; i++) scan(i);
  const nx = t.xs[(best + 1) % n] - t.xs[best];
  const ny = t.ys[(best + 1) % n] - t.ys[best];
  const len = Math.hypot(nx, ny) || 1;
  // Cross product: which side of the centre line the point is on.
  const offset = ((x - t.xs[best]) * ny - (y - t.ys[best]) * nx) / len;
  return { index: best, offset: -offset, along: t.dist[best] };
}

/** Heading of the track at a sample, in radians. */
export function headingAt(t: Track, i: number): number {
  const n = t.xs.length;
  const j = (i + 1) % n;
  return Math.atan2(t.ys[j] - t.ys[i], t.xs[j] - t.xs[i]);
}

/** Sample index a given distance ahead of another, wrapping round the lap. */
export function aheadIndex(t: Track, i: number, distance: number): number {
  const n = t.xs.length;
  let d = 0;
  let k = i;
  while (d < distance) {
    const j = (k + 1) % n;
    d += Math.hypot(t.xs[j] - t.xs[k], t.ys[j] - t.ys[k]);
    k = j;
    if (k === i) break;
  }
  return k;
}

/** How sharply the track bends over a stretch ahead (radians of heading change). */
export function bendAhead(t: Track, i: number, distance: number): number {
  const a = headingAt(t, i);
  const b = headingAt(t, aheadIndex(t, i, distance));
  return Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
}

/** A point beside the centre line: positive offset is to the right of travel. */
export function pointAt(t: Track, i: number, offset = 0): [number, number] {
  const h = headingAt(t, i) + Math.PI / 2;
  return [t.xs[i] + Math.cos(h) * offset, t.ys[i] + Math.sin(h) * offset];
}
