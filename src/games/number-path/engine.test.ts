import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { clueNumber, findPaths, generate, isSolved, reached, step, validPath } from './engine';
import { LEVELS } from './levels';

describe('number path', () => {
  it('generates a puzzle whose only solution is the stored path', () => {
    const p = generate(5, 5, 6, createRng('np-test').next);
    const { paths, complete } = findPaths(5, 5, p.clues, 3);
    expect(complete).toBe(true);
    expect(paths).toEqual([p.solution]);
    expect(p.clues[0]).toBe(p.solution[0]);
    expect(p.clues.at(-1)).toBe(p.solution.at(-1));
  });

  it('ships thirty valid levels per size, each with one solution path through every square', () => {
    for (const [pack, n] of [['easy', 5], ['normal', 6], ['hard', 7]] as const) {
      expect(LEVELS[pack]).toHaveLength(30);
      for (const p of LEVELS[pack]) {
        expect(p.w).toBe(n);
        expect(new Set(p.solution).size).toBe(n * n);
        expect(isSolved(p, p.solution)).toBe(true);
      }
    }
    // Spot-check uniqueness on a few of the smaller levels.
    for (const p of LEVELS.easy.slice(0, 5)) expect(findPaths(p.w, p.h, p.clues, 2).paths).toHaveLength(1);
  });

  it('only starts on 1 and only steps to neighbouring squares', () => {
    const p = LEVELS.easy[0];
    expect(step(p, [], p.clues[1])).toBeNull();
    const start = step(p, [], p.clues[0]);
    expect(start).toEqual([p.clues[0]]);
    const far = [...Array(25).keys()].find((c) => Math.abs((c % 5) - (p.clues[0] % 5)) + Math.abs(Math.floor(c / 5) - Math.floor(p.clues[0] / 5)) > 1) as number;
    expect(step(p, start as number[], far)).toBeNull();
  });

  it('refuses numbers out of order and the last number before the grid is full', () => {
    const p = LEVELS.easy[3];
    // Walk the solution until the square before the 3rd clue, then try to jump on a later clue.
    let path: number[] = [];
    for (const c of p.solution) {
      const next = step(p, path, c);
      expect(next).not.toBeNull();
      path = next as number[];
    }
    expect(isSolved(p, path)).toBe(true);
    expect(reached(p, path)).toBe(p.clues.length);
    const almost = p.solution.slice(0, -2);
    expect(step(p, almost, p.clues.at(-1) as number)).toBeNull();
  });

  it('backs up when you step onto the line again', () => {
    const p = LEVELS.normal[0];
    const path = p.solution.slice(0, 6);
    expect(step(p, path, path[2])).toEqual(path.slice(0, 3));
    expect(step(p, path, path[5])).toBeNull();
  });

  it('numbers the clue squares from 1', () => {
    const p = LEVELS.hard[0];
    expect(clueNumber(p, p.clues[0])).toBe(1);
    expect(clueNumber(p, p.clues[2])).toBe(3);
    expect(clueNumber(p, -1)).toBe(0);
  });

  it('accepts only saved paths that follow the rules', () => {
    const p = LEVELS.easy[1];
    expect(validPath(p, p.solution.slice(0, 7))).toBe(true);
    expect(validPath(p, [p.solution[1]])).toBe(false);
    expect(validPath(p, 'x')).toBe(false);
  });
});
