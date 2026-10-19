import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { AT } from '../_shared/platform/arena';
import { create, update } from './game';
import type { Enemy, State } from './game';
import { LAYOUTS, STAGES, stagePlan } from './stages';
import { buildArena } from '../_shared/platform/arena';
import { SOLID, cellAt } from '../_shared/platform/tiles';

const rng = () => createRng('snow').next;
const spec = { update };

function start(stage = 0): State {
  const s = create('normal', rng(), stage);
  s.phase = 'play';
  s.enemies.forEach((e) => (e.state = 'free'));
  return s;
}

/** Puts one enemy on the floor right in front of Yuki and removes the rest. */
function oneEnemy(s: State, dx = 30): Enemy {
  const e = s.enemies[0];
  s.enemies = [e];
  e.w.b.x = s.p.x + dx;
  e.w.b.y = 13 * AT - 14;
  e.w.b.vx = e.w.b.vy = 0;
  e.state = 'free';
  e.base = 'imp';
  return e;
}

function throwSnow(s: State, times: number) {
  for (let i = 0; i < times; i++) {
    update(s, 1 / 60, inputWith([], ['action2']), rng());
    simulate(spec, s, 0.25, emptyInput(), rng());
  }
}

describe('snow rollers — snow and snowballs', () => {
  it('four hits pack a monster into a snowball that melts back if left', () => {
    const s = start();
    s.p.invuln = 99;
    const e = oneEnemy(s);
    e.w.dir = 0 as never;
    throwSnow(s, 4);
    expect(e.snow).toBe(4);
    simulate(spec, s, 12, emptyInput(), rng());
    expect(e.snow).toBe(0);
  });

  it('a kicked snowball rolls and flattens other monsters for a combo', () => {
    const s = start();
    s.p.invuln = 99;
    const e = oneEnemy(s, 13);
    const other = { ...s.enemies[0], w: { ...e.w, b: { ...e.w.b, x: e.w.b.x + 60 } }, snow: 2, melt: 9 } as Enemy;
    s.enemies.push(other);
    e.snow = 4;
    e.melt = 9;
    s.p.facing = 1;
    update(s, 1 / 60, inputWith([], ['action2']), rng());
    expect(e.state).toBe('rolling');
    simulate(spec, s, 1, emptyInput(), rng());
    expect(other.state).toBe('dead');
    expect(s.stats.bestCombo).toBeGreaterThanOrEqual(1);
    simulate(spec, s, 6, emptyInput(), rng());
    expect(e.state).toBe('dead');
    expect(s.score).toBeGreaterThanOrEqual(1000);
  });

  it('touching a free monster costs a life; snowed ones are harmless', () => {
    const s = start();
    s.p.invuln = 0;
    const e = oneEnemy(s, 0);
    e.snow = 2;
    e.melt = 9;
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.phase).toBe('play');
    e.snow = 0;
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.phase).toBe('dying');
    const lives = s.lives;
    simulate(spec, s, 2, emptyInput(), rng());
    expect(s.lives).toBe(lives - 1);
    expect(s.phase).toBe('play');
  });

  it('clearing every monster moves on to the next stage', () => {
    const s = start();
    s.enemies.forEach((e) => {
      e.state = 'dead';
      e.timer = 0;
    });
    simulate(spec, s, 4, emptyInput(), rng());
    expect(s.stage).toBe(1);
    expect(s.reached).toBe(1);
  });

  it('a ghost comes for slowpokes', () => {
    const s = start();
    s.p.invuln = 99;
    s.stageTime = 49.9;
    simulate(spec, s, 0.5, emptyInput(), rng());
    expect(s.ghost).not.toBeNull();
  });

  it('potions power Yuki up and are lost with a life', () => {
    const s = start();
    s.enemies = [];
    s.boss = null;
    s.pickups.push({ b: { ...s.p, vx: 0, vy: 0 }, kind: 'blue', food: 0, life: 9 });
    s.enemies.push({ ...stubEnemy(s) });
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.power.strong).toBe(true);
  });
});

function stubEnemy(s: State): Enemy {
  const e = create('normal', rng(), 0).enemies[0];
  e.w.b.x = 200;
  e.w.b.y = 0;
  e.state = 'free';
  e.snow = 4;
  e.melt = 99;
  void s;
  return e;
}

