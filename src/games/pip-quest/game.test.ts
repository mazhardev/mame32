import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { BIG, SMALL, create, loadLevel, update } from './game';
import type { Enemy, State } from './game';
import { LEVEL_COUNT, PER_WORLD, T, TILE } from './levels';

const rng = () => createRng('pip').next;
const spec = { update };

/** A fresh run, past the level card. */
function start(level = 0): State {
  const s = create('normal', rng(), level);
  s.phase = 'play';
  return s;
}

/** Puts Pip on the ground at column `c` of the first level's flat floor. */
function placePip(s: State, c: number) {
  s.p.x = c * T + 2;
  s.p.y = 14 * T - s.p.h;
  s.p.vx = 0;
  s.p.vy = 0;
  s.p.ground = true;
}

function walker(s: State, c: number): Enemy {
  const e = s.enemies.find((x) => x.kind === 'g')!;
  e.b.x = c * T + 1;
  e.b.y = 14 * T - 14;
  e.active = true;
  e.dir = -1;
  return e;
}

describe('pip quest — movement', () => {
  it('walks, runs faster, and jumps higher while jump is held', () => {
    const s = start();
    placePip(s, 2);
    simulate(spec, s, 0.6, inputWith(['right']), rng());
    const walked = s.p.x;
    const s2 = start();
    placePip(s2, 2);
    simulate(spec, s2, 0.6, inputWith(['right', 'action2']), rng());
    expect(s2.p.x).toBeGreaterThan(walked + 10);

    const tap = start();
    placePip(tap, 2);
    let input = inputWith([], ['action']);
    let top = tap.p.y;
    for (let i = 0; i < 40; i++) {
      update(tap, 1 / 60, input, rng());
      input = emptyInput();
      top = Math.min(top, tap.p.y);
    }
    const hold = start();
    placePip(hold, 2);
    let topHold = hold.p.y;
    input = inputWith([], ['action']);
    for (let i = 0; i < 40; i++) {
      update(hold, 1 / 60, input, rng());
      input = inputWith(['action']);
      topHold = Math.min(topHold, hold.p.y);
    }
    expect(14 * T - SMALL - topHold).toBeGreaterThan(4 * T - 2);
    expect(topHold).toBeLessThan(top - 20);
  });

  it('still jumps just after walking off a ledge (coyote time)', () => {
    const s = start();
    placePip(s, 2);
    s.p.ground = false;
    s.p.coyote = 0.05;
    s.p.y -= 0.5;
    update(s, 1 / 60, inputWith([], ['action']), rng());
    expect(s.p.vy).toBeLessThan(-300);
  });
});

describe('pip quest — enemies', () => {
  it('stomps a walker from above and bounces', () => {
    const s = start();
    placePip(s, 4);
    s.enemies.forEach((e) => (e.active = false));
    const e = walker(s, 4);
    s.p.y = e.b.y - s.p.h - 3;
    s.p.vy = 200;
    s.p.ground = false;
    update(s, 1 / 60, emptyInput(), rng());
    expect(e.alive).toBe(false);
    expect(s.p.vy).toBeLessThan(0);
    expect(s.score).toBeGreaterThanOrEqual(100);
  });

  it('loses the power-up instead of a life when hit while big', () => {
    const s = start();
    placePip(s, 4);
    s.enemies.forEach((e) => (e.active = false));
    s.p.form = 1;
    s.p.h = BIG;
    s.p.y = 14 * T - BIG;
    walker(s, 4);
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.p.form).toBe(0);
    expect(s.p.invuln).toBeGreaterThan(0);
    expect(s.phase).toBe('play');
  });

  it('loses a life when hit while small, then restarts the level', () => {
    const s = start();
    placePip(s, 4);
    s.enemies.forEach((e) => (e.active = false));
    walker(s, 4);
    const lives = s.lives;
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.phase).toBe('dying');
    simulate(spec, s, 2.5, emptyInput(), rng());
    expect(s.lives).toBe(lives - 1);
    expect(s.phase).toBe('intro');
    expect(s.p.form).toBe(0);
  });

  it('ends the game when the last life is lost', () => {
    const s = start();
    s.lives = 0;
    placePip(s, 4);
    s.enemies.forEach((e) => (e.active = false));
    walker(s, 4);
    simulate(spec, s, 3, emptyInput(), rng());
    expect(s.over).toBe(true);
    expect(s.won).toBe(false);
  });

  it('kicks a snail shell that knocks out other enemies', () => {
    const s = start(1); // Snail Trail
    s.enemies.forEach((e) => (e.active = false));
    placePip(s, 2);
    const snail = s.enemies.find((e) => e.kind === 'k')!;
    const bug = s.enemies.find((e) => e.kind === 'g' && e !== snail)!;
    snail.active = bug.active = true;
    snail.shell = 1;
    snail.timer = 7;
    snail.b.x = 4 * T;
    snail.b.y = 14 * T - 14;
    bug.b.x = 9 * T;
    bug.b.y = 14 * T - 14;
    s.p.x = snail.b.x - s.p.w + 1;
    update(s, 1 / 60, emptyInput(), rng());
    expect(snail.shell).toBe(2);
    simulate(spec, s, 0.6, emptyInput(), rng());
    expect(bug.alive).toBe(false);
  });
});

