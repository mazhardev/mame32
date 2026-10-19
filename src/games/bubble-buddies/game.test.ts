import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { AH, AT, buildArena } from '../_shared/platform/arena';
import { EMPTY, SOLID, cellAt } from '../_shared/platform/tiles';
import { create, update } from './game';
import type { Bubble, Enemy, State } from './game';
import { BOSS_STAGES, LAYOUTS, STAGES, stagePlan } from './stages';

const rng = () => createRng('bubble').next;
const spec = { update };

function start(stage = 0): State {
  const s = create('normal', rng(), stage);
  s.phase = 'play';
  s.enemies.forEach((e) => (e.state = 'free'));
  return s;
}

function oneEnemy(s: State, dx = 24): Enemy {
  const e = s.enemies[0];
  s.enemies = [e];
  e.kind = 'windup';
  e.w.b.x = s.p.x + dx;
  e.w.b.y = 13 * AT - 14;
  e.w.b.vy = 0;
  e.state = 'free';
  return e;
}

function bubbleAt(x: number, y: number, extra: Partial<Bubble> = {}): Bubble {
  return { x, y, vx: 0, vy: 0, shot: 0, life: 9, kind: 'plain', letter: 0, enemy: null, wobble: 0, popped: false, age: 1, ...extra };
}

describe('bubble buddies — bubbles', () => {
  it('a blown bubble traps a monster, and popping it turns the monster into fruit', () => {
    const s = start();
    s.p.invuln = 99;
    s.p.facing = 1;
    const e = oneEnemy(s);
    e.w.dir = 0;
    update(s, 1 / 60, inputWith([], ['action2']), rng());
    simulate(spec, s, 0.3, emptyInput(), rng());
    expect(e.state).toBe('trapped');
    const b = s.bubbles.find((x) => x.enemy === e)!;
    simulate(spec, s, 0.3, emptyInput(), rng());
    s.p.x = b.x - 6;
    s.p.y = b.y - 7;
    update(s, 1 / 60, emptyInput(), rng());
    expect(e.state).toBe('dead');
    expect(s.fruits).toHaveLength(1);
    expect(s.score).toBeGreaterThanOrEqual(1000);
  });

  it('popping one bubble pops the whole touching chain with a doubling bonus', () => {
    const s = start();
    s.p.invuln = 99;
    const es = [0, 1, 2].map(() => ({ ...s.enemies[0], w: { ...s.enemies[0].w, b: { ...s.enemies[0].w.b } } }) as Enemy);
    s.enemies = es;
    es.forEach((e, i) => {
      e.state = 'trapped';
      e.timer = 9;
      s.bubbles.push(bubbleAt(100 + i * 15, 60, { enemy: e }));
    });
    s.p.x = 94;
    s.p.y = 53;
    update(s, 1 / 60, emptyInput(), rng());
    expect(es.every((e) => e.state === 'dead')).toBe(true);
    expect(s.stats.bestChain).toBe(3);
    expect(s.score).toBeGreaterThanOrEqual(1000 + 2000 + 4000);
  });

  it('a trapped monster breaks out angry if left too long', () => {
    const s = start();
    s.p.invuln = 99;
    s.p.x = 20;
    const e = oneEnemy(s, 100);
    e.state = 'trapped';
    e.timer = 0.5;
    s.bubbles.push(bubbleAt(200, 40, { enemy: e }));
    simulate(spec, s, 1, emptyInput(), rng());
    expect(e.state).toBe('free');
    expect(e.angry).toBe(true);
  });

  it('holding jump bounces Fizz off a bubble instead of popping it', () => {
    const s = start();
    s.enemies = [s.enemies[0]];
    s.enemies[0].w.b.x = 220;
    s.enemies[0].w.b.y = 20;
    const b = bubbleAt(60, 120);
    s.bubbles.push(b);
    s.p.x = 54;
    s.p.y = 120 - 8 - 13;
    s.p.vy = 150;
    update(s, 1 / 60, inputWith(['action']), rng());
    expect(b.popped).toBe(false);
    expect(s.p.vy).toBeLessThan(0);
  });

  it('collecting S-P-L-A-S-H gives an extra life', () => {
    const s = start();
    s.p.invuln = 99;
    s.letters = [true, true, true, true, true, false];
    const lives = s.lives;
    s.bubbles.push(bubbleAt(s.p.x + 6, s.p.y + 7, { kind: 'letter', letter: 5 }));
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.lives).toBe(lives + 1);
    expect(s.letters.every((x) => !x)).toBe(true);
  });

  it('dropping through the gap in the floor brings Fizz back in from the top', () => {
    const s = start();
    s.enemies = [];
    s.boss = null;
    s.phase = 'play';
    const gap = [...Array(16).keys()].find((c) => cellAt(s.grid, c, 13) === EMPTY)!;
    s.p.x = gap * AT + 2;
    s.p.y = 13 * AT;
    s.p.invuln = 99;
    s.enemies.push({ ...create('normal', rng(), 0).enemies[0], state: 'trapped' });
    simulate(spec, s, 0.25, emptyInput(), rng());
    expect(s.p.y).toBeLessThan(AH / 2);
  });
});

