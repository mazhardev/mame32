import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { COLS, create, lock, moveBlocks, restingHeight, spec } from './game';
import type { Block, State } from './game';

const rng = () => 0.5;

/** A well with nothing falling and the tide far below. */
function calm(): State {
  const s = create('normal');
  s.spawnT = 1e9;
  s.water = -1e6;
  return s;
}

const block = (col: number, width: number, h: number, speed = 4): Block => ({ col, width, h, speed, color: '#fff' });
const fill = (s: State, row: number, cols: number[]) => cols.forEach((c) => lock(s, block(c, 1, row)));

describe('falling blocks', () => {
  it('lands blocks on the floor and on top of the stack', () => {
    const s = calm();
    expect(restingHeight(s, 3, 2, 10)).toBe(0);
    fill(s, 0, [4]);
    expect(restingHeight(s, 3, 2, 10)).toBe(1);
    expect(restingHeight(s, 5, 2, 10)).toBe(0);
    s.player.x = 9;
    s.blocks.push(block(3, 2, 6));
    for (let i = 0; i < 120; i++) moveBlocks(s, 1 / 60);
    expect(s.blocks).toHaveLength(0);
    expect(s.grid[1][3]).toBeTruthy();
    expect(s.grid[1][4]).toBeTruthy();
    expect(s.grid[0][3]).toBeNull();
  });

  it('lets blocks slide under an overhang only from below', () => {
    const s = calm();
    fill(s, 3, [2]);
    // Starting below the overhang, a block falls to the floor.
    expect(restingHeight(s, 2, 1, 2.5)).toBe(0);
    // From above, it lands on top of it.
    expect(restingHeight(s, 2, 1, 8)).toBe(4);
  });

  it('runs and jumps up a one-block step but not a two-block climb', () => {
    const s = calm();
    s.player.x = 3;
    fill(s, 0, [5, 6]);
    fill(s, 0, [8]);
    fill(s, 1, [8]);
    fill(s, 2, [8]);
    simulate(spec, s, 0.4, inputWith(['right']), rng);
    expect(s.player.x).toBeCloseTo(5 - 0.3, 5);
    // Jump while running: up onto the step.
    simulate(spec, s, 0.5, inputWith(['right'], ['up']), rng);
    expect(s.player.h).toBeCloseTo(1, 5);
    expect(s.player.x).toBeGreaterThan(5);
    // From the step, the three-high wall is two blocks up: out of reach.
    for (let i = 0; i < 4; i++) simulate(spec, s, 0.5, inputWith(['right'], ['up']), rng);
    expect(s.player.x).toBeLessThanOrEqual(8 - 0.3 + 1e-6);
    expect(s.player.h).toBeLessThan(3);
  });

  it('squashes the player when a block lands on their head', () => {
    const s = calm();
    s.player.x = 4.5;
    s.blocks.push(block(4, 1, 3));
    simulate(spec, s, 1.5, emptyInput(), rng);
    expect(s.over).toBe(true);
    expect(s.cause).toBe('crushed');
    expect(spec.result(s).title).toMatch(/Squashed/);
  });

  it('is safe to stand right beside a falling block', () => {
    const s = calm();
    s.player.x = 5.35;
    s.blocks.push(block(4, 1, 3));
    simulate(spec, s, 1.5, emptyInput(), rng);
    expect(s.over).toBe(false);
    expect(s.grid[0][4]).toBeTruthy();
  });

  it('carries a player who is standing on a falling block', () => {
    const s = calm();
    s.player.x = 4.5;
    s.player.h = 3;
    s.blocks.push(block(4, 1, 2, 3));
    simulate(spec, s, 0.2, emptyInput(), rng);
    expect(s.over).toBe(false);
    simulate(spec, s, 1.5, emptyInput(), rng);
    expect(s.over).toBe(false);
    expect(s.player.h).toBeCloseTo(1, 5);
  });

  it('counts a completely filled row once', () => {
    const s = calm();
    fill(s, 0, [...Array(COLS).keys()].slice(0, COLS - 1));
    expect(s.lines).toBe(0);
    fill(s, 0, [COLS - 1]);
    expect(s.lines).toBe(1);
    expect(s.score).toBe(25);
  });

  it('scores the height the player climbs', () => {
    const s = calm();
    s.player.x = 3;
    fill(s, 0, [4]);
    simulate(spec, s, 0.6, inputWith(['right'], ['up']), rng);
    simulate(spec, s, 0.3, emptyInput(), rng);
    expect(s.maxH).toBe(1);
    expect(s.score).toBe(10);
  });

  it('drowns a player who stays put as the tide rises', () => {
    const s = create('normal');
    s.spawnT = 1e9;
    simulate(spec, s, 60, emptyInput(), rng);
    expect(s.over).toBe(true);
    expect(s.cause).toBe('drowned');
  });

  it('keeps raining blocks during a round', () => {
    const s = create('hard');
    s.player.x = 0.5;
    simulate(spec, s, 6, emptyInput(), Math.random);
    const settled = s.grid.flat().filter(Boolean).length;
    expect(settled + s.blocks.length).toBeGreaterThan(4);
  });
});
