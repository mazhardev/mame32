import type { CSSProperties } from 'react';

/**
 * Background geometry for an intersection-style cell: a horizontal and a
 * vertical line through the centre, trimmed at the board edges so the grid
 * has a clean border.
 */
export function crossStyle(r: number, c: number, n: number): CSSProperties {
  const hx = c === 0 ? '50%' : '0';
  const hw = c === 0 || c === n - 1 ? '50%' : '100%';
  const vy = r === 0 ? '50%' : '0';
  const vh = r === 0 || r === n - 1 ? '50%' : '100%';
  return {
    backgroundSize: `${hw} 1px, 1px ${vh}`,
    backgroundPosition: `${hx} 50%, 50% ${vy}`,
  };
}

/** Traditional star points for 9, 13, 15 and 19 line boards. */
export function starPoints(n: number): Set<number> {
  const edge = n >= 13 ? 3 : 2;
  const mid = (n - 1) / 2;
  const lines = n >= 13 ? [edge, mid, n - 1 - edge] : [edge, n - 1 - edge];
  const out = new Set<number>();
  for (const r of lines) for (const c of lines) out.add(r * n + c);
  if (n < 13) out.add(mid * n + mid);
  return out;
}
