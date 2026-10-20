import { describe, expect, it } from 'vitest';
import { inputWith } from '../_shared/arcade/kit';
import { AMMO_BONUS, PULL_PX, create, fixedStep, launch, playOut, playShot, starsFor, update, useAbility } from './game';
import type { State } from './game';
import { ENEMY_R, LEVEL_COUNT, PER_WORLD, level } from './levels';
import { AMMO, ENEMY_HP, MATS, addBox, addEnemy, addShot, buildWorld, enemiesLeft, stepWorld } from './physics';
import { SOLUTIONS } from './solutions';

const run = (s: State, seconds: number) => {
  for (let i = 0; i < seconds * 60 && !s.over; i++) fixedStep(s);
};

/** A world with nothing but flat ground. */
const empty = () => {
  const p = buildWorld({ index: 0, world: 0, name: 'test', pieces: [], ammo: [] });
  p.live = true;
  return p;
};

describe('levels', () => {
  it('has 30 levels in three worlds of ten', () => {
    expect(LEVEL_COUNT).toBe(30);
    expect(PER_WORLD).toBe(10);
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const l = level(i);
      expect(l.world).toBe(Math.floor(i / 10));
      expect(l.ammo.length).toBeGreaterThanOrEqual(3);
      expect(l.pieces.some((p) => p.t === 'enemy')).toBe(true);
    }
  });

  it('no two pieces overlap and nothing floats', () => {
    const e = 1e-3;
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const l = level(i);
      const rects = l.pieces
        .filter((p) => p.t !== 'enemy')
        .map((p) => ('w' in p ? { x0: p.x - p.w / 2, x1: p.x + p.w / 2, y0: p.y - p.h / 2, y1: p.y + p.h / 2 } : null))
        .filter((r): r is { x0: number; x1: number; y0: number; y1: number } => !!r);
      for (let a = 0; a < rects.length; a++)
        for (let b = a + 1; b < rects.length; b++) {
          const w = Math.min(rects[a].x1, rects[b].x1) - Math.max(rects[a].x0, rects[b].x0);
          const h = Math.min(rects[a].y1, rects[b].y1) - Math.max(rects[a].y0, rects[b].y0);
          expect(w > e && h > e, `level ${i + 1}: pieces ${a} and ${b} overlap`).toBe(false);
        }
      for (const r of rects) {
        const held = Math.abs(r.y0) < e || rects.some((o) => o !== r && Math.abs(o.y1 - r.y0) < e && Math.min(r.x1, o.x1) - Math.max(r.x0, o.x0) > 0.05);
        expect(held, `level ${i + 1}: a piece floats at y ${r.y0}`).toBe(true);
      }
      for (const p of l.pieces) {
        if (p.t !== 'enemy') continue;
        const r = ENEMY_R[p.size];
        for (const o of rects) {
          const nx = Math.max(o.x0, Math.min(p.x, o.x1));
          const ny = Math.max(o.y0, Math.min(p.y, o.y1));
          expect(Math.hypot(p.x - nx, p.y - ny), `level ${i + 1}: a Grumble is inside a block`).toBeGreaterThanOrEqual(r - e);
        }
      }
    }
  });

  it('every fort stands still when left alone', () => {
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const s = create('normal', i);
      const start = new Map(s.phys.things.map((t) => [t.id, { ...t.body.getPosition() }]));
      const count = s.phys.things.length;
      run(s, 8);
      expect(s.phys.things.length, `level ${i + 1} lost pieces`).toBe(count);
      expect(s.score).toBe(0);
      for (const t of s.phys.things) {
        const p = t.body.getPosition();
        const p0 = start.get(t.id)!;
        expect(Math.hypot(p.x - p0.x, p.y - p0.y), `level ${i + 1} moved`).toBeLessThan(0.02);
      }
    }
  });

  it('every level can be won with the recorded shots, within its stones', () => {
    expect(SOLUTIONS.length).toBe(LEVEL_COUNT);
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const shots = SOLUTIONS[i];
      expect(shots.length, `level ${i + 1} has no solution`).toBeGreaterThan(0);
      expect(shots.length).toBeLessThanOrEqual(level(i).ammo.length);
      const s = create('normal', i);
      expect(s.par).toBe(shots.length);
      for (const shot of shots) {
        if (s.phase !== 'aim') break;
        playShot(s, shot);
      }
      playOut(s);
      expect(enemiesLeft(s.phys), `level ${i + 1}`).toBe(0);
      expect(s.over && s.won, `level ${i + 1} not won`).toBe(true);
      expect(s.stars).toBe(3);
      expect(s.score).toBeGreaterThanOrEqual(5000 * level(i).pieces.filter((p) => p.t === 'enemy').length);
    }
  }, 120_000);

  it('replays exactly: the same shots give the same result', () => {
    const play = () => {
      const s = create('normal', 9);
      playShot(s, { a: 30, v: 18 });
      return [s.score, enemiesLeft(s.phys), s.phys.things.length].join(',');
    };
    expect(play()).toBe(play());
  });
});

