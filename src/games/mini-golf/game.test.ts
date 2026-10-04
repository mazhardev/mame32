import { describe, expect, it } from 'vitest';
import { polyContains } from '../_shared/golf/golf';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { HOLES } from './holes';
import type { MiniHole } from './holes';
import { create, inWater, simulatePutt, spec } from './game';

/** Grid distance from every cell to the cup, walking around walls and water. */
function distanceField(hole: MiniHole) {
  const cell = 10;
  const cols = 40;
  const rows = 60;
  const free = (c: number, r: number) => {
    const x = c * cell + 5;
    const y = r * cell + 5;
    return (
      polyContains(hole.outline, x, y) &&
      !(hole.blocks ?? []).some((b) => polyContains(b, x, y)) &&
      !inWater(hole, x, y)
    );
  };
  const dist = new Array(cols * rows).fill(Infinity);
  const start = Math.floor(hole.cup.y / cell) * cols + Math.floor(hole.cup.x / cell);
  dist[start] = 0;
  const queue = [start];
  while (queue.length) {
    const i = queue.shift()!;
    const c = i % cols;
    const r = Math.floor(i / cols);
    for (const [dc, dr] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || !free(nc, nr)) continue;
      const j = nr * cols + nc;
      if (dist[j] > dist[i] + 1) {
        dist[j] = dist[i] + 1;
        queue.push(j);
      }
    }
  }
  return (x: number, y: number) =>
    dist[Math.floor(y / cell) * cols + Math.floor(x / cell)] ?? Infinity;
}

/** Beam search over putts: can the hole be finished within `limit` strokes? */
function solve(hole: MiniHole, limit: number): number | null {
  const field = distanceField(hole);
  let beam = [{ x: hole.tee.x, y: hole.tee.y }];
  for (let stroke = 1; stroke <= limit; stroke++) {
    const next: { x: number; y: number; d: number }[] = [];
    for (const from of beam) {
      for (let a = 0; a < 48; a++) {
        for (const power of [0.15, 0.3, 0.5, 0.7, 0.9]) {
          const res = simulatePutt(hole, from, (a / 48) * Math.PI * 2, power);
          if (res.holed) return stroke;
          if (res.water) continue;
          next.push({ x: res.x, y: res.y, d: field(res.x, res.y) });
        }
      }
    }
    next.sort((p, q) => p.d - q.d);
    beam = next.slice(0, 4);
  }
  return null;
}

describe('mini golf course', () => {
  it.each(HOLES.map((h, i) => [i + 1, h] as const))(
    'hole %i can be holed within par + 1',
    (_n, hole) => {
      const strokes = solve(hole, hole.par + 1);
      expect(strokes).not.toBeNull();
    },
  );

  it('the cup does not catch a ball racing over it', () => {
    const hole = HOLES[0];
    const res = simulatePutt(hole, hole.tee, -Math.PI / 2, 1);
    expect(res.holed).toBe(false);
  });

  it('water costs a stroke and returns the ball', () => {
    const s = create('normal');
    s.hole = 5;
    s.ball = { x: 115, y: 400, vx: 0, vy: 0 };
    s.aim.angle = -Math.PI / 2;
    s.aim.power = 0.4;
    spec.update(s, 1 / 60, inputWith([], ['action']), Math.random);
    for (let i = 0; i < 600 && s.phase === 'rolling'; i++)
      spec.update(s, 1 / 60, emptyInput(), Math.random);
    expect(s.strokes).toBe(2);
    expect(s.ball).toMatchObject({ x: 115, y: 400 });
  });
});
