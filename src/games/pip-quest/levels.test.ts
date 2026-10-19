import { describe, expect, it } from 'vitest';
import { LEVEL_COUNT, PER_WORLD, PLANS, ROWS, TILE, WORLDS, buildLevel } from './levels';
import type { Level } from './levels';

const solid = (v: number) => v >= TILE.ground && v <= TILE.stump;
const standOn = (v: number) => solid(v) || v === TILE.ledge;
const hazard = (v: number) => v === TILE.spikes || v === TILE.lava;

/**
 * Conservative jump model: from a standing spot Pip can reach another one
 * that is up to 4 tiles higher (fewer columns away the higher it is), level
 * with it up to 5 columns away, or lower up to 5 + the drop (max 8) away.
 * Moving and crumbling ledges count as standing spots along their whole path.
 */
function reachable(lv: Level): boolean {
  const at = (c: number, r: number) => (c < 0 || c >= lv.cols || r < 0 || r >= ROWS ? TILE.empty : lv.tiles[r * lv.cols + c]);
  const stand = new Set<number>();
  const key = (c: number, r: number) => r * lv.cols + c;
  for (let c = 0; c < lv.cols; c++) {
    for (let r = 1; r < ROWS - 1; r++) {
      const here = at(c, r);
      if (solid(here) || hazard(here) || here === TILE.ledge) continue;
      if (solid(at(c, r - 1))) continue; // needs headroom for big Pip
      if (standOn(at(c, r + 1))) stand.add(key(c, r));
    }
  }
  for (const m of lv.marks) {
    if (m.ch === 'm') for (let c = m.c - 4; c <= m.c + 4; c++) stand.add(key(c, m.r - 1));
    if (m.ch === 'v') for (let r = m.r - 3; r <= m.r + 3; r++) for (let c = m.c - 1; c <= m.c + 1; c++) stand.add(key(c, r - 1));
    if (m.ch === 'f') for (let c = m.c; c <= m.c + 1; c++) stand.add(key(c, m.r - 1));
  }
  const goal = lv.marks.find((m) => m.ch === '%' || m.ch === 'K')!;
  const startKey = key(lv.start.c, lv.start.r);
  const seen = new Set([startKey]);
  const queue = [startKey];
  const spots = [...stand];
  while (queue.length) {
    const k = queue.shift()!;
    const c = k % lv.cols;
    const r = Math.floor(k / lv.cols);
    if (c >= goal.c - 2) return true;
    for (const k2 of spots) {
      if (seen.has(k2)) continue;
      const c2 = k2 % lv.cols;
      const r2 = Math.floor(k2 / lv.cols);
      const dx = Math.abs(c2 - c);
      const rise = r - r2;
      const ok = rise > 0 ? rise <= 4 && dx <= 6 - rise : rise === 0 ? dx <= 5 : dx <= Math.min(8, 5 - rise);
      if (!ok) continue;
      seen.add(k2);
      queue.push(k2);
    }
  }
  return false;
}

describe('pip quest levels', () => {
  it('has five worlds of four levels, each world ending in a boss keep', () => {
    expect(WORLDS).toBe(5);
    expect(LEVEL_COUNT).toBe(20);
    PLANS.forEach((p, i) => expect(!!p.boss).toBe(i % PER_WORLD === PER_WORLD - 1));
  });

  it.each(PLANS.map((p, i) => [i + 1, p.name, i] as const))('level %i (%s) builds with a start and an end', (_n, _name, i) => {
    const lv = buildLevel(i);
    expect(lv.cols).toBeGreaterThan(150);
    expect(lv.tiles).toHaveLength(lv.cols * ROWS);
    expect(lv.marks.filter((m) => m.ch === '@')).toHaveLength(1);
    const ends = lv.marks.filter((m) => m.ch === '%' || m.ch === 'K');
    expect(ends).toHaveLength(1);
    expect(ends[0].ch).toBe(PLANS[i].boss ? 'K' : '%');
    expect(lv.marks.some((m) => m.ch === 'C')).toBe(true);
  });

  it.each(PLANS.map((p, i) => [i + 1, p.name, i] as const))('level %i (%s) can be finished', (_n, _name, i) => {
    expect(reachable(buildLevel(i))).toBe(true);
  });

  it('gives every level a power-up block early on', () => {
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const lv = buildLevel(i);
      const first = lv.tiles.findIndex((v, k) => (v === TILE.qpower || v === TILE.qstar) && k % lv.cols < 80);
      expect(first, `level ${i + 1}`).toBeGreaterThanOrEqual(0);
    }
  });
});
