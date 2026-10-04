import { describe, expect, it } from 'vitest';
import { emptyInput } from '../_shared/arcade/kit';
import { SKI_Y, create, update } from './game';

describe('jet ski racing', () => {
  it('passing through a gate adds time; missing one removes it', () => {
    const s = create('normal');
    s.nextGate = 9999;
    s.gates.push({ x: s.x, y: SKI_Y - 1, width: 120, done: false });
    const t = s.timeLeft;
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.passed).toBe(1);
    expect(s.timeLeft).toBeGreaterThan(t);
    s.gates.push({ x: 20, y: SKI_Y - 1, width: 60, done: false });
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.missed).toBe(1);
  });

  it('time runs out without gates', () => {
    const s = create('easy');
    s.nextGate = 1e9;
    for (let i = 0; i < 60 * 25; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });
});
