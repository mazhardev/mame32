import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { BOW, GRAVITY, MAX_SPEED, create, multiplier, ringScore, shoot, spec } from './game';
import type { State } from './game';

const rng = () => 0.5;

/** A calm range with no balloons and the board parked out of the way. */
function range(): State {
  const s = create('normal', rng);
  s.windT = 999;
  s.wind = 0;
  s.spawnT = 999;
  Object.assign(s.board, { x: 2000, range: 0 });
  return s;
}

const step = (s: State, seconds: number, input = emptyInput()) => simulate(spec, s, seconds, input, rng);

describe('archery challenge', () => {
  it('flies arrows on a gravity arc', () => {
    const s = range();
    shoot(s, -0.5, 1);
    const a = s.arrows[0];
    const [x0, y0, vy0] = [a.x, a.y, a.vy];
    step(s, 0.5);
    const t = a.age;
    expect(a.x - x0).toBeCloseTo(Math.cos(-0.5) * MAX_SPEED * t, -1);
    // Semi-implicit Euler lands within a few pixels of the exact parabola.
    expect(Math.abs(a.y - y0 - (vy0 * t + 0.5 * GRAVITY * t * t))).toBeLessThan(6);
  });

  it('drifts arrows with the wind', () => {
    const calm = range();
    const windy = range();
    windy.wind = 60;
    shoot(calm, -0.6, 0.8);
    shoot(windy, -0.6, 0.8);
    step(calm, 0.8);
    step(windy, 0.8);
    expect(windy.arrows[0].x).toBeGreaterThan(calm.arrows[0].x + 10);
  });

  it('needs a moment to reload between shots', () => {
    const s = range();
    expect(shoot(s, -0.3, 1)).toBe(true);
    expect(shoot(s, -0.3, 1)).toBe(false);
    step(s, 0.5);
    expect(shoot(s, -0.3, 1)).toBe(true);
    expect(s.shots).toBe(2);
  });

  it('pops every balloon an arrow passes through', () => {
    const s = range();
    for (const x of [200, 260]) s.balloons.push({ x, y: BOW.y + 1, vy: 0, color: '#f00', gold: false, sway: 0 });
    shoot(s, 0, 1);
    step(s, 0.4);
    expect(s.balloons).toHaveLength(0);
    expect(s.popped).toBe(2);
    expect(s.bestPierce).toBe(2);
    expect(s.score).toBe(20);
    expect(s.streak).toBe(1);
  });

  it('gives extra time for golden balloons', () => {
    const s = range();
    s.balloons.push({ x: 200, y: BOW.y + 1, vy: 0, color: '#f00', gold: true, sway: 0 });
    const before = s.timeLeft;
    shoot(s, 0, 1);
    step(s, 0.2);
    expect(s.score).toBe(30);
    expect(s.timeLeft).toBeGreaterThan(before + 2.5);
  });

  it('scores the target board by ring', () => {
    expect(ringScore(0)).toBe(50);
    expect(ringScore(10)).toBe(30);
    expect(ringScore(20)).toBe(20);
    expect(ringScore(29)).toBe(10);
    expect(ringScore(31)).toBe(0);
    const s = range();
    Object.assign(s.board, { x: 220, baseY: BOW.y + 1, y: BOW.y + 1, range: 0 });
    shoot(s, 0, 1);
    step(s, 0.3);
    expect(s.bullseyes).toBe(1);
    expect(s.score).toBe(50);
    expect(s.board.stuck).toHaveLength(1);
    expect(s.arrows).toHaveLength(0);
  });

  it('builds a streak multiplier and resets it on a miss', () => {
    expect([0, 2, 3, 5, 6, 10].map(multiplier)).toEqual([1, 1, 2, 2, 3, 3]);
    const s = range();
    for (let i = 0; i < 3; i++) {
      s.balloons.push({ x: 220, y: BOW.y + 1, vy: 0, color: '#f00', gold: false, sway: 0 });
      shoot(s, 0, 1);
      step(s, 0.5);
    }
    expect(s.streak).toBe(3);
    expect(s.score).toBe(10 + 10 + 20);
    // A shot into the ground ends the streak.
    shoot(s, 0.4, 0.3);
    step(s, 1);
    expect(s.streak).toBe(0);
  });

  it('draws with Space and looses the arrow on release', () => {
    const s = range();
    step(s, 0.5, inputWith(['action']));
    expect(s.drawing).toBe(true);
    expect(s.power).toBeGreaterThan(0.4);
    expect(s.arrows).toHaveLength(0);
    step(s, 1 / 60);
    expect(s.arrows).toHaveLength(1);
    expect(s.drawing).toBe(false);
  });

  it('shoots in the direction opposite to a drag', () => {
    const s = range();
    const input = emptyInput();
    Object.assign(input.pointer, { x: 300, y: 200, down: true, pressed: true, active: true });
    step(s, 1 / 60, input);
    Object.assign(input.pointer, { x: 220, y: 260, pressed: false });
    step(s, 1 / 60, input);
    Object.assign(input.pointer, { down: false, released: true });
    step(s, 1 / 60, input);
    const a = s.arrows[0];
    expect(a.vx).toBeGreaterThan(0);
    expect(a.vy).toBeLessThan(0);
  });

  it('ends when the clock runs out', () => {
    const s = range();
    s.timeLeft = 0.5;
    step(s, 1);
    expect(s.over).toBe(true);
    expect(spec.result(s).title).toMatch(/Time/);
  });

  it('spawns rising balloons during a round', () => {
    const s = create('normal', Math.random);
    step(s, 4);
    expect(s.balloons.length).toBeGreaterThan(1);
    expect(s.balloons.every((b) => b.x > 250)).toBe(true);
  });
});
