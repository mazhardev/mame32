import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { BOUNCE, SPRING, create, spec, update } from './game';

describe('cloud jumper', () => {
  it('bounces off a cloud when landing from above', () => {
    const s = create('normal', createRng(1).next);
    const c = s.clouds[0];
    s.x = c.x + c.w / 2;
    s.y = c.y - 2;
    s.vy = 300;
    update(s, 1 / 60, emptyInput(), createRng(2).next);
    expect(s.vy).toBe(BOUNCE);
  });

  it('launches higher from a spring', () => {
    const s = create('normal', createRng(1).next);
    const c = s.clouds[0];
    c.kind = 'spring';
    s.x = c.x + c.w / 2;
    s.y = c.y - 2;
    s.vy = 300;
    update(s, 1 / 60, emptyInput(), createRng(2).next);
    expect(s.vy).toBe(SPRING);
  });

  it('falls through crumbling clouds', () => {
    const s = create('normal', createRng(1).next);
    s.clouds = [{ x: 100, y: 400, w: 80, kind: 'crumble', vx: 0, broken: false, fall: 0 }];
    s.x = 140;
    s.y = 398;
    s.vy = 300;
    update(s, 1 / 60, emptyInput(), createRng(2).next);
    expect(s.clouds[0].broken).toBe(true);
    expect(s.vy).toBeGreaterThan(0);
  });

  it('wraps around the sides', () => {
    const s = create('normal', createRng(1).next);
    s.x = 358;
    simulate(spec, s, 0.3, inputWith(['right']), createRng(3).next);
    expect(s.x).toBeLessThan(200);
  });

  it('always keeps reachable clouds above', () => {
    const s = create('hard', createRng(5).next);
    const solid = s.clouds.filter((c) => c.kind !== 'crumble').map((c) => c.y).sort((a, b) => b - a);
    // Jump height is v²/2g ≈ 164 px, so gaps between solid clouds stay below that.
    for (let i = 1; i < solid.length; i++) expect(solid[i - 1] - solid[i]).toBeLessThan((BOUNCE * BOUNCE) / (2 * 1250));
  });
});
