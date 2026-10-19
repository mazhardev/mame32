import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import type { Input } from '../_shared/arcade/kit';
import { allStandable, reachableCells, standable } from '../_shared/arena/stage';
import { H, T } from '../_shared/arena/stage';
import { BUBBLE, DIFF, chainScore, create, newCritter, update } from './game';
import type { Hooks } from './game';
import { HERO_START, LEVEL_COUNT, isBossLevel, levelStage } from './stages';
import type { Bubble, Critter, CritterKind, State } from './types';

const DT = 1 / 60;
const rng = createRng('bay').next;

function run(s: State, seconds: number, input: () => Input = emptyInput, hooks: Hooks = {}) {
  for (let t = 0; t < seconds; t += DT) {
    if (s.over) return;
    s.time += DT;
    update(s, DT, input(), rng, hooks);
    s.events.length = 0;
  }
}

/** A level with only the given critters, in play. */
function arena(level = 0, critters: Critter[] = []): State {
  const s = create('normal', level);
  s.phase = 'play';
  s.phaseTime = 0;
  s.critters = critters;
  return s;
}

function liveCritter(kind: CritterKind, col: number, row = 13): Critter {
  const c = newCritter(kind, col, row, 0);
  c.state = 'live';
  return c;
}

const bubble = (x: number, y: number, state: Bubble['state'] = 'float', critter: Critter | null = null): Bubble => ({
  x,
  y,
  r: critter ? 10 : 8,
  vx: 0,
  vy: 0,
  state,
  age: state === 'shoot' ? 0 : 1,
  life: 7,
  critter,
  popDelay: 0,
  chainId: 0,
  wob: 0,
});

function trapped(s: State, c: Critter, x: number, y: number): Bubble {
  c.state = 'trapped';
  const b = bubble(x, y, 'float', c);
  s.bubbles.push(b);
  return b;
}

describe('bubble bay levels', () => {
  it('has 30 wrap-around levels with a boss every tenth', () => {
    expect(LEVEL_COUNT).toBe(30);
    expect([9, 19, 29].every(isBossLevel)).toBe(true);
    expect(isBossLevel(4)).toBe(false);
    for (let i = 0; i < LEVEL_COUNT; i++) expect(levelStage(i).wrap).toBe(true);
  });

  it('every ledge of every level can be reached, and critters start on solid footing away from Ollie', () => {
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const st = levelStage(i);
      const reach = reachableCells(st, HERO_START);
      for (const [c, r] of allStandable(st)) expect(reach.has(`${c},${r}`), `level ${i + 1}: ${c},${r}`).toBe(true);
      for (const sp of st.spawns) {
        // Jellyfish swim, so they may start in open water.
        if (sp.glyph !== 'j') expect(standable(st, sp.col, sp.row), `level ${i + 1} spawn ${sp.col},${sp.row}`).toBe(true);
        if (sp.row >= 11) expect(Math.abs(sp.col - HERO_START[0]), `level ${i + 1} spawn ${sp.col},${sp.row}`).toBeGreaterThanOrEqual(3);
      }
      if (isBossLevel(i)) expect(st.spawns.length).toBe(0);
      else expect(st.spawns.length).toBeGreaterThan(0);
    }
  });
});

