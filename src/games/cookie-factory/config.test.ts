import { describe, expect, it } from 'vitest';
import { minutesToGoal } from '../_shared/idle/balanceBot';
import { cookieConfig } from './config';

describe('cookie factory balance', () => {
  it('each difficulty reaches its goal in a reasonable session', () => {
    const easy = minutesToGoal(cookieConfig('easy'));
    const normal = minutesToGoal(cookieConfig('normal'));
    const hard = minutesToGoal(cookieConfig('hard'));
    expect(easy).toBeLessThan(normal);
    expect(normal).toBeLessThan(hard);
    expect(easy).toBeGreaterThan(4);
    expect(hard).toBeLessThan(60);
  });
});
