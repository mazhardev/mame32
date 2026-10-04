import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { create, release, spec, swipeHook } from './game';

function finishRolling(s: ReturnType<typeof create>) {
  for (let i = 0; i < 60 * 15 && s.phase === 'rolling'; i++)
    spec.update(s, 1 / 60, emptyInput(), Math.random);
}

describe('bowling game flow', () => {
  it('keys move through position, aim, power and roll', () => {
    const s = create('normal', () => 0.5);
    spec.update(s, 1 / 60, inputWith([], ['action']), Math.random);
    expect(s.phase).toBe('aim');
    spec.update(s, 1 / 60, inputWith([], ['action']), Math.random);
    expect(s.phase).toBe('power');
    spec.update(s, 1 / 60, inputWith([], ['action']), Math.random);
    expect(s.phase).toBe('rolling');
    finishRolling(s);
    expect(s.phase).toBe('result');
    expect(s.rolls).toHaveLength(1);
  });

  it('a strike resets the rack and an open frame moves on', () => {
    const s = create('easy', () => 0.5);
    s.x = 20 - Math.tan(-0.01) * 2780;
    release(s, -0.01, 0.67, 0);
    finishRolling(s);
    const first = s.rolls[0];
    expect(first).toBeGreaterThan(5);
    if (first === 10) expect(s.standing).toHaveLength(10);
    else expect(s.standing).toHaveLength(10 - first);
  });

  it('a whole game of gutter balls ends with 0 after 20 balls', () => {
    const s = create('normal', () => 0.5);
    let balls = 0;
    while (!s.over && balls < 30) {
      s.x = 70;
      release(s, 0.04, 0.5, 0);
      finishRolling(s);
      for (let i = 0; i < 200 && s.phase === 'result'; i++)
        spec.update(s, 1 / 60, emptyInput(), Math.random);
      balls++;
    }
    expect(s.over).toBe(true);
    expect(balls).toBe(20);
    expect(s.score).toBe(0);
  });

  it('a swipe bowed to the right hooks left', () => {
    const path = [
      { x: 0, y: 0 },
      { x: 20, y: -50 },
      { x: 0, y: -100 },
    ];
    expect(swipeHook(path)).toBeLessThan(0);
    expect(swipeHook(path.map((p) => ({ x: -p.x, y: p.y })))).toBeGreaterThan(0);
  });
});
