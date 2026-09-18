import { describe, expect, it } from 'vitest';
import { feedback } from './engine';

describe('code breaker feedback', () => {
  it('marks each digit correct, higher or lower', () => {
    expect(feedback('5555', '1596')).toEqual(['down', 'ok', 'up', 'up']);
    expect(feedback('1234', '1234')).toEqual(['ok', 'ok', 'ok', 'ok']);
    expect(feedback('0', '9')).toEqual(['up']);
  });
});
