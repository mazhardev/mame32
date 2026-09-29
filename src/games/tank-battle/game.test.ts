import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { ARENA_COUNT, BRICK, COLS, EMPTY, ROWS, SPAWNS, STEEL, TILE, buildArena } from './arena';
import { R, blocked, clearLine, create, fire, makeSpec, route, update } from './game';
import type { State } from './game';

const cpu = makeSpec('cpu');
const duo = makeSpec('duo');
const rng = () => 0.5;

/** A match on an empty arena, already past the round intro. */
function open(mode: 'cpu' | 'duo' = 'cpu', difficulty: 'easy' | 'normal' | 'hard' = 'normal'): State {
  const s = create(difficulty, rng, mode);
  s.grid = s.grid.map((row) => row.map(() => EMPTY));
  s.roundT = 0;
  for (const t of s.tanks) t.cooldown = 0;
  return s;
}

describe('tank battle arenas', () => {
  it('are symmetric under a half turn so both sides are fair', () => {
    for (let a = 0; a < ARENA_COUNT; a++) {
      const g = buildArena(a);
      expect(g).toHaveLength(ROWS);
      for (let y = 0; y < ROWS; y++) {
        expect(g[y]).toHaveLength(COLS);
        for (let x = 0; x < COLS; x++) expect(g[y][x]).toBe(g[ROWS - 1 - y][COLS - 1 - x]);
      }
    }
  });

  it('keep both spawns clear and connected', () => {
    for (let a = 0; a < ARENA_COUNT; a++) {
      const s = create('normal', rng);
      s.grid = buildArena(a);
      for (const sp of SPAWNS) expect(s.grid[sp.y][sp.x]).toBe(EMPTY);
      const path = route(s, [SPAWNS[0].x, SPAWNS[0].y], [SPAWNS[1].x, SPAWNS[1].y]);
      expect(path.length).toBeGreaterThan(0);
      expect(path.every(([x, y]) => s.grid[y][x] !== STEEL)).toBe(true);
    }
  });
});

