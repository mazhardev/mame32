import { describe, expect, it } from 'vitest';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { createRng } from '@/utils/random';
import { GOAL_W, H, MALLET_R, PUCK_R, W, clampMallet, collide, create, movePuck, spec } from './game';

describe('air hockey', () => {
  it('the puck bounces off the side boards and stays on the table', () => {
    const p = { x: 20, y: 300, vx: -800, vy: 0 };
    for (let i = 0; i < 100; i++) expect(movePuck(p, 1 / 240)).toBeNull();
    expect(p.x).toBeGreaterThanOrEqual(PUCK_R);
    expect(p.vx).toBeGreaterThan(0);
  });

  it('a puck through the top slot is your goal; off the end board it bounces', () => {
    const goal = { x: W / 2, y: 40, vx: 0, vy: -900 };
    let scored = null;
    for (let i = 0; i < 200 && scored === null; i++) scored = movePuck(goal, 1 / 240);
    expect(scored).toBe(0);
    const wide = { x: W / 2 + GOAL_W, y: 40, vx: 0, vy: -900 };
    for (let i = 0; i < 60; i++) expect(movePuck(wide, 1 / 240)).toBeNull();
    expect(wide.vy).toBeGreaterThan(0);
  });

  it('a moving mallet adds its speed to the puck', () => {
    const still = { x: 100, y: 300, vx: 0, vy: 0 };
    expect(collide(still, { x: 100, y: 300 + PUCK_R + MALLET_R - 2, vx: 0, vy: -600 })).toBe(true);
    expect(still.vy).toBeLessThan(-900);
  });

  it('mallets cannot cross the centre line', () => {
    const m = { x: W / 2, y: 100, vx: 0, vy: 0 };
    clampMallet(m, false);
    expect(m.y).toBeGreaterThanOrEqual(H / 2 + MALLET_R);
    clampMallet(m, true);
    expect(m.y).toBeLessThanOrEqual(H / 2 - MALLET_R);
  });

  it('the computer attacks a puck in its half and beats an idle player', () => {
    const s = create('hard');
    s.puck.y = H * 0.3;
    simulate(spec, s, 20, emptyInput(), createRng(3).next);
    expect(s.goals[1]).toBeGreaterThan(0);
  });

  it('a stronger computer saves more of the same shots', () => {
    const conceded = (d: 'easy' | 'hard') => {
      const rng = createRng(11).next;
      let goals = 0;
      for (let k = 0; k < 40; k++) {
        const s = create(d);
        s.puck = { x: 60 + (k % 8) * 34, y: H * 0.6, vx: 0, vy: 0 };
        const gx = (k % 2 ? -1 : 1) * W * 0.4 + W / 2 + ((k % 5) - 2) * 22;
        const bank = k % 3 === 0;
        const dx = (bank ? gx : W / 2 + ((k % 5) - 2) * 22) - s.puck.x;
        const dy = -s.puck.y;
        const len = Math.hypot(dx, dy);
        s.puck.vx = (dx / len) * 950;
        s.puck.vy = (dy / len) * 950;
        s.me.y = H - 40;
        for (let t = 0; t < 120 && s.goals[0] + s.goals[1] === 0; t++) {
          s.time += 1 / 60;
          spec.update(s, 1 / 60, emptyInput(), rng);
        }
        goals += s.goals[0];
      }
      return goals;
    };
    expect(conceded('easy')).toBeGreaterThan(conceded('hard'));
  });
});
