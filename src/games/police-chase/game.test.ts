import { describe, expect, it } from 'vitest';
import { emptyInput } from '../_shared/arcade/kit';
import { RAMS, create, ram, update } from './game';

describe('police chase', () => {
  it('four rams arrest the suspect and bring a faster one', () => {
    const s = create('normal');
    const speed = s.suspect.speed;
    for (let i = 0; i < RAMS; i++) ram(s, () => 0.5);
    expect(s.arrests).toBe(1);
    expect(s.suspect.health).toBe(RAMS);
    expect(s.suspect.speed).toBeGreaterThan(speed);
  });

  it('a slow patrol car loses the suspect when time runs out', () => {
    const s = create('hard');
    s.spawnIn = 999;
    for (let i = 0; i < 60 * 45; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.over).toBe(true);
    expect(s.arrests).toBe(0);
  });
});
