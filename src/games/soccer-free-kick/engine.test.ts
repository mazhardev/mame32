import { describe, expect, it } from 'vitest';
import { GOAL_H, WALL_D, goalPoints, launch, makeKick, simulate, step } from './engine';
import type { Kick, Shot } from './engine';

const kick: Kick = { dist: 22, goalX: 0, wall: [] };
const slowKeeper = { reaction: 10, speed: 0, reach: 0.5 };

/** Search for a shot that scores from a kick. */
function findGoal(k: Kick, keeper = slowKeeper, wallH = 1.9) {
  for (let yawI = -20; yawI <= 20; yawI++)
    for (const pitch of [0.12, 0.16, 0.2, 0.24, 0.28])
      for (const speed of [22, 26, 30])
        for (const spin of [-1, 0, 1]) {
          const shot: Shot = { speed, yaw: (yawI / 20) * 0.4, pitch, spin };
          const sim = simulate(k, shot, keeper, wallH);
          if (sim.result === 'goal') return { shot, sim };
        }
  return null;
}

describe('free kick physics', () => {
  it('spin bends the ball sideways', () => {
    const plain = launch({ speed: 25, yaw: 0, pitch: 0.2, spin: 0 });
    const curled = launch({ speed: 25, yaw: 0, pitch: 0.2, spin: 1 });
    for (let i = 0; i < 200; i++) {
      step(plain, 0, 1 / 240);
      step(curled, 1, 1 / 240);
    }
    expect(Math.abs(plain.x)).toBeLessThan(0.01);
    expect(curled.x).toBeGreaterThan(0.3);
  });

  it('a straight driven shot scores against no keeper; one far too high goes over', () => {
    expect(simulate(kick, { speed: 28, yaw: 0, pitch: 0.12, spin: 0 }, slowKeeper, 0).result).toBe(
      'goal',
    );
    expect(simulate(kick, { speed: 30, yaw: 0, pitch: 0.5, spin: 0 }, slowKeeper, 0).result).toBe(
      'over',
    );
  });

  it('the wall blocks a low shot through it', () => {
    const k = { ...kick, wall: [0] };
    expect(simulate(k, { speed: 25, yaw: 0, pitch: 0.05, spin: 0 }, slowKeeper, 1.9).result).toBe(
      'wall',
    );
  });

  it('a quick keeper saves a shot at the middle of the goal', () => {
    const keeper = { reaction: 0.05, speed: 6, reach: 0.9 };
    expect(simulate(kick, { speed: 24, yaw: 0, pitch: 0.12, spin: 0 }, keeper, 0).result).toBe(
      'saved',
    );
  });

  it('every generated kick can be scored past the wall', () => {
    let seed = 7;
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let n = 0; n < 10; n++) {
      const k = makeKick(n, random);
      expect(k.wall.length).toBeGreaterThanOrEqual(3);
      expect(findGoal(k)).not.toBeNull();
    }
  });

  it('top corners are worth more', () => {
    expect(goalPoints(kick, { x: 3.4, z: GOAL_H * 0.9 })).toBeGreaterThan(
      goalPoints(kick, { x: 0, z: 0.5 }),
    );
    expect(WALL_D).toBeCloseTo(9.15);
  });
});
