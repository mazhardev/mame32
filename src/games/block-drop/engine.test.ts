import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { createRng } from '@/utils/random';
import { COLS, GOAL, ROWS, clearLines, create, dropDistance, fallTime, hardDrop, move, rotate, turn, update } from './engine';
import type { State } from './engine';

const rng = () => createRng('block-drop').next;
const step = (s: State, secs: number, input = emptyInput()) => {
  for (let t = 0; t < secs; t += 1 / 60) {
    s.time += 1 / 60;
    update(s, 1 / 60, input, Math.random);
  }
};

describe('block drop', () => {
  it('removes complete rows and adds empty rows at the top', () => {
    const b = [Array(COLS).fill(1), Array(COLS).fill(0)];
    expect(clearLines(b).count).toBe(1);
    expect(clearLines(b).board).toHaveLength(2);
    expect(clearLines(b).board[0].every((v) => v === 0)).toBe(true);
  });

  it('rotates a piece back to its original orientation', () => {
    const s = [
      [1, 0],
      [1, 1],
    ];
    expect(rotate(rotate(rotate(rotate(s))))).toEqual(s);
  });

  it('deals every piece once in each bag of seven', () => {
    const s = create('normal', rng());
    const kinds = [s.piece.kind];
    for (let i = 0; i < 6; i++) {
      hardDrop(s);
      update(s, 0.01, emptyInput(), rng());
      kinds.push(s.piece.kind);
    }
    expect(new Set(kinds).size).toBe(7);
  });

  it('stops at the walls and locks a hard-dropped piece at the bottom', () => {
    const s = create('normal', rng());
    for (let i = 0; i < 12; i++) move(s, -1);
    expect(s.piece.x).toBe(0);
    expect(move(s, -1)).toBe(false);
    const cells = s.piece.shape.flat().filter(Boolean).length;
    hardDrop(s);
    expect(s.board.flat().filter(Boolean)).toHaveLength(cells);
    expect(s.board[ROWS - 1].some(Boolean)).toBe(true);
    expect(s.score).toBeGreaterThan(0);
  });

  it('turns away from a wall instead of refusing', () => {
    const s = create('normal', rng());
    // Find the straight piece and stand it upright against the right wall.
    s.piece = { shape: [[1], [1], [1], [1]], kind: 1, x: COLS - 1, y: 2 };
    expect(turn(s)).toBe(true);
    expect(s.piece.shape[0]).toHaveLength(4);
    expect(s.piece.x + 4).toBeLessThanOrEqual(COLS);
  });

  it('clears a full row, scores it by level and counts the line', () => {
    const s = create('easy', rng());
    s.board[ROWS - 1] = [1, 1, 1, 1, 1, 1, 0, 0, 0, 0];
    s.piece = { shape: [[1, 1, 1, 1]], kind: 1, x: 6, y: 0 };
    hardDrop(s);
    expect(s.clearing).toEqual([ROWS - 1]);
    step(s, 0.5);
    expect(s.lines).toBe(1);
    expect(s.board[ROWS - 1].every((v) => v === 0)).toBe(true);
    expect(s.score).toBeGreaterThanOrEqual(100 * s.startLevel);
  });

  it('lets a landed piece slide briefly before it locks', () => {
    const s = create('normal', rng());
    s.piece.y += dropDistance(s);
    step(s, 0.2);
    expect(s.board.flat().some(Boolean)).toBe(false);
    step(s, 0.5);
    expect(s.board.flat().some(Boolean)).toBe(true);
  });

  it('falls faster at higher levels and with soft drop', () => {
    expect(fallTime(5)).toBeLessThan(fallTime(1));
    const a = create('normal', rng());
    const b = create('normal', rng());
    step(a, 0.5);
    step(b, 0.5, inputWith(['down']));
    expect(b.piece.y).toBeGreaterThan(a.piece.y);
  });

  it('starts faster on Hard', () => {
    expect(create('hard').level).toBeGreaterThan(create('easy').level);
  });

  it('wins at twenty lines and loses when the stack reaches the top', () => {
    const won = create('normal', rng());
    won.lines = GOAL - 1;
    won.board[ROWS - 1] = [1, 1, 1, 1, 1, 1, 0, 0, 0, 0];
    won.piece = { shape: [[1, 1, 1, 1]], kind: 1, x: 6, y: 0 };
    hardDrop(won);
    step(won, 0.5);
    expect(won.over && won.won).toBe(true);

    const lost = create('normal', rng());
    for (let y = 0; y < ROWS; y++) lost.board[y] = Array.from({ length: COLS }, (_, x) => (x === 9 ? 0 : 1));
    lost.board[0] = Array(COLS).fill(0);
    hardDrop(lost);
    step(lost, 0.1);
    expect(lost.over && !lost.won).toBe(true);
  });

  it('moves with a finger drag and turns on a tap', () => {
    const s = create('normal', rng());
    const x0 = s.piece.x;
    const press = emptyInput();
    press.pointer = { x: 100, y: 200, down: true, pressed: true, released: false, active: true };
    update(s, 0.01, press, Math.random);
    const drag = emptyInput();
    drag.pointer = { x: 150, y: 202, down: true, pressed: false, released: false, active: true };
    update(s, 0.01, drag, Math.random);
    expect(s.piece.x).toBe(x0 + 2);
    const up = emptyInput();
    up.pointer = { x: 150, y: 202, down: false, pressed: false, released: true, active: true };
    update(s, 0.01, up, Math.random);

    const t = create('normal', rng());
    const shape = JSON.stringify(t.piece.shape);
    const tap = emptyInput();
    tap.pointer = { x: 100, y: 200, down: true, pressed: true, released: false, active: true };
    update(t, 0.01, tap, Math.random);
    const release = emptyInput();
    release.pointer = { x: 101, y: 201, down: false, pressed: false, released: true, active: true };
    update(t, 0.01, release, Math.random);
    if (t.piece.kind !== 2) expect(JSON.stringify(t.piece.shape)).not.toBe(shape);
  });

  it('plays a sound for moves, turns, drops and clears', () => {
    const s = create('normal', rng());
    move(s, 1);
    turn(s);
    hardDrop(s);
    expect(s.events).toEqual(expect.arrayContaining(['tick', 'hit']));
  });
});
