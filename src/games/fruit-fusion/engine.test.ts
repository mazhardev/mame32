import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { createRng } from '@/utils/random';
import { DANGER_TIME, FRUITS, JAR, LINE_Y, TOP_TIER, create, drop, radius, update } from './engine';
import type { State } from './engine';

const run = (s: State, secs: number) => {
  for (let t = 0; t < secs && !s.over; t += 1 / 60) update(s, 1 / 60, emptyInput(), Math.random);
};

describe('fruit fusion', () => {
  it('drops a fruit that falls and rests on the jar floor', () => {
    const s = create('normal', createRng('ff').next);
    s.current = 2;
    s.aimX = 180;
    expect(drop(s)).toBe(true);
    run(s, 2);
    const f = s.fruits[0];
    expect(f.y).toBeCloseTo(JAR.bottom - radius(2), 0);
    expect(Math.abs(f.vy)).toBeLessThan(20);
  });

  it('waits a moment between drops', () => {
    const s = create('normal');
    expect(drop(s)).toBe(true);
    expect(drop(s)).toBe(false);
    run(s, 0.6);
    expect(drop(s)).toBe(true);
  });

  it('fuses two of a kind into the next kind and scores it', () => {
    const s = create('normal');
    s.fruits = [
      { id: 1, tier: 3, x: 150, y: 500, vx: 0, vy: 0, age: 2, over: 0, dead: false },
      { id: 2, tier: 3, x: 150 + radius(3) * 2 - 4, y: 500, vx: 0, vy: 0, age: 2, over: 0, dead: false },
    ];
    run(s, 0.05);
    expect(s.fruits).toHaveLength(1);
    expect(s.fruits[0].tier).toBe(4);
    expect(s.score).toBe(FRUITS[4].points);
    expect(s.best).toBe(4);
  });

  it('does not fuse different kinds: they push apart instead', () => {
    const s = create('normal');
    s.fruits = [
      { id: 1, tier: 2, x: 170, y: 500, vx: 0, vy: 0, age: 2, over: 0, dead: false },
      { id: 2, tier: 4, x: 180, y: 500, vx: 0, vy: 0, age: 2, over: 0, dead: false },
    ];
    run(s, 1);
    expect(s.fruits).toHaveLength(2);
    const [a, b] = s.fruits;
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(radius(2) + radius(4) - 1.5);
  });

  it('pops two watermelons for a bonus', () => {
    const s = create('normal');
    const r = radius(TOP_TIER);
    s.fruits = [
      { id: 1, tier: TOP_TIER, x: JAR.left + r, y: 480, vx: 0, vy: 0, age: 2, over: 0, dead: false },
      { id: 2, tier: TOP_TIER, x: JAR.left + r * 3 - 6, y: 480, vx: 0, vy: 0, age: 2, over: 0, dead: false },
    ];
    run(s, 0.05);
    expect(s.fruits).toHaveLength(0);
    expect(s.score).toBe(FRUITS[TOP_TIER].points * 4);
  });

  it('ends when a fruit stays above the line', () => {
    const s = create('normal');
    // A tower of different fruit reaching over the line.
    let y = JAR.bottom;
    let id = 1;
    for (const tier of [10, 9, 8, 7, 6, 5]) {
      const r = radius(tier);
      y -= r;
      s.fruits.push({ id: id++, tier, x: 180, y, vx: 0, vy: 0, age: 2, over: 0, dead: false });
      y -= r;
    }
    expect(y).toBeLessThan(LINE_Y);
    run(s, DANGER_TIME + 3);
    expect(s.over).toBe(true);
  });

  it('aims with keys inside the jar', () => {
    const s = create('normal');
    update(s, 2, inputWith(['left']), Math.random);
    expect(s.aimX).toBe(JAR.left + radius(s.current));
  });

  it('only ever hands out small fruit to drop', () => {
    const s = create('easy', createRng('tiers').next);
    for (let i = 0; i < 50; i++) {
      expect(s.current).toBeLessThan(4);
      s.cooldown = 0;
      drop(s);
    }
  });
});
