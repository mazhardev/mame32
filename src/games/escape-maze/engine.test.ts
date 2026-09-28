import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import type { Direction } from '@/game-engine/InputManager';
import { shortestPath, step } from '../_shared/maze/maze';
import { LEVELS_PER_RUN, buildLevel, levelScore, move, visibleCells } from './engine';
import type { Level, RunnerState } from './engine';

const DIRS: Direction[] = ['up', 'right', 'down', 'left'];

/** Walks a cell path, returning the final state (or null if a move failed). */
function walk(lvl: Level, state: RunnerState, path: number[]): RunnerState | null {
  let s = state;
  for (const target of path.slice(1)) {
    const dir = DIRS.find((d) => step(lvl.maze, s.pos, d) === target)!;
    const r = move(lvl, s, dir);
    if (r.event === 'blocked' || r.event === 'locked') return null;
    s = r.state;
  }
  return s;
}

describe('escape maze levels', () => {
  it('is always escapable by fetching each key in order', () => {
    for (const diff of ['easy', 'normal', 'hard'] as const) {
      for (let level = 1; level <= LEVELS_PER_RUN; level++) {
        for (let seed = 0; seed < 4; seed++) {
          const lvl = buildLevel(diff, level, createRng(`${diff}-${level}-${seed}`).next);
          expect(lvl.keys).toHaveLength(lvl.doors.length);
          let state: RunnerState | null = { pos: lvl.start, held: [], opened: [], coins: [] };
          for (const key of lvl.keys) {
            state = walk(lvl, state!, shortestPath(lvl.maze, state!.pos, key));
            expect(state).not.toBeNull();
          }
          state = walk(lvl, state!, shortestPath(lvl.maze, state!.pos, lvl.exit));
          expect(state?.pos).toBe(lvl.exit);
          expect(state?.opened).toHaveLength(lvl.doors.length);
        }
      }
    }
  });

  it('blocks a locked door until its key is held', () => {
    const lvl = buildLevel('hard', 2, createRng('door').next);
    expect(lvl.doors.length).toBeGreaterThan(0);
    const door = lvl.doors[0];
    // Walk to the door without the key: the last step must be refused.
    const path = shortestPath(lvl.maze, lvl.start, door.b);
    const before = walk(lvl, { pos: lvl.start, held: [], opened: [], coins: [] }, path.slice(0, -1));
    const dir = DIRS.find((d) => step(lvl.maze, door.a, d) === door.b)!;
    expect(move(lvl, before!, dir).event).toBe('locked');
    const withKey = move(lvl, { ...before!, held: [door.color] }, dir);
    expect(withKey.event).toBe('unlocked');
    expect(withKey.state.held).not.toContain(door.color);
  });

  it('gives more time to longer levels and scores time left and coins', () => {
    const small = buildLevel('normal', 1, createRng(1).next);
    const big = buildLevel('normal', 5, createRng(1).next);
    expect(big.maze.w).toBeGreaterThan(small.maze.w);
    expect(big.seconds).toBeGreaterThan(small.seconds);
    expect(levelScore(2, 10, 1)).toBe(200 + 100 + 50);
  });

  it('lights a circle around the player', () => {
    const lvl = buildLevel('easy', 1, createRng(2).next);
    const lit = visibleCells(lvl.maze, 0, 1.8);
    expect(lit).toContain(0);
    expect(lit).toContain(1);
    expect(lit).toContain(lvl.maze.w + 1);
    expect(lit).not.toContain(3);
  });
});
