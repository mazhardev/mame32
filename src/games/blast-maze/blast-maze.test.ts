import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { dangerMap, escape } from './ai';
import { create, update } from './game';
import { COLS, FLOOR, ROWS, SOFT, T, WALL, baseGrid, blast, distances, idx, mid, slide, tileX } from './maze';
import { ITEM_KINDS, PER_AREA, STAGES, buildBattle, buildStage, stagePlan } from './stages';
import type { State } from './world';

const rng = (seed = 'blast') => createRng(seed).next;
const spec = { update };

/** A stage in play with nothing in it but the player. */
function emptyStage(): State {
  const s = create('normal', rng(), 'adventure', 0);
  s.phase = 'play';
  s.enemies = [];
  s.grid = baseGrid();
  s.hidden.fill(-1);
  return s;
}

describe('blast maze — movement and blasts', () => {
  it('moves along lanes and eases round corners', () => {
    const g = baseGrid();
    const blocked = (c: number, r: number) => g[idx(c, r)] !== FLOOR;
    const p = { x: mid(1), y: mid(1) };
    expect(slide(p, 0, 1, 10, blocked)).toBe(true);
    expect(p.y).toBeCloseTo(mid(1) + 10);
    // Slightly off the lane, a sideways move eases back into it first.
    const q = { x: mid(1), y: mid(1) + 4 };
    expect(slide(q, 1, 0, 3, blocked)).toBe(true);
    expect(q.y).toBeCloseTo(mid(1) + 1);
    // Pillars block: no moving right from (1, 2).
    const w = { x: mid(1), y: mid(2) };
    slide(w, 1, 0, 10, blocked);
    expect(w.x).toBe(mid(1));
  });

  it('blasts stop at walls, burn the first block and reach other bombs', () => {
    const g = baseGrid();
    g[idx(3, 1)] = SOFT;
    const tiles = blast(g, 1, 1, 3, (c, r) => c === 1 && r === 3);
    const at = (c: number, r: number) => tiles.find((t) => t.c === c && t.r === r);
    expect(at(1, 1)?.dir).toBe(-1);
    expect(at(2, 1)).toBeTruthy();
    expect(at(3, 1)?.end).toBe(true);
    expect(at(4, 1)).toBeUndefined();
    expect(at(1, 0)).toBeUndefined();
    expect(at(1, 3)?.end).toBe(true);
    expect(at(1, 4)).toBeUndefined();
  });

  it('every open tile of the empty maze is connected', () => {
    const g = baseGrid();
    const d = distances(1, 1, (c, r) => g[idx(c, r)] === WALL);
    for (let i = 0; i < COLS * ROWS; i++) if (g[i] === FLOOR) expect(d[i]).toBeGreaterThanOrEqual(0);
  });
});

