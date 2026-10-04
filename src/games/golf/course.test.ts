import { describe, expect, it } from 'vitest';
import { COURSE, PUTTER, playShot, suggestClub, surfaceAt } from './course';
import type { Hole } from './course';

const NO_WIND = { x: 0, y: 0 };

/** Beam search: how few strokes does a sensible golfer need? */
function solve(h: Hole, slope: number): number | null {
  let beam = [{ x: h.tee.x, y: h.tee.y, strokes: 0 }];
  for (let depth = 0; depth < h.par + 3; depth++) {
    const next: { x: number; y: number; strokes: number; cost: number }[] = [];
    for (const b of beam) {
      const lie = surfaceAt(h, b.x, b.y);
      const toPin = Math.atan2(h.pin.y - b.y, h.pin.x - b.x);
      const clubs = lie === 'green' ? [PUTTER] : [0, 1, 2, 3, 4, 5, 6, PUTTER];
      for (const club of clubs) {
        const powers =
          club === PUTTER
            ? Array.from({ length: 24 }, (_, i) => 0.04 + i * 0.04)
            : [0.45, 0.6, 0.75, 0.9, 1];
        const spread = club === PUTTER ? 0.3 : 0.4;
        for (let k = -10; k <= 10; k++) {
          for (const power of powers) {
            const r = playShot(h, b, club, toPin + (k / 10) * spread, power, NO_WIND, slope);
            if (r.holed) return b.strokes + 1;
            if (r.penalty) continue;
            const kind = surfaceAt(h, r.x, r.y);
            const cost =
              Math.hypot(r.x - h.pin.x, r.y - h.pin.y) +
              (kind === 'rough' ? 12 : kind === 'sand' ? 25 : 0);
            next.push({ x: r.x, y: r.y, strokes: b.strokes + 1, cost });
          }
        }
      }
    }
    next.sort((a, b) => a.cost - b.cost);
    beam = next.slice(0, 3);
  }
  return null;
}

describe('golf course', () => {
  it.each(COURSE.map((h, i) => [i + 1, h] as const))(
    'hole %i is playable within par + 1 on a sloped green',
    (_n, h) => {
      const strokes = solve(h, 1.6);
      expect(strokes).not.toBeNull();
      expect(strokes!).toBeLessThanOrEqual(h.par + 1);
    },
  );

  it('tees and pins sit on sensible surfaces', () => {
    for (const h of COURSE) {
      expect(surfaceAt(h, h.pin.x, h.pin.y)).toBe('green');
      expect(['fairway', 'rough']).toContain(surfaceAt(h, h.tee.x, h.tee.y));
    }
  });

  it('a shot into water or out of bounds is a penalty', () => {
    const h = COURSE[1];
    const r = playShot(h, h.tee, 4, -Math.PI / 2, 0.85, NO_WIND, 1);
    expect(r.penalty).toBe('water');
    const out = playShot(COURSE[0], COURSE[0].tee, 0, 0, 1, NO_WIND, 1);
    expect(out.penalty).toBe('out');
  });

  it('wind carries the ball sideways', () => {
    const h = COURSE[0];
    const calm = playShot(h, h.tee, 3, -Math.PI / 2, 1, NO_WIND, 1);
    const windy = playShot(h, h.tee, 3, -Math.PI / 2, 1, { x: 8, y: 0 }, 1);
    expect(windy.landX - calm.landX).toBeGreaterThan(10);
  });

  it('suggests longer clubs for longer shots and the putter on the green', () => {
    expect(suggestClub(240, 'fairway')).toBe(0);
    expect(suggestClub(100, 'fairway')).toBe(4);
    expect(suggestClub(5, 'green')).toBe(PUTTER);
  });
});
