import { describe, expect, it } from 'vitest';
import { emptyInput, simulate } from '../_shared/arcade/kit';
import { ROUND, create, holeAt, holeCentre, keyToHole, spec, whack } from './game';

describe('whack-a-mole', () => {
  it('maps taps and number keys to holes', () => {
    for (let i = 0; i < 9; i++) {
      const [x, y] = holeCentre(i);
      expect(holeAt(x, y - 20)).toBe(i);
    }
    expect(holeAt(5, 5)).toBe(-1);
    expect(keyToHole('1')).toBe(0);
    expect(keyToHole('9')).toBe(8);
    expect(keyToHole('0')).toBe(-1);
  });

  it('scores a whacked mole and builds a combo', () => {
    const s = create('normal');
    s.moles.push({ hole: 4, kind: 'normal', up: 1, total: 1, hit: false, rise: 1 });
    whack(s, 4);
    expect(s.score).toBe(10);
    expect(s.combo).toBe(1);
    whack(s, 4); // already hit
    expect(s.score).toBe(10);
    expect(s.combo).toBe(0); // counts as a miss
  });

  it('pays more for gold moles and penalises helmets', () => {
    const s = create('normal');
    s.score = 50;
    s.moles.push({ hole: 0, kind: 'gold', up: 1, total: 1, hit: false, rise: 1 });
    s.moles.push({ hole: 1, kind: 'helmet', up: 1, total: 1, hit: false, rise: 1 });
    whack(s, 0);
    expect(s.score).toBe(80);
    whack(s, 1);
    expect(s.score).toBe(60);
    expect(s.combo).toBe(0);
  });

  it('ends after the round time', () => {
    const s = create('easy');
    simulate(spec, s, ROUND + 1, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
  });
});