describe('pip quest — blocks and power-ups', () => {
  it('a lucky block gives an acorn that makes Pip big', () => {
    const s = start();
    s.enemies.forEach((e) => (e.active = false));
    const i = s.tiles.findIndex((v) => v === TILE.qpower);
    const c = i % s.lv.cols;
    const r = Math.floor(i / s.lv.cols);
    s.p.x = c * T + 2;
    s.p.y = (r + 1) * T + 1;
    s.p.vy = -300;
    s.p.ground = false;
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.tiles[i]).toBe(TILE.used);
    expect(s.items[0]?.kind).toBe('acorn');
    s.p.x = s.items[0].b.x;
    s.p.y = s.items[0].b.y;
    simulate(spec, s, 0.7, emptyInput(), rng());
    expect(s.p.form).toBe(1);
    expect(s.p.h).toBe(BIG);
  });

  it('big Pip breaks bricks; small Pip only bumps them', () => {
    for (const form of [0, 1] as const) {
      const s = start();
      s.enemies.forEach((e) => (e.active = false));
      const i = s.tiles.findIndex((v) => v === TILE.brick);
      const c = i % s.lv.cols;
      const r = Math.floor(i / s.lv.cols);
      s.p.form = form;
      s.p.h = form ? BIG : SMALL;
      s.p.x = c * T + 2;
      s.p.y = (r + 1) * T + 1;
      s.p.vy = -300;
      update(s, 1 / 60, emptyInput(), rng());
      expect(s.tiles[i]).toBe(form ? TILE.empty : TILE.brick);
    }
  });

  it('a hundred coins give an extra life', () => {
    const s = start();
    s.coinCount = 99;
    const lives = s.lives;
    const coin = s.coins[0];
    s.p.x = coin.x - 6;
    s.p.y = coin.y - 7;
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.coinCount).toBe(0);
    expect(s.lives).toBe(lives + 1);
  });
});

describe('pip quest — level flow', () => {
  it('reaching the flag pole tallies the clock and moves to the next level', () => {
    const s = start();
    s.enemies.forEach((e) => (e.active = false));
    const g = s.goal!;
    s.p.x = g.c * T - 5;
    s.p.y = g.top + 30;
    s.p.vx = 100;
    update(s, 1 / 60, inputWith(['right']), rng());
    expect(s.phase).toBe('flag');
    const before = s.score;
    simulate(spec, s, 12, emptyInput(), rng());
    expect(s.levelIndex).toBe(1);
    expect(s.score).toBeGreaterThan(before);
    expect(s.reached).toBe(1);
  });

  it('time running out costs a life', () => {
    const s = start();
    s.clock = 0.01;
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.phase).toBe('dying');
  });

  it('respawns at the checkpoint after losing a life', () => {
    const s = start();
    const ck = s.checks[0];
    placePip(s, ck.c + 1);
    s.enemies.forEach((e) => (e.active = false));
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.checkpoint?.c).toBe(ck.c);
    s.clock = 0.01;
    simulate(spec, s, 3, emptyInput(), rng());
    expect(Math.floor(s.p.x / T)).toBe(ck.c);
  });

  it('stomping the boss enough times clears the keep', () => {
    const s = start(PER_WORLD - 1);
    const boss = s.boss!;
    s.arenaLocked = true;
    boss.state = 'walk';
    let guard = 0;
    while (boss.hp > 0 && guard++ < 20) {
      boss.invuln = 0;
      boss.state = 'walk';
      s.p.x = boss.b.x + 10;
      s.p.y = boss.b.y - s.p.h - 2;
      s.p.vy = 200;
      s.p.invuln = 1;
      update(s, 1 / 60, emptyInput(), rng());
    }
    expect(boss.hp).toBeLessThanOrEqual(0);
    expect(s.phase).toBe('boss-down');
    simulate(spec, s, 12, emptyInput(), rng());
    expect(s.levelIndex).toBe(PER_WORLD);
    expect(s.stats.bosses).toBe(1);
  });

  it('beating the last boss wins the game', () => {
    const s = start(LEVEL_COUNT - 1);
    loadLevel(s, LEVEL_COUNT - 1);
    s.phase = 'tally';
    s.clock = 0;
    s.phaseT = 0;
    simulate(spec, s, 2, emptyInput(), rng());
    expect(s.over).toBe(true);
    expect(s.won).toBe(true);
  });
});
