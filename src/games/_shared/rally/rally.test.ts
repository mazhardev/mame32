import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { COURT as TT, SKILL as TT_SKILL } from '../../table-tennis/game';
import { createRally, emptyControl, predictIntercept, strike, updateRally } from './rally';
import type { Court, Rally, Side } from './rally';

/** A human who always walks to where the ball can be played. */
function perfectControl(r: Rally) {
  const c = emptyControl();
  c.serve = true;
  if (r.ball.lastHitter === 1) c.target = predictIntercept(r, 0);
  return c;
}

function playPoint(r: Rally, random: () => number, control = perfectControl) {
  for (let i = 0; i < 60 * 60; i++) {
    const res = updateRally(r, 1 / 60, control(r), random);
    if (res) return res;
  }
  return null;
}

describe('rally engine', () => {
  it('a strike lands on its target', () => {
    const r = createRally(TT, TT_SKILL.normal, 0);
    r.phase = 'play';
    strike(r, 0, 0.3, -0.9, 0.7);
    for (let i = 0; i < 600 && r.ball.bounces === 0; i++) {
      const prevZ = r.ball.z;
      updateRally(r, 1 / 240, emptyControl(), Math.random);
      if ((r.ball.bounces as number) === 1) {
        expect(r.ball.x).toBeCloseTo(0.3, 1);
        expect(r.ball.y).toBeCloseTo(-0.9, 1);
        expect(prevZ).toBeGreaterThan(0);
      }
    }
    expect(r.ball.bounces).toBe(1);
  });

  it('a ball into the net loses the point for the hitter', () => {
    const r = createRally(TT, TT_SKILL.normal, 0);
    r.phase = 'play';
    strike(r, 0, 0, -0.9, 0.7, true);
    expect(playPoint(r, Math.random, () => emptyControl())?.winner).toBe(1);
  });

  it('a ball that bounces twice on your side is the computer’s point', () => {
    const r = createRally(TT, TT_SKILL.normal, 1);
    r.phase = 'play';
    r.players[0].x = TT.width; // far away from the ball
    strike(r, 1, -0.5, 1.0, 0.7);
    const res = playPoint(r, Math.random, () => emptyControl());
    expect(res).toEqual({ winner: 1, reason: 'Missed it' });
  });

  it('shots landing out of bounds lose the point', () => {
    const r = createRally(TT, TT_SKILL.normal, 0);
    r.phase = 'play';
    strike(r, 0, TT.width, -1, 0.7);
    expect(playPoint(r, Math.random, () => emptyControl())).toEqual({ winner: 1, reason: 'Out' });
  });

  it('a well-placed player keeps the rally going against an error-free computer', () => {
    const court: Court = { ...TT };
    const r = createRally(court, { ...TT_SKILL.hard, error: 0 }, 0);
    const random = createRng(4).next;
    playPoint(r, random);
    expect(r.longest).toBeGreaterThan(8);
  });

  it('weaker computer opponents lose more points to a perfect player', () => {
    const won = (skill: typeof TT_SKILL.easy) => {
      let wins = 0;
      const random = createRng(9).next;
      for (let i = 0; i < 30; i++) {
        const r = createRally(TT, skill, (i % 2) as Side);
        if (playPoint(r, random)?.winner === 0) wins++;
      }
      return wins;
    };
    expect(won(TT_SKILL.easy)).toBeGreaterThan(won(TT_SKILL.hard));
  });
});
