import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import type { Action, Input } from '../_shared/arcade/kit';
import { STOMP_DAMAGE } from './bosses';
import { spawnEnemy } from './enemies';
import { DIFF, create, die, getLevel, hurt, loadLevel, update } from './game';
import { LEVELS_PER_WORLD, ROWS, TILE } from './levels';
import type { EnemyKind } from './levels';
import { gridMap, setBig } from './player';
import { SOLUTIONS } from './solutions';
import { MACRO } from './solver';
import type { State } from './types';

const DT = 1 / 60;
const rng = createRng('leap').next;

function playing(level = 0): State {
  const s = create('normal', level);
  s.phase = 'play';
  s.enemies = [];
  return s;
}

function run(s: State, seconds: number, input: () => Input = emptyInput, hooks = {}) {
  for (let t = 0; t < seconds; t += DT) {
    if (s.over) return;
    s.time += DT;
    update(s, DT, input(), rng, hooks);
    s.events.length = 0;
  }
}

/** Puts a cleared, flat stretch of ground under Pip: columns from..to on row 13. */
function flatArena(s: State, from = 0, to = 30) {
  const cols = s.level.cols;
  for (let r = 0; r < ROWS; r++) {
    for (let c = from; c <= to; c++) s.grid[r * cols + c] = r >= 13 ? '#' : '.';
  }
}

function enemyAt(s: State, kind: EnemyKind, col: number) {
  const e = spawnEnemy({ kind, x: col * TILE + 8, y: 13 * TILE }, gridMap(s.grid, s.level.cols));
  s.enemies.push(e);
  return e;
}

function place(s: State, col: number, bottom = 13 * TILE) {
  s.player.x = col * TILE + 2;
  s.player.y = bottom - s.player.h;
  s.player.vx = 0;
  s.player.vy = 0;
  s.camera = Math.max(0, col * TILE - 100);
}

describe('leap quest — basics', () => {
  it('shows the level card, then lets Pip play', () => {
    const s = create('normal', 0);
    expect(s.phase).toBe('intro');
    run(s, 2);
    expect(s.phase).toBe('play');
    expect(s.lives).toBe(DIFF.normal.lives);
    expect(s.timeLeft).toBeLessThan(DIFF.normal.time);
  });

  it('runs right and jumps', () => {
    const s = playing();
    flatArena(s);
    place(s, 3);
    run(s, 0.5, () => inputWith(['right']));
    expect(s.player.x).toBeGreaterThan(3 * TILE + 30);
    const y0 = s.player.y;
    run(s, 0.25, () => inputWith(['action'], s.player.onGround ? ['action'] : []));
    expect(s.player.y).toBeLessThan(y0 - 30);
  });

  it('stomps a beetle from above and bounces', () => {
    const s = playing();
    flatArena(s);
    const e = enemyAt(s, 'beetle', 10);
    e.dir = 0;
    place(s, 10, 13 * TILE - 40);
    s.player.x = e.x + 1;
    s.player.vy = 200;
    run(s, 0.3);
    expect(e.state === 'flat' || !s.enemies.includes(e)).toBe(true);
    expect(s.score).toBeGreaterThanOrEqual(100);
    expect(s.stats.stomps).toBe(1);
  });

  it('getting touched shrinks big Pip, then costs a life when small', () => {
    const s = playing();
    flatArena(s);
    setBig(s.player, true);
    place(s, 10);
    hurt(s);
    expect(s.player.big).toBe(false);
    expect(s.invuln).toBeGreaterThan(0);
    s.invuln = 0;
    hurt(s);
    expect(s.phase).toBe('dying');
    run(s, 2.2);
    expect(s.lives).toBe(DIFF.normal.lives - 1);
    expect(s.phase === 'intro' || s.phase === 'play').toBe(true);
  });

  it('hedgehogs cannot be stomped', () => {
    const s = playing();
    flatArena(s);
    const e = enemyAt(s, 'hedgehog', 10);
    place(s, 10, 13 * TILE - 30);
    s.player.x = e.x + 1;
    s.player.vy = 200;
    run(s, 0.3);
    expect(s.phase).toBe('dying');
  });

  it('kicked snail shells knock out other enemies', () => {
    const s = playing();
    flatArena(s);
    const snail = enemyAt(s, 'snail', 8);
    snail.state = 'shell';
    snail.timer = 7;
    snail.h = 12;
    snail.y = 13 * TILE - 12;
    const victim = enemyAt(s, 'beetle', 16);
    place(s, 6);
    run(s, 0.6, () => inputWith(['right']));
    expect(['slide', 'dead']).toContain(snail.state);
    run(s, 1.2);
    expect(victim.state).toBe('dead');
    expect(s.stats.shellChain).toBeGreaterThanOrEqual(1);
  });

  it('sparks from the pepper power knock out enemies', () => {
    const s = playing();
    flatArena(s);
    s.power = 'spark';
    setBig(s.player, true);
    place(s, 4);
    const e = enemyAt(s, 'hedgehog', 12);
    run(s, DT, () => inputWith([], ['action2']));
    expect(s.sparks.length).toBe(1);
    run(s, 1.5);
    expect(e.state).toBe('dead');
  });
});

