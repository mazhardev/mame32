import { describe, expect, it } from 'vitest';
import { buildTrack, nearest } from './track';
import { CAR, drive, makeCar, slipAngle, speedOf } from './car';
import { createRace, positionOf, updateRace } from './race';

const OVAL: [number, number][] = [
  [0, 0],
  [600, 0],
  [800, 200],
  [600, 400],
  [0, 400],
  [-200, 200],
];

describe('racing kit', () => {
  it('builds a closed track and finds the nearest point with a signed offset', () => {
    const t = buildTrack(OVAL, 90);
    expect(t.length).toBeGreaterThan(1800);
    const n = nearest(t, t.xs[50], t.ys[50]);
    expect(n.index).toBe(50);
    expect(Math.abs(n.offset)).toBeLessThan(1);
    const left = nearest(t, t.xs[50], t.ys[50] - 30).offset;
    const right = nearest(t, t.xs[50], t.ys[50] + 30).offset;
    expect(Math.sign(left)).not.toBe(Math.sign(right));
  });

  it('cars accelerate, turn and slide with low grip', () => {
    const c = makeCar(0, 0, 0, 'red');
    for (let i = 0; i < 60; i++) drive(c, { throttle: 1, steer: 0 }, CAR, 1 / 60);
    expect(speedOf(c)).toBeGreaterThan(150);
    for (let i = 0; i < 30; i++) drive(c, { throttle: 1, steer: 1, handbrake: true }, CAR, 1 / 60);
    expect(Math.abs(slipAngle(c))).toBeGreaterThan(0.1);
  });

  it('AI drivers complete laps and the race finishes', () => {
    const t = buildTrack(OVAL, 110);
    const core = createRace(t, 2, ['A', 'B'], ['red', 'blue'], [0.7, 0.4]);
    for (let i = 0; i < 60 * 120 && core.finishOrder.length < 2; i++) updateRace(core, 1 / 60, { throttle: 0, steer: 0 }, CAR, CAR, () => 0.5);
    expect(core.finishOrder).toHaveLength(2);
    expect(core.racers[0].bestLap).not.toBeNull();
    expect(positionOf(core, core.racers[core.finishOrder[0]])).toBe(1);
  });
});
