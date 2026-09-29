import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { create, segmentDistance, slice, spec, update } from './game';

const rng = () => 0.4;

describe('fruit slice', () => {
  it('measures distance to a swipe segment', () => {
    expect(segmentDistance(5, 5, 0, 0, 10, 0)).toBeCloseTo(5);
    expect(segmentDistance(20, 0, 0, 0, 10, 0)).toBeCloseTo(10);
  });

  it('slices fruit crossed by the blade into halves', () => {
    const s = create('normal');
    s.fruits.push({ kind: 1, x: 200, y: 200, vx: 0, vy: 0, spin: 0, angle: 0, sliced: false });
    slice(s, 150, 200, 250, 200, rng);
    expect(s.score).toBe(1);
    expect(s.halves).toHaveLength(2);
  });

  it('ends the game when a bomb is sliced', () => {
    const s = create('normal');
    s.fruits.push({ kind: -1, x: 200, y: 200, vx: 0, vy: 0, spin: 0, angle: 0, sliced: false });
    slice(s, 150, 200, 250, 200, rng);
    expect(s.over).toBe(true);
  });

  it('gives a combo bonus for three fruits in one swipe', () => {
    const s = create('normal');
    s.spawnT = 99;
    for (const x of [100, 200, 300]) s.fruits.push({ kind: 2, x, y: 300, vx: 0, vy: -600, spin: 0, angle: 0, sliced: false });
    update(s, 1 / 60, inputWith([], [], { down: true, x: 60, y: 300 }), rng);
    update(s, 1 / 60, inputWith([], [], { down: true, x: 360, y: 300 }), rng);
    update(s, 1 / 60, emptyInput(), rng); // swipe ends
    expect(s.sliced).toBe(3);
    expect(s.score).toBe(6);
    expect(s.bestCombo).toBe(3);
  });

  it('loses a life for each dropped fruit', () => {
    const s = create('easy');
    s.spawnT = 99;
    s.fruits.push({ kind: 0, x: 200, y: 590, vx: 0, vy: 300, spin: 0, angle: 0, sliced: false });
    simulate(spec, s, 0.5, emptyInput(), rng);
    expect(s.lives).toBe(2);
  });
});
