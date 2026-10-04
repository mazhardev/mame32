import { describe, expect, it } from 'vitest';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { ROUNDS, create, fire, spec } from './game';

describe('duck target', () => {
  it('hits a duck under the sight and uses shots', () => {
    const s = create('normal', () => 0.5);
    const d = s.ducks[0];
    expect(fire(s, d.x, d.y)).toBe(d);
    expect(d.state).toBe('falling');
    expect(s.shotsLeft).toBe(2);
    expect(fire(s, 0, 0)).toBeNull();
  });

  it('ducks escape when shots run out', () => {
    const s = create('normal', () => 0.5);
    fire(s, -99, -99);
    fire(s, -99, -99);
    fire(s, -99, -99);
    expect(s.ducks.every((d) => d.state === 'escaping')).toBe(true);
  });

  it('a season of misses ends early', () => {
    const s = create('easy', () => 0.5);
    simulate(spec, s, 200, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
    expect(s.round).toBeLessThanOrEqual(ROUNDS);
  });
});
