import { describe, expect, it } from 'vitest';
import {
  BALL_R,
  HALF,
  knocked,
  marks,
  position,
  rack,
  runRoll,
  scoreFrames,
  startRoll,
} from './engine';

describe('bowling scoring', () => {
  it('scores gutter, perfect and all-spare games', () => {
    expect(scoreFrames(Array(20).fill(0)).at(-1)).toBe(0);
    expect(scoreFrames(Array(12).fill(10)).at(-1)).toBe(300);
    expect(scoreFrames(Array(21).fill(5)).at(-1)).toBe(150);
  });

  it('adds strike and spare bonuses frame by frame', () => {
    expect(scoreFrames([10, 7, 3, 9, 0])).toEqual([20, 39, 48]);
    expect(scoreFrames([10, 7])).toEqual([null]);
    expect(scoreFrames([6, 4])).toEqual([null]);
    expect(scoreFrames([3, 4, 6])).toEqual([7, null]);
  });

  it('tracks the frame, ball and when the rack is reset', () => {
    expect(position([])).toEqual({ frame: 0, ball: 0, over: false, fullRack: true });
    expect(position([7])).toEqual({ frame: 0, ball: 1, over: false, fullRack: false });
    expect(position([10])).toEqual({ frame: 1, ball: 0, over: false, fullRack: true });
    const nine = Array(18).fill(0);
    expect(position([...nine, 3, 4]).over).toBe(true);
    expect(position([...nine, 7, 3])).toEqual({ frame: 9, ball: 2, over: false, fullRack: true });
    expect(position([...nine, 10, 4])).toEqual({ frame: 9, ball: 2, over: false, fullRack: false });
    expect(position([...nine, 10, 10, 10]).over).toBe(true);
  });

  it('writes X, / and - marks', () => {
    expect(marks([10, 7, 3, 0, 5])).toEqual([
      ['', 'X'],
      ['7', '/'],
      ['-', '5'],
    ]);
    expect(marks([...Array(18).fill(0), 10, 10, 10]).at(-1)).toEqual(['X', 'X', 'X']);
    expect(marks([...Array(18).fill(0), 7, 3, 10]).at(-1)).toEqual(['7', '/', 'X']);
  });
});

describe('pin action', () => {
  it('a pocket shot knocks down most of the rack', () => {
    const r = runRoll(startRoll(rack(), 26, -0.004, 1150, 0));
    expect(knocked(r)).toBeGreaterThanOrEqual(7);
  });

  it('a ball in the gutter knocks nothing', () => {
    const r = runRoll(startRoll(rack(), HALF - BALL_R * 0.2, 0.02, 1100, 0));
    expect(r.ball.gutter).toBe(true);
    expect(knocked(r)).toBe(0);
  });

  it('hook moves the ball across the back end', () => {
    const straight = runRoll(startRoll([], 40, 0, 1100, 0));
    const hooked = runRoll(startRoll([], 40, 0, 1100, -1));
    expect(hooked.ball.x).toBeLessThan(straight.ball.x - 30);
  });

  it('only the remaining pins are racked for a second ball', () => {
    const pins = rack([7, 10]);
    expect(pins.map((p) => p.n)).toEqual([7, 10]);
  });
});
