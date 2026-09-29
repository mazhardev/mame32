import { describe, expect, it } from 'vitest';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { bezier, create, slotPos, spec, update } from './game';

describe('alien shooter', () => {
  it('follows Bézier flight paths from start to end', () => {
    const p: [number, number][] = [[0, 0], [10, 50], [90, 50], [100, 0]];
    expect(bezier(p, 0)).toEqual([0, 0]);
    expect(bezier(p, 1)).toEqual([100, 0]);
    expect(bezier(p, 0.5)[1]).toBeGreaterThan(30);
  });

  it('flies every alien into formation', () => {
    const s = create('easy');
    s.diveRate = 999;
    s.diveT = 999;
    simulate(spec, s, 12, emptyInput(), () => 0.5);
    expect(s.aliens.every((a) => a.mode === 'formation')).toBe(true);
    const a = s.aliens[5];
    const [x, y] = slotPos(s, a.slot);
    expect(a.x).toBeCloseTo(x);
    expect(a.y).toBeCloseTo(y);
  });

  it('sends formation aliens on dives', () => {
    const s = create('normal');
    s.aliens.forEach((a) => {
      a.mode = 'formation';
      a.delay = 0;
    });
    s.diveT = 0;
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.aliens.some((a) => a.mode === 'diving')).toBe(true);
  });

  it('scores double for hitting a diving alien', () => {
    const s = create('normal');
    const a = s.aliens[31];
    s.aliens.forEach((x) => (x.alive = x === a));
    a.delay = 0;
    a.mode = 'diving';
    a.path = [[200, 300], [200, 300], [200, 300], [200, 300]];
    a.t = 0.5;
    s.shots.push({ x: 200, y: 305, vx: 0, vy: 0, enemy: false });
    update(s, 1 / 120, emptyInput(), () => 0.99);
    expect(s.score).toBe(100 + 500); // 50 × 2, then the stage-clear bonus
    expect(s.stage).toBe(2);
  });
});