describe('blast maze — bombs, blocks and monsters', () => {
  it('a bomb explodes after its fuse and breaks the block next to it, revealing a power-up', () => {
    const s = emptyStage();
    s.grid[idx(3, 1)] = SOFT;
    s.hidden[idx(3, 1)] = ITEM_KINDS.indexOf('fire');
    s.bombers[0].x = mid(2);
    update(s, 1 / 60, inputWith([], ['action']), rng());
    expect(s.bombs).toHaveLength(1);
    // Walk away down the left side.
    simulate(spec, s, 0.4, inputWith(['left']), rng());
    simulate(spec, s, 0.6, inputWith(['down']), rng());
    simulate(spec, s, 2, emptyInput(), rng());
    expect(s.bombers[0].alive).toBe(true);
    expect(s.grid[idx(3, 1)]).toBe(FLOOR);
    expect(s.drops.map((d) => d.kind)).toEqual(['fire']);
  });

  it('you can step off your own bomb but not back onto it', () => {
    const s = emptyStage();
    update(s, 1 / 60, inputWith([], ['action']), rng());
    simulate(spec, s, 0.3, inputWith(['right']), rng());
    expect(tileX(s.bombers[0].x)).toBe(2);
    simulate(spec, s, 0.5, inputWith(['left']), rng());
    expect(s.bombers[0].x).toBe(mid(2));
  });

  it('standing in your own blast costs a life', () => {
    const s = emptyStage();
    const lives = s.lives;
    update(s, 1 / 60, inputWith([], ['action']), rng());
    simulate(spec, s, 3, emptyInput(), rng());
    expect(s.bombers[0].alive).toBe(false);
    simulate(spec, s, 3, emptyInput(), rng());
    expect(s.lives).toBe(lives - 1);
  });

  it('one blast catching two monsters scores the second double', () => {
    const s = emptyStage();
    s.bombers[0].fire = 4;
    s.bombers[0].x = mid(1);
    s.bombers[0].y = mid(3);
    s.enemies = [
      { kind: 'puffle', x: mid(4), y: mid(3), tc: 4, tr: 3, dir: 1, alive: true, deadT: 0, anim: 0 },
      { kind: 'puffle', x: mid(5), y: mid(3), tc: 5, tr: 3, dir: 1, alive: true, deadT: 0, anim: 0 },
    ];
    // Keep them still for the test.
    s.grid[idx(6, 3)] = WALL;
    s.grid[idx(3, 3)] = FLOOR;
    update(s, 1 / 60, inputWith([], ['action']), rng());
    s.bombs[0].t = 0.01;
    s.bombers[0].vest = 5;
    const before = s.score;
    update(s, 1 / 60, emptyInput(), rng());
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.enemies.every((e) => !e.alive)).toBe(true);
    expect(s.score - before).toBeGreaterThanOrEqual(100 + 200);
    expect(s.stats.bestChain).toBe(2);
  });

  it('chain reactions set off nearby bombs', () => {
    const s = emptyStage();
    s.bombers[0].bombs = 2;
    s.bombers[0].fire = 2;
    s.bombers[0].vest = 9;
    update(s, 1 / 60, inputWith([], ['action']), rng());
    simulate(spec, s, 0.35, inputWith(['right']), rng());
    update(s, 1 / 60, inputWith([], ['action']), rng());
    expect(s.bombs).toHaveLength(2);
    s.bombs[0].t = 0.01;
    simulate(spec, s, 0.2, emptyInput(), rng());
    expect(s.bombs).toHaveLength(0);
  });

  it('kicked bombs slide until they hit something', () => {
    const s = emptyStage();
    s.bombers[0].kick = true;
    s.bombs.push({ c: 3, r: 1, x: mid(3), y: mid(1), t: 2, fire: 1, owner: -1, remote: false, pass: [], kick: -1 });
    s.bombers[0].x = mid(2);
    simulate(spec, s, 0.3, inputWith(['right']), rng());
    simulate(spec, s, 1, emptyInput(), rng());
    expect(s.bombs[0]?.c ?? 99).toBeGreaterThan(5);
  });

  it('remote bombs wait for the detonator', () => {
    const s = emptyStage();
    s.bombers[0].remote = true;
    s.bombers[0].vest = 9;
    update(s, 1 / 60, inputWith([], ['action']), rng());
    simulate(spec, s, 5, emptyInput(), rng());
    expect(s.bombs).toHaveLength(1);
    update(s, 1 / 60, inputWith([], ['action2']), rng());
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.bombs).toHaveLength(0);
  });

  it('the exit opens once the monsters are gone and leads to the next stage', () => {
    const s = create('normal', rng(), 'adventure', 0);
    s.phase = 'play';
    s.enemies = [];
    s.exit!.revealed = true;
    const ex = s.exit!.i;
    s.grid[ex] = FLOOR;
    s.bombers[0].x = mid(ex % COLS);
    s.bombers[0].y = mid(Math.floor(ex / COLS));
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.exit!.open).toBe(true);
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.phase).toBe('clear');
    simulate(spec, s, 8, emptyInput(), rng());
    expect(s.stage).toBe(1);
    expect(s.reached).toBe(1);
  });

  it('touching a monster costs a life; the vest protects you', () => {
    const s = emptyStage();
    s.enemies = [{ kind: 'puffle', x: mid(1) + 4, y: mid(1), tc: 1, tr: 1, dir: 1, alive: true, deadT: 0, anim: 0 }];
    s.bombers[0].vest = 3;
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.bombers[0].alive).toBe(true);
    s.bombers[0].vest = 0;
    update(s, 1 / 60, emptyInput(), rng());
    expect(s.bombers[0].alive).toBe(false);
  });

  it('bosses fall to repeated blasts and leave the exit behind', () => {
    const s = create('normal', rng(), 'adventure', PER_AREA - 1);
    s.phase = 'play';
    const boss = s.boss!;
    s.bombers[0].vest = 999;
    for (let k = 0; k < 40 && boss.alive; k++) {
      boss.invuln = 0;
      boss.x = mid(5);
      boss.y = mid(5);
      s.flames.push({ c: 5, r: 5, t: 0.5, dir: -1, end: false, owner: 0, boom: 99 + k });
      update(s, 1 / 60, emptyInput(), rng());
    }
    expect(boss.alive).toBe(false);
    s.enemies = [];
    simulate(spec, s, 3, emptyInput(), rng());
    expect(s.exit!.open).toBe(true);
  });
});

