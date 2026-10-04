import { describe, expect, it } from 'vitest';
import { createRng } from '@/utils/random';
import { defended, dodge, judges, newBout, step, throwPunch, won } from './engine';

describe('boxing rules', () => {
  it('defence depends on the punch', () => {
    expect(defended('jab', 'left', false)).toBe('dodged');
    expect(defended('jab', 'none', true)).toBe('blocked');
    expect(defended('hookL', 'left', false)).toBe('hit');
    expect(defended('hookL', 'right', false)).toBe('dodged');
    expect(defended('upper', 'none', true)).toBe('hit');
    expect(defended('upper', 'right', false)).toBe('dodged');
  });

  it('punching during the wind-up is a counter', () => {
    const b = newBout('normal');
    b.oppState = 'windup';
    b.stateT = 0.3;
    const hp = b.opp.hp;
    throwPunch(b, 'hook', () => 0.9);
    expect(b.counters).toBe(1);
    expect(hp - b.opp.hp).toBeGreaterThan(10);
    expect(b.oppState).toBe('recover');
  });

  it('an idle boxer gets knocked out; a perfect defender who counters wins', () => {
    const idle = newBout('normal');
    const rng = createRng(2).next;
    for (let i = 0; i < 60 * 200 && !idle.over; i++) step(idle, 1 / 60, rng);
    expect(won(idle)).toBe(false);

    const pro = newBout('normal');
    const rng2 = createRng(3).next;
    for (let i = 0; i < 60 * 200 && !pro.over; i++) {
      if (pro.youDown) pro.presses += 1;
      if (pro.oppState === 'windup') {
        dodge(pro, pro.next === 'hookL' ? 'right' : 'left');
      }
      if (pro.oppState === 'recover' || pro.oppState === 'stunned') throwPunch(pro, 'jab', rng2);
      step(pro, 1 / 60, rng2);
    }
    expect(pro.over).not.toBeNull();
    expect(won(pro)).toBe(true);
    expect(judges(pro).you).toBeGreaterThan(judges(pro).opp);
  });

  it('getting up from a knockdown needs enough presses before ten', () => {
    const b = newBout('hard');
    b.you.hp = 1;
    b.oppState = 'punch';
    b.next = 'jab';
    b.stateT = 0;
    step(b, 1 / 60, () => 0.5);
    expect(b.youDown).toBe(true);
    for (let i = 0; i < 60 * 10 && b.youDown && !b.over; i++) step(b, 1 / 60, () => 0.5);
    expect(b.over).toBe('ko-loss');
  });
});