describe('leap quest — blocks and items', () => {
  function under(s: State, glyph: string) {
    flatArena(s);
    s.grid[9 * s.level.cols + 10] = glyph;
    place(s, 10);
    s.player.x = 10 * TILE + 2;
  }

  it('gift blocks give gems and become empty', () => {
    const s = playing();
    under(s, '?');
    run(s, 0.6, () => inputWith(['action'], s.player.onGround ? ['action'] : []));
    expect(s.gems).toBe(1);
    expect(s.grid[9 * s.level.cols + 10]).toBe('u');
  });

  it('a power block gives a berry that makes Pip big, then a pepper', () => {
    const s = playing();
    under(s, 'P');
    run(s, 0.4, () => inputWith(['action'], s.player.onGround ? ['action'] : []));
    expect(s.items[0]?.kind).toBe('berry');
    // Walk into the berry.
    const berry = s.items[0];
    run(s, 0.8);
    s.player.x = berry.x;
    s.player.y = berry.y + berry.h - s.player.h;
    run(s, DT);
    expect(s.player.big).toBe(true);
    // A second power block now holds a pepper.
    s.grid[8 * s.level.cols + 14] = 'P';
    place(s, 14);
    run(s, 0.4, () => inputWith(['action'], s.player.onGround ? ['action'] : []));
    expect(s.items.some((i) => i.kind === 'pepper')).toBe(true);
  });

  it('big Pip breaks bricks; small Pip only bumps them', () => {
    const small = playing();
    under(small, 'B');
    run(small, 0.5, () => inputWith(['action'], small.player.onGround ? ['action'] : []));
    expect(small.grid[9 * small.level.cols + 10]).toBe('B');

    const big = playing();
    under(big, 'B');
    setBig(big.player, true);
    place(big, 10);
    big.grid[8 * big.level.cols + 10] = 'B';
    big.grid[9 * big.level.cols + 10] = '.';
    run(big, 0.5, () => inputWith(['action'], big.player.onGround ? ['action'] : []));
    expect(big.grid[8 * big.level.cols + 10]).toBe('.');
  });

  it('100 gems are an extra life', () => {
    const s = playing();
    flatArena(s);
    s.gems = 99;
    s.grid[12 * s.level.cols + 11] = 'o';
    place(s, 10);
    run(s, 0.3, () => inputWith(['right']));
    expect(s.gems).toBe(0);
    expect(s.lives).toBe(DIFF.normal.lives + 1);
  });
});

