import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { CHECKPOINT, create, update } from './game';

describe('highway racer', () => {
  it('a checkpoint adds time', () => {
    const s = create('normal');
    s.spawnIn = 999;
    s.distance = CHECKPOINT - 1;
    s.speed = 300;
    const t = s.timeLeft;
    update(s, 1 / 60, inputWith(['up']), () => 0.5);
    expect(s.checkpoints).toBe(1);
    expect(s.timeLeft).toBeGreaterThan(t + 10);
  });

  it('crashing slows you down instead of ending the run', () => {
    const s = create('normal');
    s.spawnIn = 999;
    s.speed = 500;
    s.road.traffic.push({ x: s.x, y: 600 - 110, w: 44, h: 82, speed: 200, color: 'red', kind: 'car', passed: false, changing: 0, targetX: s.x });
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.crashes).toBe(1);
    expect(s.speed).toBeLessThan(200);
    expect(s.over).toBe(false);
  });

  it('the run ends when time runs out', () => {
    const s = create('hard');
    s.spawnIn = 999;
    for (let i = 0; i < 60 * 40; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });
});
