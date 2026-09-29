import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { GRAVITY, JUMP, create, extend, spec, update } from './game';

describe('endless runner', () => {
  it('runs along the first rooftop without input', () => {
    const s = create('normal');
    simulate(spec, s, 1.5, emptyInput(), createRng(1).next);
    expect(s.over).toBe(false);
    expect(s.score).toBeGreaterThan(0);
  });

  it('allows exactly two jumps before landing', () => {
    const s = create('normal');
    const rng = createRng(2).next;
    update(s, 1 / 60, inputWith([], ['action']), rng);
    expect(s.jumps).toBe(1);
    update(s, 1 / 60, inputWith([], ['action']), rng);
    expect(s.jumps).toBe(2);
    const vy = s.vy;
    update(s, 1 / 60, inputWith([], ['action']), rng);
    expect(s.vy).toBeGreaterThan(vy); // third press ignored, gravity continues
  });

  it('only generates gaps a double jump can clear', () => {
    // Double-jump range at the top speed, allowing the height difference.
    const s = create('hard');
    s.speed = s.maxSpeed;
    extend(s, createRng(3).next);
    const air = (-JUMP / GRAVITY) * 2 + ((-JUMP * 0.85) / GRAVITY) * 2;
    for (let i = 1; i < s.platforms.length; i++) {
      const gap = s.platforms[i].x - (s.platforms[i - 1].x + s.platforms[i - 1].w);
      expect(gap).toBeLessThan(s.maxSpeed * air);
    }
  });

  it('falls to its doom off the edge of the world', () => {
    const s = create('easy');
    s.platforms = [{ x: -20, y: 260, w: 10 }];
    s.y = 300;
    s.vy = 100;
    simulate(spec, s, 2, emptyInput(), createRng(4).next);
    expect(s.over).toBe(true);
  });
});