describe('leap quest — hazards, checkpoints and the goal', () => {
  it('lava and pits cost a life', () => {
    const lava = playing();
    flatArena(lava);
    lava.grid[12 * lava.level.cols + 10] = '~';
    place(lava, 9);
    run(lava, 0.4, () => inputWith(['right']));
    expect(lava.phase).toBe('dying');

    const pit = playing();
    flatArena(pit);
    pit.player.y = ROWS * TILE + 10;
    run(pit, DT);
    expect(pit.phase).toBe('dying');
  });

  it('running out of time costs a life', () => {
    const s = playing();
    flatArena(s);
    place(s, 5);
    s.timeLeft = 0.05;
    run(s, 0.1);
    expect(s.phase).toBe('dying');
  });

  it('respawns at the last checkpoint touched', () => {
    const s = playing();
    const l = s.level;
    const k = l.grid.findIndex((g) => g === 'K');
    const kc = k % l.cols;
    place(s, kc - 1, Math.floor(k / l.cols) * TILE + TILE);
    run(s, 0.3, () => inputWith(['right']));
    expect(s.respawn).not.toBeNull();
    die(s);
    run(s, 2.2);
    expect(Math.abs(s.player.x - kc * TILE)).toBeLessThan(TILE * 2);
  });

  it('the goal pole finishes the level, tallies the time and starts the next one', () => {
    const s = playing();
    const cleared: number[] = [];
    const goal = s.level.goalX!;
    place(s, Math.floor(goal / TILE) - 2);
    run(s, 0.5, () => inputWith(['right']));
    expect(['goal', 'tally']).toContain(s.phase);
    const before = s.score;
    run(s, 8, emptyInput, { onLevelClear: (i: number) => cleared.push(i) });
    expect(s.score).toBeGreaterThan(before);
    expect(s.levelIndex).toBe(1);
    expect(s.phase === 'intro' || s.phase === 'play').toBe(true);
  });

  it('losing every life ends the run', () => {
    const s = playing();
    s.lives = 1;
    die(s);
    run(s, 2.5);
    expect(s.over).toBe(true);
    expect(s.won).toBe(false);
  });

  it('a stored route plays through 1-1 in the real game and reaches the next level', () => {
    const s = create('normal', 0);
    s.enemies = [];
    run(s, 2);
    const cleared: number[] = [];
    const hooks = { onLevelClear: (i: number) => cleared.push(i) };
    let prev = false;
    for (const ch of SOLUTIONS[0]) {
      const jump = ch === ch.toLowerCase();
      const dir = ch.toUpperCase();
      for (let f = 0; f < MACRO && s.phase === 'play'; f++) {
        const held: Action[] = [];
        if (dir === 'L') held.push('left');
        if (dir === 'R') held.push('right');
        if (jump) held.push('action');
        const input = inputWith(held, jump && !prev ? ['action'] : []);
        prev = jump;
        s.enemies = [];
        s.hostile = [];
        s.time += DT;
        update(s, DT, input, rng, hooks);
      }
      if (s.phase !== 'play') break;
    }
    expect(cleared).toEqual([0]);
  });
});

describe('leap quest — guardians', () => {
  for (let world = 0; world < 4; world++) {
    it(`world ${world + 1}'s guardian can be stomped down and leaves a star key`, () => {
      const s = create('normal', world * LEVELS_PER_WORLD + 3);
      const l = getLevel(world * LEVELS_PER_WORLD + 3);
      loadLevel(s, l.index, true);
      s.phase = 'play';
      s.enemies = [];
      // Walk into the arena.
      place(s, l.arenaX! / TILE + 3);
      run(s, 0.2);
      expect(s.arenaLocked).toBe(true);
      const b = s.boss!;
      const stomps = b.maxHp / STOMP_DAMAGE;
      for (let i = 0; i < stomps; i++) {
        // Drop Pip onto the guardian's head.
        b.hurt = 0;
        if (b.kind === 'mole') b.state = 'walk';
        s.invuln = 5;
        s.player.x = b.x + b.w / 2 - s.player.w / 2;
        s.player.y = b.y - s.player.h - 4;
        s.player.vy = 300;
        s.hostile = [];
        run(s, 0.05);
      }
      expect(b.hp).toBe(0);
      run(s, 2);
      expect(s.orb).not.toBeNull();
      // Grab the key: the world is clear.
      s.player.x = s.orb!.x - s.player.w / 2;
      s.player.y = s.orb!.y - s.player.h / 2;
      s.invuln = 5;
      run(s, DT);
      expect(s.phase).toBe('tally');
      expect(s.stats.bosses).toBe(1);
    });
  }

  it('beating the last guardian wins the game', () => {
    const s = create('normal', 15);
    s.phase = 'tally';
    s.timeLeft = 0;
    s.phaseTime = 0;
    run(s, 2);
    expect(s.won).toBe(true);
    expect(s.over).toBe(true);
  });
});
