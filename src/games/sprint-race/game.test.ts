import { describe, expect, it } from 'vitest';
import { emptyInput } from '../_shared/arcade/kit';
import { create, placeOf, stride, update } from './game';

function run(s: ReturnType<typeof create>, tapsPerSecond: number) {
  for (let i = 0; i < 60 * 45 && !s.over; i++) {
    s.time += 1 / 60;
    if (s.phase === 'running' && i % Math.round(60 / tapsPerSecond) === 0) stride(s, i % 2 ? 'left' : 'right');
    update(s, 1 / 60, emptyInput());
  }
}

describe('sprint race', () => {
  it('alternating feet adds speed; repeating a foot does not', () => {
    const s = create('normal', () => 0.5);
    s.phase = 'running';
    stride(s, 'left');
    const v = s.me.speed;
    stride(s, 'left');
    expect(s.me.speed).toBe(v);
    stride(s, 'right');
    expect(s.me.speed).toBeGreaterThan(v);
  });

  it('pressing before the gun is a false start', () => {
    const s = create('normal', () => 0.5);
    stride(s, 'left');
    expect(s.falseStart).toBe(true);
    expect(s.penalty).toBe(1);
  });

  it('fast tapping wins, slow tapping loses', () => {
    const fast = create('normal', () => 0.5);
    run(fast, 12);
    expect(placeOf(fast)).toBe(1);
    const slow = create('normal', () => 0.5);
    run(slow, 4);
    expect(placeOf(slow)).toBeGreaterThan(1);
  });
});