describe('blast maze — stages', () => {
  it('has 40 stages with a boss every eighth', () => {
    expect(STAGES).toBe(40);
    for (let i = 0; i < STAGES; i++) expect(stagePlan(i).boss !== null).toBe(i % PER_AREA === PER_AREA - 1);
  });

  it.each(Array.from({ length: STAGES }, (_, i) => [i + 1, i] as const))('stage %i is fair', (_n, i) => {
    const plan = stagePlan(i);
    const L = buildStage(plan);
    // The start corner is clear and you can step out of it.
    for (const [c, r] of [[1, 1], [2, 1], [1, 2]]) expect(L.grid[idx(c, r)]).toBe(FLOOR);
    // Monsters start well away from you, on open floor.
    for (const e of L.enemies) {
      expect(L.grid[idx(e.c, e.r)]).toBe(FLOOR);
      expect(e.c - 1 + (e.r - 1)).toBeGreaterThanOrEqual(7);
    }
    if (plan.boss === null) {
      expect(L.enemies.length).toBe(plan.enemies.length);
      expect(L.grid[L.exit]).toBe(SOFT);
      if (plan.item) expect([...L.hidden].filter((h) => h >= 0)).toHaveLength(1);
    }
  });

  it('battle arenas keep every corner clear', () => {
    const g = buildBattle(rng()).grid;
    for (const [c, r] of [[1, 1], [13, 11], [13, 1], [1, 11]]) expect(g[idx(c, r)]).toBe(FLOOR);
  });
});

describe('blast maze — computer bombers', () => {
  it('sees danger coming and runs from it', () => {
    const s = create('hard', rng(), 'battle');
    s.phase = 'play';
    const bot = s.bombers[2];
    s.bombs.push({ c: tileX(bot.x), r: tileX(bot.y), x: bot.x, y: bot.y, t: 1.5, fire: 1, owner: 1, remote: false, pass: [bot.id], kick: -1 });
    // Boxed into its corner, it is trapped…
    s.grid[idx(11, 1)] = SOFT;
    s.grid[idx(13, 3)] = SOFT;
    expect(escape(s, bot, dangerMap(s), 0.1)).toBe(-1);
    // …but with a way out it takes it.
    s.grid[idx(11, 1)] = FLOOR;
    const m = dangerMap(s);
    expect(m.danger[idx(tileX(bot.x), tileX(bot.y))]).toBeCloseTo(1.5);
    expect(escape(s, bot, m, 0.1)).toBe(3);
  });

  it('bots rarely blow themselves up, and matches always finish', () => {
    let selfKills = 0;
    let deaths = 0;
    for (const seed of ['x', 'y', 'z']) {
      const r = rng(seed);
      const s = create('hard', r, 'battle');
      s.bombers[0].cpu = true;
      for (let t = 0; t < 60 * 60 * 10 && !s.over; t++) {
        const alive = s.bombers.map((b) => b.alive);
        update(s, 1 / 60, emptyInput(), r);
        s.bombers.forEach((b, i) => {
          if (alive[i] && !b.alive && s.clock > 0) {
            deaths++;
            const own = s.flames.filter((f) => f.c === tileX(b.x) && f.r === tileX(b.y));
            if (own.length && own.every((f) => f.owner === b.id)) selfKills++;
          }
        });
      }
      expect(s.over).toBe(true);
      expect(s.bombers.some((b) => b.wins >= 3)).toBe(true);
    }
    expect(deaths).toBeGreaterThan(10);
    expect(selfKills / deaths).toBeLessThan(0.2);
  });

  it('a human in battle can still play while the bots run around', () => {
    const s = create('normal', rng(), 'battle');
    simulate(spec, s, 2, emptyInput(), rng());
    expect(s.phase).toBe('play');
    const x = s.bombers[0].x;
    simulate(spec, s, 0.3, inputWith(['right']), rng());
    expect(s.bombers[0].x).toBeGreaterThan(x);
    expect(T).toBe(16);
  });
});
