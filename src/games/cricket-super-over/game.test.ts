import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { createRng } from '@/utils/random';
import { create, spec, verdict } from './game';

describe('cricket super over', () => {
  it('bats, sets a target, then bowls to a result', () => {
    const rng = createRng(5).next;
    const s = create('normal');
    let sawBreak = false;
    for (let i = 0; i < 60 * 300 && !s.over; i++) {
      s.time += 1 / 60;
      if (s.stage === 'break') sawBreak = true;
      const input =
        s.flow.phase === 'setup' || s.flow.phase === 'runup'
          ? inputWith([], ['action'])
          : emptyInput();
      spec.update(s, 1 / 60, input, rng);
    }
    expect(sawBreak).toBe(true);
    expect(s.over).toBe(true);
    expect(s.theirs.target).toBe(s.mine.runs + 1);
  });

  it('level scores are decided by boundaries', () => {
    const s = create('normal');
    s.mine.runs = 10;
    s.theirs.runs = 10;
    s.mine.fours = 1;
    expect(verdict(s)).toBe(1);
    s.theirs.sixes = 2;
    expect(verdict(s)).toBe(-1);
    s.mine.sixes = 1;
    expect(verdict(s)).toBe(0);
  });
});