describe('bubble buddies — stages and bosses', () => {
  it('has 40 stages with bosses on 20 and 40', () => {
    expect(BOSS_STAGES).toEqual([19, 39]);
    for (let i = 0; i < STAGES; i++) {
      const p = stagePlan(i);
      expect(p.boss !== null).toBe(BOSS_STAGES.includes(i));
      if (p.boss === null) expect(p.enemies.length).toBeGreaterThanOrEqual(3);
    }
  });

  it.each(LAYOUTS.map((rows, i) => [i + 1, rows] as const))('layout %i: every spot can be reached', (_n, rows) => {
    expect(rows).toHaveLength(14);
    rows.forEach((r) => expect(r).toHaveLength(16));
    expect(unreachable(rows)).toEqual([]);
  });

  it.each([0, 1])('boss %i can be beaten with lightning bubbles', (k) => {
    const s = start(BOSS_STAGES[k]);
    const boss = s.boss!;
    const r = rng();
    let zaps = 0;
    while (!boss.dead && zaps < 60) {
      zaps++;
      s.p.invuln = 99;
      boss.invuln = 0;
      boss.b.x = 160;
      boss.b.y = 175;
      s.p.x = 60;
      s.p.y = 13 * AT - s.p.h;
      s.p.facing = 1;
      s.bubbles.push(bubbleAt(s.p.x + 6, s.p.y + 7, { kind: 'lightning' }));
      update(s, 1 / 60, emptyInput(), r);
      for (let f = 0; f < 60 && s.shots.some((x) => x.kind === 'bolt'); f++) {
        boss.b.x = 160;
        boss.b.y = 175;
        s.p.invuln = 99;
        update(s, 1 / 60, emptyInput(), r);
      }
    }
    expect(boss.dead).toBe(true);
    simulate(spec, s, 5, emptyInput(), r);
    expect(s.stage === BOSS_STAGES[k] + 1 || s.won).toBe(true);
  });
});

/**
 * Jump model as in Snow Rollers (3 rows up, through ledges but not blocks),
 * plus the wrap: stepping into a gap in the floor drops Fizz in at the top
 * of the same column.
 */
function unreachable(rows: string[]): string[] {
  const a = buildArena(rows, { wrapY: true });
  const g = a.grid;
  const spots: [number, number][] = [];
  for (let r = 0; r < 13; r++) {
    for (let c = 1; c < 15; c++) if (cellAt(g, c, r) === EMPTY && cellAt(g, c, r + 1) !== EMPTY) spots.push([c, r]);
  }
  // Falling in from the top, Fizz can steer a couple of columns either way.
  const land = (c: number, r: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let cc = Math.max(1, c - 2); cc <= Math.min(14, c + 2); cc++) {
      for (let k = 0; k < 14; k++) {
        const rr = r + k;
        if (cellAt(g, cc, rr) === EMPTY && cellAt(g, cc, rr + 1) !== EMPTY) {
          out.push([cc, rr]);
          break;
        }
      }
    }
    return out;
  };
  const clearUp = (c: number, from: number, to: number) => {
    for (let r = from - 1; r > to; r--) if (cellAt(g, c, r) === SOLID) return false;
    return true;
  };
  const seen = new Set([`${a.player.c},${a.player.r}`]);
  const queue: [number, number][] = [[a.player.c, a.player.r]];
  while (queue.length) {
    const [c, r] = queue.shift()!;
    const next: [number, number][] = [];
    for (const [c2, r2] of spots) {
      const dx = Math.abs(c2 - c);
      const rise = r - r2;
      if (rise > 0 ? rise <= 3 && dx <= 3 && (clearUp(c, r, r2) || clearUp(c2, r, r2)) : rise === 0 ? dx <= 4 : dx <= 5) next.push([c2, r2]);
    }
    // Walking off into a floor gap wraps round to the top.
    for (const dc of [-1, 1]) {
      if (cellAt(g, c + dc, 13) === EMPTY && r === 12) {
        next.push(...land(c + dc, 0));
      }
    }
    for (const [c2, r2] of next) {
      const key = `${c2},${r2}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push([c2, r2]);
    }
  }
  return spots.filter(([c, r]) => !seen.has(`${c},${r}`)).map(([c, r]) => `${c},${r}`);
}
