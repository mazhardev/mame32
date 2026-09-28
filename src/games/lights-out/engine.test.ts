import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { LEVELS, allOff, generate, neighbours, press, solve, validSave } from './engine';

const dark = (n: number) => Array<boolean>(n * n).fill(false);

describe('lights out rules', () => {
  it('toggles a light and its orthogonal neighbours only', () => {
    expect(neighbours(5, 0).sort((a, b) => a - b)).toEqual([0, 1, 5]);
    expect(neighbours(5, 12).sort((a, b) => a - b)).toEqual([7, 11, 12, 13, 17]);
    const lit = press(dark(5), 5, 12);
    expect(lit.filter(Boolean)).toHaveLength(5);
    expect(allOff(press(lit, 5, 12))).toBe(true);
  });

  it('solves a single press with that press', () => {
    expect(solve(press(dark(5), 5, 7), 5)).toEqual([7]);
    expect(solve(press(dark(7), 7, 30), 7)).toEqual([30]);
  });

  it('finds solutions that actually clear the board', () => {
    for (let seed = 0; seed < 25; seed++) {
      for (const level of Object.values(LEVELS)) {
        const lights = generate(level, createRng(`lo-${seed}-${level.n}`).next);
        const plan = solve(lights, level.n);
        expect(plan).not.toBeNull();
        let board = lights;
        for (const i of plan!) board = press(board, level.n, i);
        expect(allOff(board)).toBe(true);
        expect(allOff(lights)).toBe(false);
      }
    }
  });

  it('finds the minimal solution on 5×5 boards with a null space', () => {
    // Pressing these two quiet patterns' difference leaves the board dark, so a
    // 3-press puzzle must still be reported as 3 presses, not more.
    let lights = dark(5);
    for (const i of [0, 12, 24]) lights = press(lights, 5, i);
    expect(solve(lights, 5)).toHaveLength(3);
  });

  it('detects unsolvable 5×5 positions', () => {
    // A lone corner light is not reachable on the 5×5 board.
    const lights = dark(5);
    lights[0] = true;
    expect(solve(lights, 5)).toBeNull();
  });

  it('validates saves and rejects impossible boards', () => {
    const lights = press(dark(5), 5, 3);
    expect(validSave({ n: 5, lights, moves: 1, par: 1, hints: 0 })).toBe(true);
    const lone = dark(5);
    lone[0] = true;
    expect(validSave({ n: 5, lights: lone, moves: 1, par: 1, hints: 0 })).toBe(false);
    expect(validSave({ n: 5, lights: dark(5), moves: 0, par: 0, hints: 0 })).toBe(false);
    expect(validSave({ n: 6, lights: dark(36), moves: 0, par: 0, hints: 0 })).toBe(false);
  });
});
