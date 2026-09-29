import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { angleGap, create, impactAngle, land, spec, update } from './game';

const rng = () => 0.37;

describe('knife throw', () => {
  it('measures the shortest angle between two knives', () => {
    expect(angleGap(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(0.2);
    expect(angleGap(1, 1)).toBe(0);
  });

  it('sticks a knife where the log is facing', () => {
    const s = create('normal', rng);
    s.knives = [];
    s.rotation = 0.5;
    const left = s.left;
    expect(land(s, rng)).toBe('stick');
    expect(s.knives).toContain(impactAngle(0.5));
    expect(s.left).toBe(left - 1);
    expect(s.score).toBe(1);
  });

  it('bounces off a knife in the same spot and ends the game', () => {
    const s = create('normal', rng);
    s.knives = [impactAngle(1.2)];
    s.rotation = 1.2 + 0.05;
    expect(land(s, rng)).toBe('bounce');
    expect(s.over).toBe(true);
  });

  it('flies up to the log when thrown', () => {
    const s = create('easy', rng);
    s.knives = [];
    s.apples = [];
    update(s, 1 / 60, inputWith([], ['action']), rng);
    expect(s.flying).not.toBeNull();
    simulate(spec, s, 0.5, emptyInput(), rng);
    expect(s.flying).toBeNull();
    expect(s.knives.length).toBe(1);
  });

  it('moves to the next stage after the last knife sticks', () => {
    const s = create('easy', rng);
    s.knives = [];
    s.left = 1;
    land(s, rng);
    simulate(spec, s, 1, emptyInput(), rng);
    expect(s.stage).toBe(2);
    expect(s.left).toBeGreaterThan(0);
  });
});
