import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { createRng } from '@/utils/random';
import { create, shoot, spec } from './game';

function settle(s: ReturnType<typeof create>, rng: () => number) {
  for (let i = 0; i < 60 * 30 && s.phase === 'moving'; i++) {
    s.time += 1 / 60;
    spec.update(s, 1 / 60, emptyInput(), rng);
  }
}

describe('pool game flow', () => {
  it('you place the cue ball, break, and the turn passes on a dry break', () => {
    const rng = createRng(2).next;
    const s = create('normal', rng);
    expect(s.phase).toBe('place');
    spec.update(s, 1 / 60, inputWith([], ['action']), rng);
    expect(s.phase).toBe('aim');
    shoot(s, Math.PI / 2, 300); // a feeble shot straight into the side cushion: no ball hit
    settle(s, rng);
    expect(s.table.turn).toBe(1);
    expect(s.phase).toBe('ai');
    expect(s.message).toMatch(/Foul/);
  });

  it('a whole game between the computer and a random hitter finishes', () => {
    const rng = createRng(7).next;
    const s = create('hard', rng);
    spec.update(s, 1 / 60, inputWith([], ['action']), rng);
    for (let turn = 0; turn < 400 && !s.over; turn++) {
      if (s.phase === 'place') spec.update(s, 1 / 60, inputWith([], ['action']), rng);
      else if (s.phase === 'aim') shoot(s, rng() * Math.PI * 2, 900);
      else if (s.phase === 'ai') for (let i = 0; i < 90 && s.phase === 'ai'; i++) spec.update(s, 1 / 60, emptyInput(), rng);
      settle(s, rng);
    }
    expect(s.over).toBe(true);
    expect(s.winner).toBe(1);
  });
});
