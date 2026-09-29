import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { GROUND, create, playerBox, spec, update } from './game';

describe('dino runner', () => {
  it('jumps only from the ground and lands again', () => {
    const s = create('normal');
    update(s, 1 / 60, inputWith([], ['action']), () => 0.5);
    expect(s.vy).toBeLessThan(0);
    const vy = s.vy;
    update(s, 1 / 60, inputWith([], ['action']), () => 0.5); // mid-air: no double jump
    expect(s.vy).toBeGreaterThan(vy);
    s.obstacles = [];
    simulate(spec, s, 1.5, emptyInput(), () => 0.99);
    expect(s.y).toBe(GROUND);
  });

  it('ducks into a lower, longer shape', () => {
    const s = create('normal');
    const standing = playerBox(s);
    update(s, 1 / 60, inputWith(['down']), () => 0.5);
    const ducking = playerBox(s);
    expect(ducking.h).toBeLessThan(standing.h);
    expect(ducking.y).toBeGreaterThan(standing.y);
  });

  it('scores with distance and speeds up', () => {
    const s = create('easy');
    s.next = 99;
    simulate(spec, s, 3, emptyInput());
    expect(s.score).toBeGreaterThan(50);
    expect(s.speed).toBeGreaterThan(create('easy').speed);
  });

  it('ends on hitting a cactus', () => {
    const s = create('normal');
    s.next = 99;
    s.obstacles.push({ kind: 'cactus-l', x: 90, y: GROUND - 50, w: 24, h: 50, flap: 0 });
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });
});
