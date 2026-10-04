import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { BOTTOM, LEFT, POCKETS, R, RIGHT, TOP, newLog, rackBalls, simulateShot, step } from './physics';
import type { Ball } from './physics';
import { judge } from './rules';
import type { Table } from './rules';
import { candidates, planShot } from './ai';

const ball = (n: number, x: number, y: number): Ball => ({ n, x, y, vx: 0, vy: 0, potted: false });
const table = (over: Partial<Table> = {}): Table => ({ groups: [null, null], turn: 0, remaining: [], isBreak: false, ...over });

describe('pool physics', () => {
  it('a full-ball hit stops the cue ball and sends the object ball on', () => {
    const balls = [ball(0, 200, 190), ball(3, 300, 190)];
    balls[0].vx = 600;
    const log = newLog();
    for (let i = 0; i < 120; i++) step(balls, 1 / 480, log);
    expect(log.firstHit).toBe(3);
    expect(Math.abs(balls[0].vx)).toBeLessThan(60);
    expect(balls[1].vx).toBeGreaterThan(300);
  });

  it('balls bounce off the cushions and come to rest on the table', () => {
    const balls = [ball(0, 300, 190)];
    simulateShot(balls, 0.3, 1400);
    const b = balls[0];
    expect(b.potted).toBe(false);
    expect(b.x).toBeGreaterThanOrEqual(LEFT + R - 0.01);
    expect(b.x).toBeLessThanOrEqual(RIGHT - R + 0.01);
    expect(b.y).toBeGreaterThanOrEqual(TOP + R - 0.01);
    expect(b.y).toBeLessThanOrEqual(BOTTOM - R + 0.01);
  });

  it('a ball rolled into a pocket is potted', () => {
    const p = POCKETS[0];
    const balls = [ball(0, 200, 200)];
    const log = simulateShot(balls, Math.atan2(p.y - 200, p.x - 200), 900);
    expect(log.potted).toEqual([0]);
  });

  it('racks 15 balls without overlaps and the 8 in the middle', () => {
    const balls = rackBalls(createRng(1).next);
    expect(balls).toHaveLength(16);
    expect(new Set(balls.map((b) => b.n)).size).toBe(16);
    for (let i = 0; i < balls.length; i++)
      for (let j = i + 1; j < balls.length; j++)
        expect(Math.hypot(balls[i].x - balls[j].x, balls[i].y - balls[j].y)).toBeGreaterThanOrEqual(R * 2);
    expect(balls[5].n).toBe(8);
  });
});

describe('8-ball rules', () => {
  it('a scratch is a foul and passes the turn', () => {
    const v = judge(table({ remaining: [1, 2, 9] }), { firstHit: 1, potted: [0, 1], cushionAfterHit: false });
    expect(v.foul).toMatch(/Scratch/);
    expect(v.again).toBe(false);
  });

  it('the first legal pot on an open table assigns groups', () => {
    const v = judge(table({ remaining: [1, 2, 9, 10, 8] }), { firstHit: 10, potted: [10], cushionAfterHit: false });
    expect(v.groups).toEqual(['stripes', 'solids']);
    expect(v.again).toBe(true);
  });

  it('hitting the other group first is a foul', () => {
    const t = table({ groups: ['solids', 'stripes'], remaining: [1, 9, 8] });
    expect(judge(t, { firstHit: 9, potted: [], cushionAfterHit: false }).foul).toMatch(/stripes/);
  });

  it('the 8 wins only after clearing your group, and loses if potted early', () => {
    const early = table({ groups: ['solids', 'stripes'], remaining: [1, 9, 8] });
    expect(judge(early, { firstHit: 1, potted: [8], cushionAfterHit: false }).winner).toBe(1);
    const on = table({ groups: ['solids', 'stripes'], remaining: [9, 8] });
    expect(judge(on, { firstHit: 8, potted: [8], cushionAfterHit: false }).winner).toBe(0);
    expect(judge(on, { firstHit: 8, potted: [8, 0], cushionAfterHit: false }).winner).toBe(1);
  });

  it('an 8 potted on the break is re-spotted', () => {
    const v = judge(table({ isBreak: true, remaining: [1, 8, 9] }), { firstHit: 1, potted: [8], cushionAfterHit: false });
    expect(v.respot8).toBe(true);
    expect(v.winner).toBeNull();
  });
});

describe('computer player', () => {
  it('finds and pots a straight-in ball', () => {
    const p = POCKETS[2];
    const balls = [ball(0, 300, 120), ball(9, 450, 80), ball(1, 200, 300), ball(8, 150, 200)];
    // Line the 9 up with the top-right pocket.
    const dir = Math.atan2(p.y - 80, p.x - 450);
    balls[0].x = 450 - Math.cos(dir) * 150;
    balls[0].y = 80 - Math.sin(dir) * 150;
    const t = table({ groups: ['solids', 'stripes'], turn: 1, remaining: [9, 1, 8] });
    const plan = planShot(balls, t, { aimError: 0, lookahead: 8 });
    expect(plan.target).toBe(9);
    const log = simulateShot(balls, plan.angle, plan.speed);
    expect(log.potted).toContain(9);
  });

  it('never plans a shot at the other group', () => {
    const balls = rackBalls(createRng(5).next);
    balls.forEach((b) => {
      if (b.n !== 0 && b.n !== 8) b.x -= 0;
    });
    const t = table({ groups: ['solids', 'stripes'], turn: 1, remaining: balls.filter((b) => b.n).map((b) => b.n) });
    for (const c of candidates(balls, t, balls[0])) expect(c.target! >= 9).toBe(true);
  });
});
