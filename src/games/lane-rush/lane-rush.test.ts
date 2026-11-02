import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { botRun } from './bot';
import { HIGH_BOTTOM, create, frame, jump, moveLane, slide, update } from './game';
import type { State } from './game';
import { LANES, PATTERN_COUNT, isObstacle, laneX, nextPattern } from './track';
import type { Item, Lane } from './track';

const frames = (s: State, n: number) => {
  for (let i = 0; i < n && !s.over; i++) frame(s);
};

/** A run with nothing on the track but the given items. */
function course(items: Partial<Item>[]): State {
  const s = create('normal', 1);
  s.items = items.map((it) => ({ kind: 'low', lane: 0, z: 10, len: 0.4, y: 0, taken: false, style: 0, ...it }) as Item);
  s.nextZ = 1e9;
  return s;
}

function rng(seed: number) {
  let v = seed >>> 0;
  return () => ((v = (v * 1664525 + 1013904223) >>> 0) / 4294967296);
}

describe('track generation', () => {
  it('no pattern ever blocks all three lanes at once', () => {
    const r = rng(4);
    for (let p = 0; p < PATTERN_COUNT; p++)
      for (let k = 0; k < 40; k++) {
        const { items } = nextPattern(r, 0, 10 + k * 0.4, 2000, p);
        const blocks = items.filter((i) => i.kind === 'block');
        for (const b of blocks) {
          for (const z of [b.z + 0.01, b.z + b.len - 0.01]) {
            const lanes = new Set(blocks.filter((o) => o.z <= z && o.z + o.len >= z).map((o) => o.lane));
            expect(lanes.size, `pattern ${p}`).toBeLessThan(3);
          }
        }
      }
  });

  it('obstacles never share a spot in the same lane', () => {
    const s = create('hard', 8);
    while (s.nextZ < 3000) {
      const p = nextPattern(s.rand, s.nextZ, 20, s.nextZ);
      s.items.push(...p.items);
      s.nextZ = p.end;
    }
    const obs = s.items.filter((i) => isObstacle(i.kind));
    for (const a of obs)
      for (const b of obs) if (a !== b && a.lane === b.lane) expect(a.z + a.len <= b.z || b.z + b.len <= a.z).toBe(true);
  });

  it('a runner that reads the track survives 3 km on every difficulty', () => {
    for (const d of ['easy', 'normal', 'hard'] as const)
      for (let seed = 1; seed <= 8; seed++) {
        const s = create(d, seed);
        botRun(s, 3000);
        expect(s.crashed, `${d} seed ${seed} crashed into a ${s.crashWhat} at ${Math.round(s.z)} m`).toBe(false);
      }
  }, 60_000);

  it('a runner that does nothing soon crashes', () => {
    const s = create('normal', 2);
    frames(s, 60 * 60);
    expect(s.crashed).toBe(true);
    expect(s.z).toBeLessThan(400);
  });
});

describe('the runner', () => {
  it('jumping clears a hurdle; running into it crashes', () => {
    const hit = course([{ kind: 'low', z: 10 }]);
    frames(hit, 120);
    expect(hit.crashWhat).toBe('hurdle');

    const ok = course([{ kind: 'low', z: 10 }]);
    while (ok.z < 10 - ok.speed * 0.25) frame(ok);
    jump(ok);
    frames(ok, 90);
    expect(ok.crashed).toBe(false);
  });

  it('sliding passes under a bar; jumping into it crashes', () => {
    const ok = course([{ kind: 'high', z: 10 }]);
    while (ok.z < 10 - ok.speed * 0.2) frame(ok);
    slide(ok);
    frames(ok, 60);
    expect(ok.crashed).toBe(false);

    const bad = course([{ kind: 'high', z: 10 }]);
    while (bad.z < 10 - bad.speed * 0.15) frame(bad);
    jump(bad);
    frames(bad, 60);
    expect(bad.crashWhat).toBe('bar');
    expect(HIGH_BOTTOM).toBeLessThan(1.7);
  });

  it('changing lanes dodges a train; scraping its side bounces you back', () => {
    const ok = course([{ kind: 'block', z: 12, len: 10 }]);
    frames(ok, 10);
    moveLane(ok, 1);
    frames(ok, 150);
    expect(ok.crashed).toBe(false);

    const scrape = course([{ kind: 'block', lane: 1, z: 2, len: 30 }]);
    frames(scrape, 20);
    moveLane(scrape, 1);
    frames(scrape, 30);
    expect(scrape.crashed).toBe(false);
    expect(scrape.lane).toBe(0);
  });

  it('coins score, the magnet pulls them from other lanes, 2× doubles', () => {
    const s = course([
      { kind: 'coin', lane: 0, z: 6, y: 0.6 },
      { kind: 'magnet', lane: 0, z: 8, y: 0.8 },
      { kind: 'coin', lane: -1, z: 14, y: 0.6 },
      { kind: 'coin', lane: 1, z: 15, y: 0.6 },
      { kind: 'double', lane: 0, z: 18, y: 0.8 },
      { kind: 'coin', lane: 0, z: 30, y: 0.6 },
    ]);
    frames(s, 60 * 4);
    expect(s.coins).toBe(4);
    expect(s.magnetT).toBeGreaterThan(0);
    expect(s.doubleT).toBeGreaterThan(0);
  });

  it('a shield takes one crash', () => {
    const s = course([
      { kind: 'shield', lane: 0, z: 4, y: 0.8 },
      { kind: 'block', lane: 0, z: 14, len: 6 },
      { kind: 'low', lane: 0, z: 40 },
    ]);
    frames(s, 60 * 3);
    expect(s.crashed).toBe(false);
    expect(s.stats.shieldSaves).toBe(1);
    expect(s.shield).toBe(false);
    frames(s, 60 * 4);
    expect(s.crashWhat).toBe('hurdle');
  });

  it('the pace rises with distance up to the top speed', () => {
    const s = create('normal', 3);
    const v0 = s.speed;
    s.z = 5000;
    s.items = [];
    s.nextZ = 1e9;
    frame(s);
    expect(s.speed).toBeGreaterThan(v0);
    expect(s.speed).toBe(s.pace.max);
    expect(create('hard').speed).toBeGreaterThan(create('easy').speed);
  });
});

describe('controls', () => {
  it('arrow keys change lanes, up jumps, down slides', () => {
    const s = course([]);
    update(s, 1 / 60, inputWith([], ['left']));
    expect(s.lane).toBe(-1);
    update(s, 1 / 60, inputWith([], ['up']));
    expect(s.vy).toBeGreaterThan(0);
    frames(s, 60);
    update(s, 1 / 60, inputWith([], ['down']));
    expect(s.slideT).toBeGreaterThan(0);
  });

  it('swipes: sideways changes lane, up jumps, down slides', () => {
    const s = course([]);
    const swipe = (dx: number, dy: number) => {
      update(s, 1 / 60, inputWith([], [], { x: 130, y: 300, down: true, pressed: true }));
      update(s, 1 / 60, inputWith([], [], { x: 130 + dx, y: 300 + dy, down: true }));
      update(s, 1 / 60, inputWith([], [], { x: 130 + dx, y: 300 + dy, down: false, released: true }));
    };
    swipe(60, 4);
    expect(s.lane).toBe(1);
    swipe(0, -50);
    expect(s.vy).toBeGreaterThan(0);
    frames(s, 60);
    swipe(3, 50);
    expect(s.slideT).toBeGreaterThan(0);
    update(s, 1 / 60, emptyInput());
    expect(LANES.includes(s.lane as Lane)).toBe(true);
    expect(s.x).toBeCloseTo(laneX(1), 0);
  });
});
