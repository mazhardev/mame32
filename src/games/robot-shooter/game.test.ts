import { describe, expect, it } from 'vitest';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { create, hurtPlayer, spec, update } from './game';

describe('robot shooter', () => {
  it('shield absorbs damage before the hull and recharges when calm', () => {
    const s = create('normal');
    hurtPlayer(s, 1);
    expect(s.shield).toBe(2);
    expect(s.player.hp).toBe(4);
    s.toSpawn = 0;
    s.breather = 99;
    for (let i = 0; i < 6 * 60; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.shield).toBe(3);
  });

  it('cover blocks enemy bullets', () => {
    const s = create('normal');
    s.toSpawn = 0;
    s.breather = 99;
    const block = s.blocks[2];
    s.bullets.push({ x: block.x + block.w / 2, y: block.y - 10, vx: 0, vy: 300, r: 4, life: 3, damage: 1, friendly: false, color: 'red' });
    for (let i = 0; i < 20; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.bullets).toHaveLength(0);
  });

  it('an idle player is eventually destroyed', () => {
    const s = create('hard');
    simulate(spec, s, 180, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });
});
