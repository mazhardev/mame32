/**
 * Darts rules: board geometry, scoring a landing point, and 301 with a
 * double to finish. Radii are in board units (the double ring's outer edge
 * is 170, as on a regulation board in millimetres).
 */
export const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
export const R = { bull: 6.35, outerBull: 15.9, tripleIn: 99, tripleOut: 107, doubleIn: 162, doubleOut: 170 };

export interface Hit {
  value: number;
  multiplier: 0 | 1 | 2 | 3;
  label: string;
}

/** Score for a dart landing at (x, y) relative to the centre, y down. */
export function scoreAt(x: number, y: number): Hit {
  const d = Math.hypot(x, y);
  if (d <= R.bull) return { value: 50, multiplier: 2, label: 'Bull' };
  if (d <= R.outerBull) return { value: 25, multiplier: 1, label: '25' };
  if (d > R.doubleOut) return { value: 0, multiplier: 0, label: 'Miss' };
  // Angle measured clockwise from straight up; each segment spans 18°.
  const deg = ((Math.atan2(x, -y) * 180) / Math.PI + 360 + 9) % 360;
  const n = ORDER[Math.floor(deg / 18)];
  if (d >= R.doubleIn) return { value: n * 2, multiplier: 2, label: `D${n}` };
  if (d >= R.tripleIn && d <= R.tripleOut) return { value: n * 3, multiplier: 3, label: `T${n}` };
  return { value: n, multiplier: 1, label: String(n) };
}

/** Centre point of a target ("T20", "D16", "Bull", "20"…) for aiming. */
export function targetPoint(label: string): [number, number] {
  if (label === 'Bull') return [0, 0];
  if (label === '25') return [0, -11];
  const m = /^([TD]?)(\d+)$/.exec(label);
  if (!m) return [0, 0];
  const n = Number(m[2]);
  const i = ORDER.indexOf(n);
  const angle = (i * 18 * Math.PI) / 180;
  const r = m[1] === 'T' ? (R.tripleIn + R.tripleOut) / 2 : m[1] === 'D' ? (R.doubleIn + R.doubleOut) / 2 : 60;
  return [Math.sin(angle) * r, -Math.cos(angle) * r];
}

export interface Turn {
  start: number;
  darts: Hit[];
  bust: boolean;
}

/**
 * Applies a dart to a remaining score under double-out rules. Returns the new
 * remaining score, or null for a bust (score goes back to the turn start).
 */
export function applyDart(remaining: number, hit: Hit): number | null {
  const left = remaining - hit.value;
  if (left < 0 || left === 1) return null;
  if (left === 0 && hit.multiplier !== 2) return null;
  return left;
}

/** A sensible target for the computer: finish if possible, otherwise treble 20. */
export function aiTarget(remaining: number): string {
  if (remaining === 50) return 'Bull';
  if (remaining <= 40 && remaining % 2 === 0) return `D${remaining / 2}`;
  if (remaining <= 40) return '1';
  if (remaining <= 60) {
    // Leave a double: hit a single that leaves an even number ≤ 40.
    const single = remaining - 32;
    if (single >= 1 && single <= 20) return String(single);
  }
  return 'T20';
}
