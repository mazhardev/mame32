import type { Rect } from './levels';

/**
 * Geometry for the parking game: the car is an oriented box, obstacles are
 * axis-aligned boxes. Collision uses the separating-axis test.
 */
export const CAR_L = 50;
export const CAR_W = 26;

export function corners(x: number, y: number, angle: number, l = CAR_L, w = CAR_W): [number, number][] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [l / 2, w / 2],
    [l / 2, -w / 2],
    [-l / 2, -w / 2],
    [-l / 2, w / 2],
  ].map(([px, py]) => [x + c * px - s * py, y + s * px + c * py]);
}

function project(points: [number, number][], ax: number, ay: number): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const [x, y] of points) {
    const p = x * ax + y * ay;
    min = Math.min(min, p);
    max = Math.max(max, p);
  }
  return [min, max];
}

export function hitsRect(car: [number, number][], r: Rect): boolean {
  const box: [number, number][] = [
    [r.x, r.y],
    [r.x + r.w, r.y],
    [r.x + r.w, r.y + r.h],
    [r.x, r.y + r.h],
  ];
  const axes: [number, number][] = [
    [1, 0],
    [0, 1],
  ];
  for (let i = 0; i < 2; i++) {
    const [x0, y0] = car[i];
    const [x1, y1] = car[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    axes.push([-(y1 - y0) / len, (x1 - x0) / len]);
  }
  return axes.every(([ax, ay]) => {
    const [a0, a1] = project(car, ax, ay);
    const [b0, b1] = project(box, ax, ay);
    return a1 > b0 && b1 > a0;
  });
}

export function outOfLot(car: [number, number][], w: number, h: number): boolean {
  return car.some(([x, y]) => x < 0 || y < 0 || x > w || y > h);
}

/** Is every corner of the car inside the bay (an oriented rectangle)? */
export function insideBay(car: [number, number][], bay: { x: number; y: number; w: number; h: number; angle: number }): boolean {
  // The bay's width/height are in screen axes before rotation; compare in the bay's frame.
  const c = Math.cos(-bay.angle);
  const s = Math.sin(-bay.angle);
  const long = Math.max(bay.w, bay.h);
  const short = Math.min(bay.w, bay.h);
  return car.every(([x, y]) => {
    const dx = x - bay.x;
    const dy = y - bay.y;
    const lx = c * dx - s * dy;
    const ly = s * dx + c * dy;
    return Math.abs(lx) <= long / 2 && Math.abs(ly) <= short / 2;
  });
}

/** Heading error to the bay, in radians (0 = perfect). */
export function headingError(angle: number, bayAngle: number, eitherWay = false): number {
  const d = Math.abs(Math.atan2(Math.sin(angle - bayAngle), Math.cos(angle - bayAngle)));
  return eitherWay ? Math.min(d, Math.PI - d) : d;
}
