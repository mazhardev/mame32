import { describe, expect, it } from 'vitest';
import { inputWith } from '../arcade/kit';
import { actor, chase, damage, moveDir, separate, shoot, updateBullets } from './kit';

describe('shooter kit', () => {
  it('normalises diagonal movement', () => {
    const [dx, dy] = moveDir(inputWith(['up', 'right']));
    expect(Math.hypot(dx, dy)).toBeCloseTo(1);
  });

  it('fires bullets that expire', () => {
    const list: Parameters<typeof updateBullets>[0] = [];
    shoot(list, actor(100, 100, 10, 1), 0, 300, { life: 0.1 });
    expect(list[0].vx).toBeCloseTo(300);
    updateBullets(list, 0.2, 800, 600);
    expect(list).toHaveLength(0);
  });

  it('chases, separates and takes damage with invulnerability', () => {
    const e = actor(0, 0, 10, 3);
    chase(e, 100, 0, 50, 1);
    expect(e.x).toBeCloseTo(50);
    const a = actor(0, 0, 10, 1);
    const b = actor(5, 0, 10, 1);
    separate([a, b]);
    expect(b.x - a.x).toBeCloseTo(20);
    const p = actor(0, 0, 10, 3);
    expect(damage(p, 1, 0.5)).toBe(false);
    expect(damage(p, 1, 0.5)).toBe(false);
    expect(p.hp).toBe(2);
  });
});
