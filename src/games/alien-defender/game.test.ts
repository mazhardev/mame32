import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { alienRect, create, stepInterval, update } from './game';

const never = () => 0.999;

describe('alien defender', () => {
  it('starts with a full formation and four shields', () => {
    const s = create('normal');
    expect(s.aliens.filter((a) => a.alive)).toHaveLength(50);
    expect(s.shields.length).toBeGreaterThan(100);
  });

  it('marches faster as aliens are destroyed', () => {
    expect(stepInterval(10, 1)).toBeLessThan(stepInterval(50, 1));
    expect(stepInterval(50, 3)).toBeLessThan(stepInterval(50, 1));
  });

  it('shoots an alien in its path and scores it', () => {
    const s = create('normal');
    const target = s.aliens.find((a) => a.row === 4 && a.col === 3)!;
    const r = alienRect(s, target);
    s.px = r.x + r.w / 2;
    s.shields = [];
    update(s, 1 / 60, inputWith([], ['action']), never);
    for (let i = 0; i < 60 && target.alive; i++) update(s, 1 / 60, emptyInput(), never);
    expect(target.alive).toBe(false);
    expect(s.score).toBe(20);
  });

  it('allows at most two shots in the air', () => {
    const s = create('normal');
    for (let i = 0; i < 4; i++) update(s, 1 / 120, inputWith([], ['action']), never);
    expect(s.shots.length).toBeLessThanOrEqual(2);
  });

  it('ends the game when the formation reaches the ground', () => {
    const s = create('normal');
    s.oy = 460;
    update(s, 1 / 60, emptyInput(), never);
    expect(s.over).toBe(true);
  });

  it('starts the next wave when all aliens are gone', () => {
    const s = create('normal');
    s.aliens.forEach((a) => (a.alive = false));
    update(s, 1 / 60, emptyInput(), never);
    expect(s.wave).toBe(2);
  });
});