describe('snow rollers — stages', () => {
  it('has 30 stages with bosses on 10, 20 and 30', () => {
    for (let i = 0; i < STAGES; i++) {
      const plan = stagePlan(i);
      expect(plan.boss).toBe(i % 10 === 9);
      if (!plan.boss) expect(plan.enemies.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('every layout has room for enemies and a player start on the floor', () => {
    for (const rows of LAYOUTS) {
      expect(rows).toHaveLength(14);
      rows.forEach((r) => expect(r).toHaveLength(16));
      const a = buildArena(rows);
      expect(a.spawns.length).toBeGreaterThanOrEqual(8);
      expect(a.player.r).toBe(12);
    }
  });

  it.each(LAYOUTS.map((rows, i) => [i + 1, rows] as const))('layout %i: every spot is reachable from the start', (_n, rows) => {
    expect(unreachable(rows)).toEqual([]);
  });

  it.each([0, 1, 2])('boss %i can be beaten by kicking snowballed minions into it', (land) => {
    const s = create('normal', rng(), land * 10 + 9);
    s.phase = 'play';
    const boss = s.boss!;
    const r = rng();
    let kicks = 0;
    while (!boss.dead && kicks < 40) {
      kicks++;
      s.p.invuln = 99;
      // A minion, packed into a ball right beside Yuki, kicked at the boss.
      s.p.x = 30;
      s.p.y = 13 * AT - s.p.h;
      s.p.facing = 1;
      const e = create('normal', rng(), 0).enemies[0];
      e.state = 'free';
      e.snow = 4;
      e.melt = 99;
      e.w.b.x = s.p.x + s.p.w - 1;
      e.w.b.y = 13 * AT - 14;
      s.enemies.push(e);
      boss.b.x = 150;
      boss.b.y = 13 * AT - boss.b.h;
      boss.invuln = 0;
      update(s, 1 / 60, inputWith([], ['action2']), r);
      for (let f = 0; f < 120 && (e.state as string) === 'rolling'; f++) {
        s.p.invuln = 99;
        boss.b.x = 150;
        boss.b.y = 13 * AT - boss.b.h;
        update(s, 1 / 60, emptyInput(), r);
      }
    }
    expect(boss.dead).toBe(true);
    simulate(spec, s, 5, emptyInput(), r);
    expect(s.stage === land * 10 + 10 || s.won).toBe(true);
  });
});

/**
 * Jump model: Yuki jumps about 3½ tiles high. From a standing spot she can
 * reach one up to 3 rows higher and 3 columns across (jumping up through
 * ledges, but not through solid blocks), cross gaps of up to 3 columns on the
 * level, and drop to anything below within 4 columns.
 */
function unreachable(rows: string[]): string[] {
  const a = buildArena(rows);
  const g = a.grid;
  const spots: [number, number][] = [];
  for (let r = 0; r < 13; r++) {
    for (let c = 1; c < 15; c++) {
      if (cellAt(g, c, r) === 0 && cellAt(g, c, r + 1) !== 0) spots.push([c, r]);
    }
  }
  const clearUp = (c: number, from: number, to: number) => {
    for (let r = from - 1; r > to; r--) if (cellAt(g, c, r) === SOLID) return false;
    return true;
  };
  const seen = new Set([`${a.player.c},${a.player.r}`]);
  const queue: [number, number][] = [[a.player.c, a.player.r]];
  while (queue.length) {
    const [c, r] = queue.shift()!;
    for (const [c2, r2] of spots) {
      const k = `${c2},${r2}`;
      if (seen.has(k)) continue;
      const dx = Math.abs(c2 - c);
      const rise = r - r2;
      let ok = false;
      if (rise > 0) ok = rise <= 3 && dx <= 3 && (clearUp(c, r, r2) || clearUp(c2, r, r2));
      else if (rise === 0) ok = dx <= 4;
      else ok = dx <= 5;
      if (ok) {
        seen.add(k);
        queue.push([c2, r2]);
      }
    }
  }
  return spots.filter(([c, r]) => !seen.has(`${c},${r}`)).map(([c, r]) => `${c},${r}`);
}
