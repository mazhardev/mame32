import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith, simulate } from '../_shared/arcade/kit';
import { BASKET_Y, create, spec, update } from './game';

describe('catch falling objects', () => {
  it('catches fruit in the basket', () => {
    const s = create('normal');
    s.spawnIn = 99;
    s.items.push({ kind: 'fruit', icon: '🍎', x: s.x, y: BASKET_Y - 12, vy: 200 });
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.caught).toBe(1);
    expect(s.score).toBe(10);
  });

  it('a bomb in the basket costs a life; dropped fruit too', () => {
    const s = create('normal');
    s.spawnIn = 99;
    s.items.push({ kind: 'bomb', icon: '💣', x: s.x, y: BASKET_Y, vy: 0 });
    s.items.push({ kind: 'fruit', icon: '🍎', x: 5, y: 600, vy: 0 });
    update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.lives).toBe(1);
  });

  it('moves with the keyboard and ends after missing everything', () => {
    const s = create('easy');
    const x = s.x;
    update(s, 0.1, inputWith(['left']), () => 0.5);
    expect(s.x).toBeLessThan(x);
    simulate(spec, s, 60, emptyInput(), () => 0.95);
    expect(s.over).toBe(true);
  });
});
