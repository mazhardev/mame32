import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { ARENA, SEG, create, leaderboard, player, radiusOf, segmentsOf, step, update } from './engine';
import type { Snake, State } from './engine';

const run = (s: State, secs: number) => {
  for (let t = 0; t < secs && !s.over; t += 1 / 60) step(s, 1 / 60);
};

/** Runs the arena on its own, ignoring that the (parked) player is out. */
const runArena = (s: State, secs: number) => {
  for (let t = 0; t < secs; t += 1 / 60) step(s, 1 / 60);
};

/** An empty arena with just the player. */
function alone(): State {
  const s = create('normal', 5);
  s.snakes = [player(s)];
  s.food = [];
  s.respawn = [];
  return s;
}

/** A still snake laid out in a straight line, head first. */
function wall(s: State, x: number, y: number, dx: number, dy: number, n: number, mass = 40): Snake {
  const o: Snake = {
    id: 99,
    name: 'Blocker',
    hue: 0,
    pts: Array.from({ length: n }, (_, i) => ({ x: x + dx * i * SEG, y: y + dy * i * SEG })),
    angle: Math.atan2(-dy, -dx),
    want: Math.atan2(-dy, -dx),
    mass,
    boosting: false,
    alive: true,
    bot: true,
    think: 1e9,
    kills: 0,
    dropT: 0,
  };
  s.snakes.push(o);
  return o;
}

describe('snakes', () => {
  it('eating pellets makes a snake longer', () => {
    const s = alone();
    const p = player(s);
    p.angle = p.want = 0;
    const len0 = p.pts.length;
    for (let i = 1; i <= 20; i++) s.food.push({ x: p.pts[0].x + i * 8, y: p.pts[0].y, v: 2, hue: 0, t: 0 });
    run(s, 2.5);
    expect(s.stats.eaten).toBe(20);
    expect(p.mass).toBeGreaterThan(55);
    expect(p.pts.length).toBeGreaterThan(len0);
    expect(p.pts.length).toBe(segmentsOf(p));
    expect(radiusOf(p)).toBeGreaterThan(radiusOf({ ...p, mass: 20 }));
  });

  it('boosting is faster but sheds length as pellets', () => {
    const a = alone();
    const b = alone();
    for (const s of [a, b]) {
      player(s).mass = 80;
      player(s).angle = player(s).want = 0;
    }
    player(b).boosting = true;
    run(a, 1);
    for (let t = 0; t < 1; t += 1 / 60) {
      player(b).boosting = true;
      step(b, 1 / 60);
    }
    expect(player(b).pts[0].x).toBeGreaterThan(player(a).pts[0].x * 1.6);
    expect(player(b).mass).toBeLessThan(80);
    expect(b.food.length).toBeGreaterThan(3);
  });

  it('turns toward where it wants to go, more slowly when big', () => {
    const small = alone();
    const big = alone();
    player(big).mass = 600;
    for (const s of [small, big]) {
      player(s).angle = 0;
      player(s).want = Math.PI / 2;
    }
    run(small, 0.2);
    run(big, 0.2);
    expect(player(small).angle).toBeGreaterThan(player(big).angle);
  });
});

describe('crashes', () => {
  it('a head that hits another snake’s body bursts into pellets, and the other gets the knock-out', () => {
    const s = alone();
    const p = player(s);
    p.angle = p.want = 0;
    const h = p.pts[0];
    const blocker = wall(s, h.x + 60, h.y - 80, 0, 1, 30);
    run(s, 2);
    expect(p.alive).toBe(false);
    expect(blocker.kills).toBe(1);
    expect(s.killer).toBe('Blocker');
    expect(s.food.length).toBeGreaterThan(5);
    run(s, 2);
    expect(s.over).toBe(true);
  });

  it('the player knocks out a bot that runs into them', () => {
    const s = alone();
    const p = player(s);
    p.mass = 60;
    p.angle = p.want = 0;
    for (let i = 0; i < p.pts.length; i++) p.pts[i] = { x: -i * SEG, y: 0 };
    const bot = wall(s, -40, -60, 0, -1, 12, 20);
    bot.angle = bot.want = Math.PI / 2;
    run(s, 1.5);
    expect(bot.alive).toBe(false);
    expect(s.stats.kills).toBe(1);
    expect(p.alive).toBe(true);
  });

  it('touching the arena wall ends the run', () => {
    const s = alone();
    const p = player(s);
    for (const q of p.pts) q.x += ARENA - 60;
    p.angle = p.want = 0;
    run(s, 2);
    expect(p.alive).toBe(false);
    expect(s.killer).toBe('the wall');
  });
});

describe('the arena', () => {
  it('computer snakes forage, grow, crash and come back', () => {
    const s = create('normal', 9);
    player(s).alive = false;
    player(s).pts = [{ x: 1e6, y: 1e6 }];
    const start = Math.max(...s.snakes.filter((o) => o.bot).map((o) => o.mass));
    const firstIds = new Set(s.snakes.map((o) => o.id));
    runArena(s, 120);
    expect(s.snakes.some((o) => !firstIds.has(o.id))).toBe(true);
    const bots = s.snakes.filter((o) => o.bot && o.alive);
    expect(bots.length).toBeGreaterThanOrEqual(s.skill.bots - 3);
    expect(Math.max(...bots.map((o) => o.mass))).toBeGreaterThan(start);
    expect(s.food.length).toBeGreaterThan(500);
  });

  it('bots steer away from bodies in front of them', () => {
    const s = alone();
    const p = player(s);
    p.pts = [{ x: 1e6, y: 1e6 }];
    p.alive = false;
    s.over = false;
    const bot = wall(s, 0, 0, -1, 0, 10, 20);
    bot.think = 0;
    bot.angle = bot.want = 0;
    wall(s, 90, -100, 0, 1, 40);
    let survived = 0;
    for (let k = 0; k < 4; k++) {
      runArena(s, 1);
      if (bot.alive) survived++;
    }
    expect(Math.abs(bot.angle)).toBeGreaterThan(0.3);
    expect(survived).toBe(4);
  });

  it('more and sharper snakes on harder difficulties', () => {
    expect(create('hard').snakes.length).toBeGreaterThan(create('easy').snakes.length);
    expect(create('hard').skill.react).toBeLessThan(create('easy').skill.react);
  });

  it('the leaderboard ranks snakes by length', () => {
    const s = create('normal', 2);
    const lb = leaderboard(s);
    for (let i = 1; i < lb.length; i++) expect(lb[i - 1].mass).toBeGreaterThanOrEqual(lb[i].mass);
  });
});

describe('controls', () => {
  it('steers toward the pointer and boosts while the mouse is held', () => {
    const s = alone();
    const p = player(s);
    update(s, 1 / 60, inputWith([], [], { x: 240, y: 300, active: true, down: true, type: 'mouse' }));
    expect(p.want).toBeCloseTo(Math.PI / 2, 1);
    expect(p.boosting).toBe(true);
    update(s, 1 / 60, inputWith([], [], { x: 240, y: 300, active: true, down: true, type: 'touch' }));
    expect(p.boosting).toBe(false);
    const two = inputWith([], [], { x: 240, y: 300, active: true, down: true, type: 'touch' });
    two.touches = [
      { id: 1, x: 240, y: 300 },
      { id: 2, x: 20, y: 20 },
    ];
    update(s, 1 / 60, two);
    expect(p.boosting).toBe(true);
    update(s, 1 / 60, inputWith(['action']));
    expect(p.boosting).toBe(true);
    update(s, 1 / 60, emptyInput());
  });
});