describe('tank battle driving and shooting', () => {
  it('drives forward and stops at the arena edge', () => {
    const s = open();
    s.tanks[0].angle = Math.PI;
    simulate(cpu, s, 2, inputWith(['up']), rng);
    expect(s.tanks[0].x).toBeGreaterThanOrEqual(R);
    expect(s.tanks[0].x).toBeLessThan(R + 3);
  });

  it('cannot drive into walls', () => {
    const s = open();
    s.grid[6][3] = STEEL;
    s.tanks[1].x = 600;
    simulate(cpu, s, 2, inputWith(['up']), rng);
    expect(s.tanks[0].x + R).toBeLessThanOrEqual(3 * TILE + 0.5);
    expect(blocked(s, 3 * TILE + 4, s.tanks[0].y, 0)).toBe(true);
  });

  it('limits shells in flight and respects the cooldown', () => {
    const s = open();
    expect(fire(s, 0, 0.4)).toBe(true);
    expect(fire(s, 0, 0.4)).toBe(false);
    s.tanks[0].cooldown = 0;
    expect(fire(s, 0, 0.4)).toBe(true);
    s.tanks[0].cooldown = 0;
    expect(fire(s, 0, 0.4)).toBe(false);
  });

  it('blasts brick walls away', () => {
    const s = open();
    s.grid[6][5] = BRICK;
    s.tanks[1].y = 40;
    fire(s, 0, 0.4);
    update(s, 0.5, emptyInput(), rng);
    expect(s.grid[6][5]).toBe(EMPTY);
    expect(s.shells).toHaveLength(0);
  });

  it('ricochets once off steel, then the shell is spent', () => {
    const s = open();
    s.grid[6][6] = STEEL;
    s.tanks[1].y = 40;
    s.tanks[0].y = 6.5 * TILE;
    s.tanks[0].x = 60;
    fire(s, 0, 0.4);
    // Move the tank out of the way so the shell comes back past it.
    s.tanks[0].y = 400;
    for (let i = 0; i < 40; i++) update(s, 1 / 60, emptyInput(), rng);
    const sh = s.shells[0];
    expect(sh.bounces).toBe(1);
    expect(sh.vx).toBeLessThan(0);
    simulate(cpu, s, 3, emptyInput(), rng);
    expect(s.shells).toHaveLength(0);
    expect(s.grid[6][6]).toBe(STEEL);
  });

  it('awards the round for a hit and moves to the next arena', () => {
    const s = open('duo');
    s.tanks[1].x = s.tanks[0].x + 150;
    s.tanks[1].y = s.tanks[0].y;
    s.tanks[0].angle = 0;
    fire(s, 0, 0.4);
    for (let i = 0; i < 60 && s.wins[0] === 0; i++) update(s, 1 / 60, emptyInput(), rng);
    expect(s.wins).toEqual([1, 0]);
    expect(s.tanks[1].alive).toBe(false);
    simulate(duo, s, 2, emptyInput(), rng);
    expect(s.round).toBe(2);
    expect(s.arena).toBe(1);
    expect(s.tanks.every((t) => t.alive)).toBe(true);
  });

  it('gives the opponent the point when a tank shoots itself', () => {
    const s = open('duo');
    s.tanks[1].y = 40;
    s.tanks[0].x = 40;
    s.tanks[0].angle = Math.PI;
    // The shell rebounds off the left edge straight back into its owner.
    fire(s, 0, 0.4);
    simulate(duo, s, 0.6, emptyInput(), rng);
    expect(s.wins).toEqual([0, 1]);
  });

  it('ends the match at five rounds with a victory', () => {
    const s = open();
    s.tanks[1].cooldown = 99;
    s.wins = [4, 2];
    s.tanks[1].x = s.tanks[0].x + 100;
    s.tanks[1].y = s.tanks[0].y;
    s.tanks[0].angle = 0;
    fire(s, 0, 0.4);
    simulate(cpu, s, 3, emptyInput(), rng);
    expect(s.over).toBe(true);
    const r = cpu.result(s);
    expect(r.won).toBe(true);
    expect(r.score).toBe(500 + 500 + 300);
  });

  it('drives each tank from its own keys in two-player mode', () => {
    const s = open('duo');
    const input = emptyInput();
    input.keysHeld.add('w');
    input.held.add('up');
    const [x0, x1] = [s.tanks[0].x, s.tanks[1].x];
    simulate(duo, s, 0.5, input, rng);
    expect(s.tanks[0].x).toBeGreaterThan(x0 + 20);
    expect(s.tanks[1].x).toBeLessThan(x1 - 20);
  });
});

describe('tank battle AI', () => {
  it('sees through open ground but not through walls', () => {
    const s = open();
    expect(clearLine(s, 40, 40, 600, 40)).toBe(true);
    s.grid[1][10] = BRICK;
    expect(clearLine(s, 40, 40, 600, 40)).toBe(false);
  });

  it('routes around steel and through bricks when that is shorter', () => {
    const s = open();
    for (let y = 0; y < ROWS; y++) s.grid[y][10] = y === 6 ? BRICK : STEEL;
    const path = route(s, [2, 6], [17, 6]);
    expect(path.some(([x, y]) => x === 10 && y === 6)).toBe(true);
    s.grid[6][10] = STEEL;
    expect(route(s, [2, 6], [17, 6])).toEqual([]);
  });

  for (const difficulty of ['easy', 'hard'] as const)
    it(`hunts down and beats a sitting target (${difficulty})`, () => {
      const s = create(difficulty, rng, 'cpu');
      s.roundT = 0;
      simulate(cpu, s, 40, emptyInput(), Math.random);
      expect(s.wins[1]).toBeGreaterThanOrEqual(1);
    });

  it('finds the player behind cover on every arena', () => {
    for (let a = 0; a < ARENA_COUNT; a++) {
      const s = create('normal', rng, 'cpu');
      s.arena = a;
      s.grid = buildArena(a);
      s.roundT = 0;
      for (let t = 0; t < 40 * 60 && s.wins[1] === 0; t++) {
        s.time += 1 / 60;
        update(s, 1 / 60, emptyInput(), Math.random);
      }
      expect(s.wins[1], `arena ${a}`).toBe(1);
    }
  });
});
