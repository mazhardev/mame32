import { describe, expect, it } from 'vitest';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { bomb, create, phaseFor, spec, update } from './game';

describe('boss battle', () => {
  it('changes phase at two-thirds and one-third health', () => {
    expect(phaseFor(600, 600)).toBe(1);
    expect(phaseFor(390, 600)).toBe(2);
    expect(phaseFor(190, 600)).toBe(3);
  });

  it('a bomb clears bullets and is limited', () => {
    const s = create('normal');
    for (let i = 0; i < 120; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.bullets.length).toBeGreaterThan(0);
    expect(bomb(s, () => 0.5)).toBe(true);
    expect(s.bullets).toHaveLength(0);
    bomb(s, () => 0.5);
    expect(bomb(s, () => 0.5)).toBe(false);
  });

  it('auto-fire damages the boss and standing still loses eventually', () => {
    const s = create('hard');
    simulate(spec, s, 60, emptyInput(), () => 0.5);
    expect(s.bossHp).toBeLessThan(s.bossMax);
    expect(s.over).toBe(true);
  });
});
