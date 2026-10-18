import { describe, expect, it } from 'vitest';
import { EMPTY, ONEWAY, SOLID, moveBody, standingOn, walk } from './physics';
import type { Body, Solidity, TileQuery } from './physics';

/** '#' solid, '=' one-way, anything else empty; outside the map is solid at the sides, empty above and below. */
function grid(rows: string[]): TileQuery {
  return {
    size: 16,
    at(c, r): Solidity {
      if (c < 0 || c >= rows[0].length) return SOLID;
      if (r < 0 || r >= rows.length) return EMPTY;
      const ch = rows[r][c];
      return ch === '#' ? SOLID : ch === '=' ? ONEWAY : EMPTY;
    },
  };
}

const body = (x: number, y: number, vx = 0, vy = 0): Body => ({ x, y, w: 12, h: 14, vx, vy, onGround: false });

const MAP = grid([
  '..........',
  '..........',
  '....===...',
  '..........',
  '..........',
  '#.........',
  '##########',
]);

describe('platformer physics', () => {
  it('lands on solid ground', () => {
    const b = body(40, 60, 0, 400);
    for (let i = 0; i < 30; i++) moveBody(b, 1 / 60, MAP);
    expect(b.y + b.h).toBe(6 * 16);
    expect(b.onGround).toBe(true);
    expect(standingOn(b, MAP)).toBe(true);
  });

  it('jumps up through a one-way platform and lands on top of it', () => {
    const b = body(66, 70, 0, -500);
    let landed = false;
    for (let i = 0; i < 60 && !landed; i++) {
      b.vy += 1500 / 60;
      landed = moveBody(b, 1 / 60, MAP).landed;
    }
    expect(b.y + b.h).toBe(2 * 16);
  });

  it('drops through a one-way platform on request', () => {
    const b = body(66, 32 - 14, 0, 50);
    moveBody(b, 1 / 60, MAP, { dropThrough: true });
    expect(b.y + b.h).toBeGreaterThan(32);
  });

  it('stops at walls and reports the side', () => {
    const b = body(30, 6 * 16 - 14, -300, 10);
    const res = moveBody(b, 0.1, MAP);
    expect(res.hitLeft).toBe(true);
    expect(b.x).toBe(16);
  });

  it('reports ceiling tiles struck from below', () => {
    const ceil = grid(['....', '.#..', '....', '....']);
    const b = body(18, 40, 0, -400);
    const res = moveBody(b, 0.1, ceil);
    expect(res.hitCeiling).toBe(true);
    expect(res.ceilingTiles).toContainEqual([1, 1]);
    expect(b.y).toBe(32);
  });

  it('never tunnels through a thin floor at high speed', () => {
    const thin = grid(['....', '....', '....', '....', '####', '....', '....']);
    const b = body(10, 0, 0, 2000);
    moveBody(b, 0.05, thin);
    expect(b.y + b.h).toBe(64);
  });

  it('lands on moving ledges', () => {
    const b = body(100, 40, 0, 300);
    const res = moveBody(b, 0.1, grid(['..........', '..........', '..........', '..........', '..........', '..........', '..........']), {
      ledges: [{ x: 90, y: 60, w: 48 }],
    });
    expect(res.ledge).toBe(0);
    expect(b.y + b.h).toBe(60);
  });

  it('walkers turn around at walls and, if asked, at ledges', () => {
    const map = grid(['#......#', '#......#', '#.###..#', '########']);
    const w = { ...body(40, 2 * 16 - 14), dir: 1 };
    w.onGround = true;
    const xs: number[] = [];
    for (let i = 0; i < 240; i++) {
      walk(w, 40, 1500, 1 / 60, map, { turnAtLedges: true });
      xs.push(w.x);
    }
    // It paces on the 3-tile ledge without falling off.
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(32);
    expect(Math.max(...xs) + 12).toBeLessThanOrEqual(80);
    expect(w.y + w.h).toBe(32);
  });
});
