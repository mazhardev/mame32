import { describe, expect, it } from 'vitest';
import {
  DIFFICULTY_CONFIG,
  GOAL,
  PenaltyEngine,
  SWEET_SPOT,
  columnOf,
  decideShootout,
  isOnTarget,
  isSaved,
  isTopCorner,
} from './engine';
import type { ShootoutEvent } from './engine';

function run(engine: PenaltyEngine, seconds: number): ShootoutEvent[] {
  const events: ShootoutEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 60) events.push(...engine.update(1 / 60));
  return events;
}

describe('goal geometry', () => {
  it('splits the goal into three columns', () => {
    expect(columnOf(GOAL.left + 10)).toBe(-1);
    expect(columnOf(320)).toBe(0);
    expect(columnOf(GOAL.right - 10)).toBe(1);
  });

  it('detects shots that miss the frame', () => {
    expect(isOnTarget({ x: 320, y: 160 })).toBe(true);
    expect(isOnTarget({ x: GOAL.left - 5, y: 160 })).toBe(false);
    expect(isOnTarget({ x: 320, y: GOAL.top - 5 })).toBe(false);
  });

  it('a keeper in the right column saves, except in the top corners', () => {
    expect(isSaved({ x: 200, y: 200 }, -1)).toBe(true);
    expect(isSaved({ x: 200, y: 200 }, 1)).toBe(false);
    const corner = { x: GOAL.left + 20, y: GOAL.top + 15 };
    expect(isTopCorner(corner)).toBe(true);
    expect(isSaved(corner, -1)).toBe(false);
  });
});

describe('decideShootout', () => {
  it('stays open while both sides can still win', () => {
    expect(decideShootout(0, 0, 0, 0)).toBeNull();
    expect(decideShootout(3, 4, 2, 4)).toBeNull();
  });

  it('ends early when one side cannot catch up', () => {
    expect(decideShootout(3, 3, 0, 3)).toBe('player');
    expect(decideShootout(0, 4, 3, 3)).toBe('cpu');
  });

  it('goes to sudden death on a tie after five each', () => {
    expect(decideShootout(4, 5, 4, 5)).toBeNull();
    expect(decideShootout(5, 6, 4, 5)).toBeNull();
    expect(decideShootout(5, 6, 4, 6)).toBe('player');
    expect(decideShootout(4, 6, 5, 6)).toBe('cpu');
  });

  it('declares a draw when sudden death runs out', () => {
    expect(decideShootout(7, 10, 7, 10)).toBe('draw');
  });
});

describe('PenaltyEngine', () => {
  it('first press locks aim and starts the meter, second press kicks', () => {
    const e = new PenaltyEngine(DIFFICULTY_CONFIG.normal, 1);
    expect(e.phase).toBe('aim');
    e.press();
    expect(e.phase).toBe('power');
    e.update(0.2);
    expect(e.meter.value).toBeGreaterThan(0);
    expect(e.press()).toContain('kick');
    expect(e.phase).toBe('flight');
  });

  it('a perfectly timed shot into the top corner always scores', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const e = new PenaltyEngine(DIFFICULTY_CONFIG.hard, seed);
      e.setAim(GOAL.left + 22, GOAL.top + 16);
      e.kick(SWEET_SPOT);
      const events = run(e, 1);
      expect(events).toContain('goal');
      expect(e.playerGoals).toBe(1);
      expect(e.topCorners).toBe(1);
    }
  });

  it('mistimed corner shots miss more often on harder difficulties', () => {
    const misses = (level: 'easy' | 'hard') => {
      let count = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const e = new PenaltyEngine(DIFFICULTY_CONFIG[level], seed);
        e.setAim(GOAL.left + 24, GOAL.top + 20);
        e.kick(SWEET_SPOT - 0.15);
        if (run(e, 1).includes('miss')) count++;
      }
      return count;
    };
    expect(misses('hard')).toBeGreaterThan(misses('easy'));
  });

  it('a badly overhit shot flies over the bar', () => {
    const e = new PenaltyEngine(DIFFICULTY_CONFIG.normal, 3);
    e.setAim(320, GOAL.top + 20);
    e.kick(1);
    expect(run(e, 1)).toContain('miss');
    expect(e.kicks[0]).toEqual({ by: 'player', outcome: 'missed' });
  });

  it('alternates to keeping after the player shoots', () => {
    const e = new PenaltyEngine(DIFFICULTY_CONFIG.normal, 4);
    e.kick(SWEET_SPOT);
    const events = run(e, 2.2);
    expect(events).toContain('turn');
    expect(e.turn).toBe('keep');
    expect(e.phase).toBe('windup');
  });

  it('diving the right way while keeping saves an on-target kick', () => {
    let saved = 0;
    let onTarget = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const e = new PenaltyEngine(DIFFICULTY_CONFIG.easy, seed);
      e.kick(SWEET_SPOT);
      run(e, 2.2);
      run(e, 1.05); // run-up; the computer kicks
      expect(e.phase).toBe('flight');
      const target = e.target;
      e.diveTo(columnOf(target.x));
      run(e, 1.2);
      const last = e.kicks[e.kicks.length - 1];
      expect(last.by).toBe('cpu');
      if (isOnTarget(target) && !isTopCorner(target)) {
        onTarget++;
        expect(last.outcome).toBe('saved');
        saved++;
      }
    }
    expect(onTarget).toBeGreaterThan(0);
    expect(saved).toBe(onTarget);
  });

  it('cannot dive while shooting or dive twice', () => {
    const e = new PenaltyEngine(DIFFICULTY_CONFIG.normal, 5);
    e.diveTo(1);
    expect(e.playerDive).toBeNull();
    e.kick(SWEET_SPOT);
    run(e, 2.2);
    e.diveTo(-1);
    e.diveTo(1);
    expect(e.playerDive).toBe(-1);
  });

  it('plays a full shootout to a result', () => {
    const e = new PenaltyEngine(DIFFICULTY_CONFIG.normal, 9);
    let guard = 0;
    while (e.phase !== 'over' && guard++ < 40) {
      if (e.turn === 'shoot') {
        e.setAim(GOAL.right - 22, GOAL.top + 16);
        e.kick(SWEET_SPOT);
      }
      run(e, 3.5);
    }
    expect(e.phase).toBe('over');
    expect(e.winner).not.toBeNull();
    // Every player kick was unstoppable, so the player cannot lose.
    expect(e.winner).not.toBe('cpu');
    expect(e.score).toBeGreaterThanOrEqual(e.playerGoals * 100);
  });
});
