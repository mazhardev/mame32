import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { create, spec, update, volley } from './game';

describe('space shooter', () => {
  it('widens the volley with weapon level', () => {
    expect(volley(100, 100, 1)).toHaveLength(1);
    expect(volley(100, 100, 2)).toHaveLength(3);
    expect(volley(100, 100, 3)).toHaveLength(5);
  });

  it('fires automatically', () => {
    const s = create('normal');
    s.spawnT = 99;
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.bullets.filter((b) => !b.enemy).length).toBeGreaterThan(0);
  });

  it('moves the ship with the keys but keeps it on screen', () => {
    const s = create('normal');
    s.spawnT = 99;
    simulate(spec, s, 3, inputWith(['left', 'down']), () => 0.5);
    expect(s.x).toBe(16);
    expect(s.y).toBe(640 - 24);
  });

  it('destroys an enemy in the line of fire', () => {
    const s = create('normal');
    s.spawnT = 99;
    s.enemies.push({ kind: 'drone', x: s.x, y: s.y - 120, hp: 1, maxHp: 1, t: 0, fire: 9, baseX: s.x, r: 15 });
    for (let i = 0; i < 30; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.kills).toBe(1);
    expect(s.score).toBeGreaterThanOrEqual(50);
  });

  it('uses the shield before losing a life', () => {
    const s = create('normal');
    s.spawnT = 99;
    s.invuln = 0;
    s.bullets.push({ x: s.x, y: s.y, vx: 0, vy: 0, enemy: true });
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.shield).toBe(2);
    expect(s.lives).toBe(3);
  });

  it('brings in a boss after 45 seconds', () => {
    const s = create('easy');
    s.bossT = 0.01;
    s.invuln = 999;
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.enemies.some((e) => e.kind === 'boss')).toBe(true);
  });
});
