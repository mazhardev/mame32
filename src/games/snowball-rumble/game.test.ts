import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import type { Input } from '../_shared/arcade/kit';
import { allStandable, reachableCells, standable } from '../_shared/arena/stage';
import { T } from '../_shared/arena/stage';
import { ROLL_DAMAGE } from './bosses';
import { DIFF, create, newFoe, update } from './game';
import { FLOOR_COUNT, HERO_START, floorStage, isBossFloor } from './stages';
import type { Foe, State } from './types';

const DT = 1 / 60;
const rng = createRng('snow').next;

function run(s: State, seconds: number, input: () => Input = emptyInput, hooks = {}) {
  for (let t = 0; t < seconds; t += DT) {
    if (s.over) return;
    s.time += DT;
    update(s, DT, input(), rng, hooks);
    s.events.length = 0;
  }
}

/** A floor with only the given foes, in play. */
function arena(floor = 0, foes: Foe[] = []): State {
  const s = create('normal', floor);
  s.phase = 'play';
  s.phaseTime = 0;
  s.foes = foes;
  return s;
}

function liveFoe(col: number, row = 13): Foe {
  const f = newFoe('goblin', col, row, 0);
  f.state = 'live';
  return f;
}

describe('snowball rumble floors', () => {
  it('has 30 floors with a boss every tenth', () => {
    expect(FLOOR_COUNT).toBe(30);
    expect([9, 19, 29].every(isBossFloor)).toBe(true);
    expect(isBossFloor(5)).toBe(false);
  });

  it('every ledge of every floor can be reached, and enemies start on solid footing', () => {
    for (let i = 0; i < FLOOR_COUNT; i++) {
      const st = floorStage(i);
      const reach = reachableCells(st, HERO_START);
      for (const [c, r] of allStandable(st)) expect(reach.has(`${c},${r}`), `floor ${i + 1}: ${c},${r}`).toBe(true);
      for (const sp of st.spawns) {
        if (sp.glyph !== 'b') expect(standable(st, sp.col, sp.row), `floor ${i + 1} spawn ${sp.col},${sp.row}`).toBe(true);
        if (sp.row === 13) expect(Math.abs(sp.col - HERO_START[0])).toBeGreaterThanOrEqual(3);
      }
      if (!isBossFloor(i)) expect(st.spawns.length).toBeGreaterThan(0);
    }
  });
});