describe('damage', () => {
  it('resting and gentle bumps do no harm', () => {
    const p = empty();
    const plank = addBox(p, 'ice', 0, 0.2, 2, 0.4);
    const blob = addEnemy(p, 0, 3, 0.3 + ENEMY_R[0]);
    for (let i = 0; i < 180; i++) stepWorld(p);
    expect(plank.hp).toBe(MATS.ice.hp);
    expect(blob.hp).toBe(ENEMY_HP[0]);
    expect(p.broken).toHaveLength(0);
  });

  it('a fast stone smashes wood and ice but only dents stone', () => {
    const hit = (mat: 'wood' | 'stone' | 'ice') => {
      const p = empty();
      const post = addBox(p, mat, 6, 1.2, 0.4, 2.4);
      addShot(p, 'pebble', 3, 1.2, 18, 0);
      let broke = false;
      for (let i = 0; i < 40 && !broke; i++) {
        stepWorld(p);
        if (p.broken.includes(post)) broke = true;
      }
      return { broke, hp: post.hp };
    };
    expect(hit('wood').broke).toBe(true);
    expect(hit('ice').broke).toBe(true);
    const stone = hit('stone');
    expect(stone.broke).toBe(false);
    expect(stone.hp).toBeLessThan(MATS.stone.hp);
  });

  it('a boulder cracks stone that a pebble cannot', () => {
    const p = empty();
    const post = addBox(p, 'stone', 6, 1.2, 0.4, 2.4);
    addShot(p, 'boulder', 3, 1.2, 18, 0);
    for (let i = 0; i < 40; i++) stepWorld(p);
    expect(p.broken).toContain(post);
    expect(AMMO.boulder.vs.stone).toBeGreaterThan(AMMO.pebble.vs.stone);
  });

  it('a Grumble falling from a tower is knocked out', () => {
    const p = empty();
    const blob = addEnemy(p, 0, 0, 6);
    for (let i = 0; i < 120; i++) stepWorld(p);
    expect(p.broken).toContain(blob);
  });
});

describe('play', () => {
  it('TNT blows up and takes its neighbours with it', () => {
    const s = create('normal', 10);
    const tnt = s.phys.things.find((t) => t.mat === 'tnt')!;
    const near = s.phys.things.filter((t) => t.kind === 'enemy');
    expect(near.length).toBe(2);
    const c = tnt.body.getPosition();
    // Drop a heavy stone straight onto the crate.
    const shot = addShot(s.phys, 'boulder', c.x, c.y + 3, 0, -14);
    s.shots = [shot];
    run(s, 4);
    expect(s.stats.tnt).toBe(1);
    expect(tnt.dead).toBe(true);
    expect(near.every((t) => t.dead)).toBe(true);
  });

  it('a missed shot loads the next stone; running out with Grumbles left loses', () => {
    const s = create('normal', 0);
    const stones = s.queue.length;
    playShot(s, { a: 80, v: 6 });
    expect(s.phase).toBe('aim');
    expect(s.queue.length).toBe(stones - 1);
    while (s.phase === 'aim') playShot(s, { a: 80, v: 6 });
    playOut(s);
    expect(s.over).toBe(true);
    expect(s.won).toBe(false);
  });

  it('unused stones are worth a bonus, and stars follow the par', () => {
    const s = create('normal', 0);
    playShot(s, SOLUTIONS[0][0]);
    const before = s.score;
    const spare = s.queue.length;
    playOut(s);
    expect(s.won).toBe(true);
    expect(s.score).toBeGreaterThanOrEqual(before + spare * AMMO_BONUS);
    expect(s.queue.length).toBe(0);
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(2, 1)).toBe(2);
    expect(starsFor(3, 1)).toBe(1);
  });

  it('triplets split in three, the zoomer dashes and the kaboom explodes', () => {
    const t = create('normal', 4);
    launch(t, 0.6, 15);
    for (let i = 0; i < 20; i++) fixedStep(t);
    useAbility(t);
    expect(t.shots.length).toBe(3);

    const z = create('normal', 10);
    launch(z, 0.5, 12);
    for (let i = 0; i < 20; i++) fixedStep(z);
    const v0 = z.shots[0].body.getLinearVelocity().length();
    useAbility(z);
    expect(z.shots[0].body.getLinearVelocity().length()).toBeGreaterThan(v0 * 1.8);

    const k = create('normal', 20);
    launch(k, 0.6, 15);
    for (let i = 0; i < 20; i++) fixedStep(k);
    useAbility(k);
    expect(k.shots[0].dead).toBe(true);
    expect(k.booms.length).toBe(1);
  });

  it('easy gives an extra pebble', () => {
    expect(create('easy', 3).queue.length).toBe(create('normal', 3).queue.length + 1);
  });

  it('a pull-back drag aims and fires', () => {
    const s = create('normal', 0);
    update(s, 1 / 60, inputWith([], [], { x: 200, y: 100, down: true, pressed: true }));
    update(s, 1 / 60, inputWith([], [], { x: 200 - PULL_PX * 0.7, y: 100 + PULL_PX * 0.4, down: true }));
    expect(s.drag.on).toBe(true);
    expect(s.aim.angle).toBeGreaterThan(0.4);
    expect(s.aim.angle).toBeLessThan(0.6);
    update(s, 1 / 60, inputWith([], [], { x: 200 - PULL_PX * 0.7, y: 100 + PULL_PX * 0.4, down: false, released: true }));
    expect(s.phase).toBe('fly');
    expect(s.shotsUsed).toBe(1);
  });

  it('keyboard aiming changes angle and power, and Space fires', () => {
    const s = create('normal', 0);
    const a0 = s.aim.angle;
    const p0 = s.aim.power;
    update(s, 0.5, inputWith(['up', 'right']));
    expect(s.aim.angle).toBeGreaterThan(a0);
    expect(s.aim.power).toBeGreaterThan(p0);
    update(s, 1 / 60, inputWith([], ['action']));
    expect(s.phase).toBe('fly');
  });
});