describe('bubble bay rules', () => {
  it('introduces the level, then the critters swim in and start moving', () => {
    const s = create('normal', 0);
    expect(s.phase).toBe('intro');
    expect(s.critters.length).toBe(4);
    run(s, 1.6);
    expect(s.phase).toBe('play');
    run(s, 1);
    expect(s.critters.every((c) => c.state === 'live')).toBe(true);
  });

  it('a freshly blown bubble traps a critter, which breaks out angry if left too long', () => {
    const c = liveCritter('crab', 6);
    const s = arena(0, [c]);
    s.hero.facing = 1;
    run(s, DT, () => inputWith([], ['action2']));
    run(s, 0.3);
    expect(c.state).toBe('trapped');
    const b = s.bubbles.find((bb) => bb.critter === c);
    expect(b).toBeDefined();
    // It floats up towards the surface…
    run(s, 3);
    expect(b!.y).toBeLessThan(120);
    // …and eventually breaks out.
    run(s, DIFF.normal.trap);
    expect(c.state).toBe('live');
    expect(c.angry).toBe(true);
    expect(s.bubbles.includes(b!)).toBe(false);
  });

  it('only a fresh bubble traps: a floating one passes harmlessly', () => {
    const c = liveCritter('crab', 9, 4);
    const s = arena(0, [c]);
    s.invuln = 100;
    s.bubbles.push(bubble(c.x + 7, c.y + 7));
    run(s, DT);
    expect(c.state).toBe('live');
  });

  it('popping a trapped critter scores 1,000 and it lands as treasure; the level then clears', () => {
    const c = newCritter('crab', 10, 5, 0);
    const s = arena(0, [c]);
    trapped(s, c, s.hero.x + 7, s.hero.y + 7);
    run(s, DT);
    expect(c.state).toBe('out');
    expect(s.score).toBe(1000);
    expect(s.stats.bestChain).toBe(1);
    run(s, 1.2);
    expect(s.critters.length).toBe(0);
    expect(s.loot.length + s.stats.treasures).toBeGreaterThan(0);
    expect(s.phase).toBe('clear');
  });

  it('bubbles touching a popped bubble pop too, doubling the score for each critter', () => {
    expect([1, 2, 3, 4, 7, 9].map(chainScore)).toEqual([1000, 2000, 4000, 8000, 64000, 64000]);
    const cs = [0, 1, 2].map(() => newCritter('crab', 10, 5, 0));
    const s = arena(0, cs);
    const x0 = s.hero.x + 7;
    const y0 = s.hero.y + 7;
    cs.forEach((c, k) => trapped(s, c, x0 + k * 19, y0));
    run(s, 0.3);
    expect(cs.every((c) => c.state === 'out')).toBe(true);
    expect(s.stats.bestChain).toBe(3);
    expect(s.score).toBe(1000 + 2000 + 4000);
  });

  it('holding jump bounces Ollie off a bubble; otherwise he pops it', () => {
    for (const hold of [true, false]) {
      const s = arena(0, [liveCritter('crab', 16, 4)]);
      s.invuln = 100;
      const b = bubble(8 * T + 8, 100);
      s.bubbles.push(b);
      s.hero.x = 8 * T + 1;
      s.hero.y = b.y - b.r - s.hero.h - 6;
      s.hero.vy = 120;
      s.hero.onGround = false;
      run(s, 0.1, () => inputWith(hold ? ['action'] : []));
      if (hold) {
        expect(s.bubbles.includes(b)).toBe(true);
        expect(s.hero.vy).toBeLessThan(0);
        expect(s.stats.bounces).toBe(1);
      } else {
        expect(s.bubbles.includes(b)).toBe(false);
        expect(s.stats.bounces).toBe(0);
        expect(s.score).toBe(10);
      }
    }
  });

  it('empty bubbles float up to the surface and burst after a while', () => {
    const s = arena(0, [liveCritter('crab', 16, 4)]);
    s.invuln = 100;
    s.hero.facing = 1;
    run(s, DT, () => inputWith([], ['action2']));
    expect(s.bubbles.length).toBe(1);
    run(s, 5);
    expect(s.bubbles[0].state).toBe('float');
    expect(s.bubbles[0].y).toBeLessThan(40);
    run(s, BUBBLE.life - 5 + 0.5);
    expect(s.bubbles.length).toBe(0);
  });

  it('a fresh bubble swallows ink', () => {
    const s = arena(0, [liveCritter('crab', 16, 4)]);
    s.inks.push({ kind: 'ink', x: 100, y: 100, w: 10, h: 8, vx: 0, vy: 0, life: 3 });
    s.bubbles.push(bubble(105, 104, 'shoot'));
    run(s, DT);
    expect(s.inks.length).toBe(0);
    expect(s.score).toBe(50);
  });

  it('squids squirt ink along their row, and ink costs a life', () => {
    const sq = liveCritter('squid', 7);
    sq.dir = -1;
    sq.fireCD = 0;
    const s = arena(0, [sq]);
    run(s, DT);
    expect(s.inks.length).toBe(1);
    sq.state = 'spawn';
    sq.timer = 99;
    run(s, 1.2);
    expect(s.dying).toBeGreaterThan(0);
  });

  it('the bay wraps: Ollie drops through the floor gap and lands from the top', () => {
    const s = arena(0, [liveCritter('crab', 16, 4)]);
    s.invuln = 100;
    s.hero.x = 9 * T + 1;
    let wrapped = false;
    for (let t = 0; t < 1.5; t += DT) {
      const before = s.hero.y;
      run(s, DT);
      if (s.hero.y < before - H / 2) wrapped = true;
    }
    expect(wrapped).toBe(true);
    // Level 1 has a ledge right under the gap in the ceiling.
    expect(s.hero.onGround).toBe(true);
    expect(s.hero.y + s.hero.h).toBeCloseTo(8 * T, 0);
  });

  it('clearing a level moves on to the next and reports it', () => {
    const s = arena(0, []);
    const cleared: number[] = [];
    run(s, DT, emptyInput, { onLevelClear: (i) => cleared.push(i) });
    expect(s.phase).toBe('clear');
    expect(cleared).toEqual([0]);
    run(s, 3.2);
    expect(s.stageIndex).toBe(1);
    expect(s.phase).toBe('transition');
    run(s, 1.2);
    expect(s.phase).toBe('intro');
  });

  it('power-ups change Ollie until a life is lost', () => {
    const s = arena(0, [liveCritter('crab', 16, 4)]);
    s.loot.push({ kind: 'power-rapid', value: 0, x: s.hero.x, y: s.hero.y, w: 12, h: 12, vx: 0, vy: 0, onGround: true, life: 5 });
    run(s, 0.1);
    expect(s.powers.rapid).toBe(true);
    run(s, DT, () => inputWith([], ['action2']));
    expect(s.fireCD).toBeCloseTo(BUBBLE.cooldownRapid, 5);
    s.bubbles = [];
    s.critters = [liveCritter('crab', Math.floor(s.hero.x / T), 13)];
    run(s, 0.1);
    expect(s.dying).toBeGreaterThan(0);
    run(s, 2);
    expect(s.powers.rapid).toBe(false);
  });

  it('the golden bubble makes Ollie invincible: critters he touches are knocked out', () => {
    const c = liveCritter('crab', 2);
    const s = arena(0, [c]);
    s.powers.shield = 5;
    run(s, DT);
    expect(c.state).toBe('out');
    expect(s.dying).toBe(0);
  });

  it('dawdling makes critters angry, then sends the urchin', () => {
    const s = arena(0, [liveCritter('crab', 16, 4)]);
    s.stageTime = DIFF.normal.hurry - 0.05;
    run(s, 0.1);
    expect(s.hurry).toBe(1);
    s.stageTime = DIFF.normal.hurry + 15 - 0.05;
    run(s, 0.1);
    expect(s.chaser).not.toBeNull();
  });

  it('losing the last life ends the run', () => {
    const s = arena(0, [liveCritter('crab', 2)]);
    s.lives = 1;
    run(s, 3);
    expect(s.over).toBe(true);
    expect(s.won).toBe(false);
  });

  it('bosses are worn down by fresh bubbles, sealed in a giant bubble, and popped', () => {
    for (const level of [9, 19, 29]) {
      const s = create('normal', level);
      s.phase = 'play';
      s.invuln = 1000;
      const b = s.boss!;
      expect(b).not.toBeNull();
      const hp = b.hp;
      s.bubbles.push(bubble(b.x + b.w / 2, b.y + b.h / 2, 'shoot'));
      run(s, DT);
      expect(b.hp).toBe(hp - 1);
      while (b.hp > 0) {
        s.bubbles.push(bubble(b.x + b.w / 2, b.y + b.h / 2, 'shoot'));
        run(s, DT);
      }
      expect(b.state).toBe('trapped');
      run(s, 1.5);
      s.hero.x = b.x + b.w / 2 - 7;
      s.hero.y = b.y + b.h / 2 - 7;
      run(s, DT);
      expect(b.state).toBe('popped');
      expect(s.stats.bosses).toBe(1);
      run(s, 3);
      expect(s.boss).toBeNull();
      expect(['clear', 'transition']).toContain(s.phase);
    }
  });

  it('clearing the last level wins the game', () => {
    const s = create('normal', 29);
    s.phase = 'clear';
    s.phaseTime = 0;
    s.boss = null;
    s.critters = [];
    run(s, 3.5);
    expect(s.won).toBe(true);
    expect(s.over).toBe(true);
  });
});
