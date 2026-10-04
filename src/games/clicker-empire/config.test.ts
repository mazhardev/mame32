import { describe, expect, it } from 'vitest';
import { minutesToGoal } from '../_shared/idle/balanceBot';
import { empireConfig } from './config';

describe('clicker empire balance', () => {
  it('reaches each goal in a session, and prestige speeds it up', () => {
    const times = (['easy', 'normal', 'hard'] as const).map((d) => [
      minutesToGoal(empireConfig(d), 3, 4 * 3600, false),
      minutesToGoal(empireConfig(d), 3, 4 * 3600, true),
    ]);
    expect(times[1][1]).toBeLessThan(times[1][0]);
    expect(times[2][1]).toBeLessThan(90);
  });
});
