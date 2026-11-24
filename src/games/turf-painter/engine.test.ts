import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { createRng } from '@/utils/random';
import { COLS, ROWS, botThink, claim, create, shareOf, update } from './engine';
import type { State } from './engine';

const idx = (x: number, y: number) => y * COLS + x;
/** A state with only you, at the centre. */
const solo = () => {
  const s = create('easy', createRng('solo').next);
  for (const p of s.players.slice(1)) {
    p.alive = false;
    p.respawn = 999;
    for (let i = 0; i < s.owner.length; i++) if (s.owner[i] === p.id) s.owner[i] = 0;
  }
  s.players[0].dir = s.players[0].want = 1;
  s.waiting = false;
  return s;
};
const steps = (s: State, n: number, dir: 'up' | 'down' | 'left' | 'right') => {
  const you = s.players[0];
  for (let k = 0; k < n && !s.over; k++) {
    you.t = 0.999;
    update(s, 0.01, inputWith([dir]), Math.random);
  }
};

describe('turf painter', () => {
  it('starts everyone with a 3×3 patch of land', () => {
    const s = create('normal', createRng('t').next);
    expect(s.players).toHaveLength(4);
    for (const p of s.players) expect(s.owner.filter((o) => o === p.id).length).toBe(9);
    expect(shareOf(s, 1)).toBeCloseTo(9 / (COLS * ROWS));
  });

  it('leaves a trail outside your land and claims the loop when you return', () => {
    const s = solo();
    const you = s.players[0];
    const before = shareOf(s, 1);
    steps(s, 4, 'right');
    expect(you.trail.length).toBeGreaterThan(0);
    steps(s, 4, 'down');
    steps(s, 4, 'left');
    steps(s, 4, 'up');
    expect(you.trail).toHaveLength(0);
    expect(shareOf(s, 1)).toBeGreaterThan(before * 2);
  });

  it('fills everything inside the loop', () => {
    const s = solo();
    const you = s.players[0];
    // A hand-made loop from the land at (19,18) around a 4×4 box.
    you.trail = [];
    for (let x = 20; x <= 24; x++) you.trail.push(idx(x, 17));
    for (let y = 18; y <= 22; y++) you.trail.push(idx(24, y));
    for (let x = 23; x >= 18; x--) you.trail.push(idx(x, 22));
    for (let y = 21; y >= 20; y--) you.trail.push(idx(18, y));
    claim(s, you);
    expect(s.owner[idx(22, 20)]).toBe(1);
    expect(s.owner[idx(30, 30)]).toBe(0);
  });

  it('knocks you out when you cross your own trail or leave the map', () => {
    const a = solo();
    steps(a, 4, 'right');
    steps(a, 2, 'down');
    steps(a, 2, 'left');
    steps(a, 3, 'up');
    expect(a.over).toBe(true);
    expect(a.cause).toMatch(/own trail/);

    const b = solo();
    steps(b, ROWS, 'up');
    expect(b.over).toBe(true);
    expect(b.cause).toMatch(/edge/);
  });

  it('knocks out a rival whose trail you cross, and counts it', () => {
    const s = create('easy', createRng('cut').next);
    const you = s.players[0];
    const rival = s.players[1];
    you.dir = you.want = 1;
    s.waiting = false;
    for (const p of s.players.slice(2)) p.alive = false;
    rival.speed = 0;
    rival.alive = true;
    rival.trail = [idx(you.x + 3, you.y)];
    s.trailOf[idx(you.x + 3, you.y)] = rival.id;
    steps(s, 3, 'right');
    expect(rival.alive).toBe(false);
    expect(you.kills).toBe(1);
    expect(s.over).toBe(false);
  });

  it('wins once your land reaches the goal', () => {
    const s = solo();
    for (let i = 0; i < Math.ceil(s.owner.length * s.cfg.goal); i++) s.owner[i] = 1;
    update(s, 0.01, emptyInput(), Math.random);
    expect(s.won && s.over).toBe(true);
  });

  it('waits for your first turn before you move', () => {
    const s = create('normal', createRng('wait').next);
    const you = s.players[0];
    const [x, y] = [you.x, you.y];
    update(s, 2, emptyInput(), Math.random);
    expect([you.x, you.y]).toEqual([x, y]);
    update(s, 0.2, inputWith(['left']), Math.random);
    expect(you.x).toBeLessThan(x);
  });

  it('runs a whole game of bots without errors', () => {
    const s = create('hard', createRng('bots').next);
    s.waiting = false;
    const you = s.players[0];
    for (let t = 0; t < 60 && !s.over; t += 1 / 30) {
      botThink(s, you, Math.random);
      const input = emptyInput();
      input.pressed.add((['up', 'right', 'down', 'left'] as const)[you.want]);
      update(s, 1 / 30, input, Math.random);
    }
    for (let i = 0; i < s.owner.length; i++) expect(s.owner[i]).toBeLessThanOrEqual(5);
  });
});