describe('snowball rumble rules', () => {
  it('introduces the floor, then enemies pop in and start moving', () => {
    const s = create('normal', 0);
    expect(s.phase).toBe('intro');
    run(s, 1.6);
    expect(s.phase).toBe('play');
    run(s, 1);
    expect(s.foes.every((f) => f.state === 'live')).toBe(true);
  });

  it('four snowballs pack an enemy into a full snowball, which later cracks open', () => {
    const f = liveFoe(13);
    const s = arena(0, [f]);
    s.hero.facing = 1;
    for (let i = 0; i < 4; i++) {
      s.fireCD = 0;
      run(s, DT, () => inputWith([], ['action2']));
      run(s, 0.35);
    }
    expect(f.state).toBe('ball');
    expect(s.stats.frozen).toBe(1);
    run(s, 8);
    expect(f.state).toBe('live');
    expect(f.snow).toBeGreaterThan(0);
  });

  it('a snowed-up enemy is harmless; a clear one costs a life', () => {
    const f = liveFoe(9);
    f.snow = 2;
    f.melt = 5;
    const s = arena(0, [f]);
    run(s, 0.2);
    expect(s.dying).toBe(0);
    f.snow = 0;
    run(s, 0.1);
    expect(s.dying).toBeGreaterThan(0);
  });

  it('a kicked snowball rolls, knocks out what it touches and turns them into treats', () => {
    const ball = liveFoe(12);
    ball.state = 'ball';
    ball.snow = 4;
    ball.melt = 7;
    const victim = liveFoe(16);
    const s = arena(0, [ball, victim]);
    s.hero.x = 10 * T;
    s.hero.facing = 1;
    run(s, DT, () => inputWith([], ['action2']));
    run(s, 0.3);
    expect(['roll', 'out']).toContain(ball.state as string);
    run(s, 2.5);
    expect(s.foes.includes(victim)).toBe(false);
    expect(s.stats.bestChain).toBeGreaterThanOrEqual(1);
    // The treat is either still lying about or Pebble already picked it up.
    const treatValue = s.score - 500 - 500;
    expect(s.loot.length > 0 || treatValue > 0).toBe(true);
  });

  it('a rolling snowball bursts after bouncing off the walls', () => {
    const ball = liveFoe(4);
    ball.state = 'roll';
    ball.dir = 1;
    const s = arena(0, [ball]);
    s.hero.x = 2 * T;
    run(s, 6);
    expect(s.foes.length).toBe(0);
  });

  it('clearing a floor moves on to the next and reports it', () => {
    const s = arena(0, []);
    const cleared: number[] = [];
    run(s, DT, emptyInput, { onFloorClear: (i: number) => cleared.push(i) });
    expect(s.phase).toBe('clear');
    expect(cleared).toEqual([0]);
    run(s, 3.2);
    expect(s.stageIndex).toBe(1);
    expect(s.phase).toBe('transition');
    run(s, 1.2);
    expect(s.phase).toBe('intro');
  });

  it('potions change Pebble until a life is lost', () => {
    const s = arena(0, [liveFoe(16, 4)]);
    s.loot.push({ kind: 'potion-red', value: 0, x: s.hero.x, y: s.hero.y, w: 12, h: 12, vx: 0, vy: 0, onGround: true, life: 5 });
    run(s, 0.1);
    expect(s.potions.speed).toBe(true);
    s.foes = [liveFoe(Math.floor(s.hero.x / T), 13)];
    run(s, 0.1);
    run(s, 2);
    expect(s.potions.speed).toBe(false);
  });

  it('dawdling makes enemies angry, then sends the gloom cloud', () => {
    const s = arena(0, [liveFoe(16, 4)]);
    s.stageTime = DIFF.normal.hurry - 0.05;
    run(s, 0.1);
    expect(s.hurry).toBe(1);
    s.stageTime = DIFF.normal.hurry + 15 - 0.05;
    run(s, 0.1);
    expect(s.chaser).not.toBeNull();
  });

  it('losing the last life ends the run', () => {
    const s = arena(0, [liveFoe(9)]);
    s.lives = 1;
    run(s, 3);
    expect(s.over).toBe(true);
    expect(s.won).toBe(false);
  });

  it('bosses are worn down by snow and rolling snowballs, and fall', () => {
    for (const floor of [9, 19, 29]) {
      const s = create('normal', floor);
      s.phase = 'play';
      const b = s.boss!;
      expect(b).not.toBeNull();
      const hp = b.hp;
      // A thrown snowball chips it.
      s.shots.push({ x: b.x + 4, y: b.y + 4, w: 8, h: 8, vx: 10, vy: 0, life: 1, power: 1 });
      run(s, DT);
      expect(b.hp).toBe(hp - 1);
      // Rolling snowballs finish it off.
      while (b.hp > 0) {
        const roller = liveFoe(2);
        roller.state = 'roll';
        roller.x = b.x + 2;
        roller.y = b.y + b.h - 14;
        s.foes.push(roller);
        s.invuln = 5;
        run(s, DT);
      }
      expect(Math.ceil(hp / ROLL_DAMAGE)).toBeGreaterThan(1);
      s.invuln = 30;
      run(s, 4);
      expect(s.boss).toBeNull();
      expect(s.stats.bosses).toBe(1);
      expect(['clear', 'transition']).toContain(s.phase);
    }
  });

  it('clearing the last floor wins the game', () => {
    const s = create('normal', 29);
    s.phase = 'clear';
    s.phaseTime = 0;
    s.boss = null;
    s.foes = [];
    run(s, 3.5);
    expect(s.won).toBe(true);
    expect(s.over).toBe(true);
  });
});
