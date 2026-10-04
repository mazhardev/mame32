import { describe, expect, it } from 'vitest';
import { emptyInput } from '../_shared/arcade/kit';
import { COLS, ROWS, TILE, create, drive, lineOfSight, makeMap, update } from './game';

describe('tank shooter', () => {
  it('maps are mirror-symmetric with clear spawn rows', () => {
    const map = makeMap(3, Math.random);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) expect(map[r * COLS + c]).toBe(map[r * COLS + COLS - 1 - c]);
    for (const r of [0, 1, ROWS - 2, ROWS - 1]) for (let c = 0; c < COLS; c++) expect(map[r * COLS + c]).toBe(0);
  });

  it('drives along the hull heading and stops at walls', () => {
    const s = create('normal', () => 0.99);
    s.enemies = [];
    const y0 = s.player.y;
    drive(s, s.player, 1, 0, 0.5);
    expect(s.player.y).toBeLessThan(y0);
    s.map[(ROWS - 3) * COLS + 7] = 3;
    s.player.x = 7 * TILE + TILE / 2;
    s.player.y = (ROWS - 2) * TILE + 16;
    s.player.angle = -Math.PI / 2;
    for (let i = 0; i < 30; i++) drive(s, s.player, 1, 0, 1 / 30);
    expect(s.player.y).toBeGreaterThan((ROWS - 2) * TILE);
  });

  it('walls block line of sight and shells break bricks', () => {
    const s = create('normal', () => 0.99);
    s.enemies = s.enemies.slice(0, 1);
    s.enemies[0].cooldown = 99;
    s.map[5 * COLS + 5] = 1;
    expect(lineOfSight(s, 5 * TILE + 20, 2 * TILE, 5 * TILE + 20, 8 * TILE)).toBe(false);
    s.shells.push({ x: 5 * TILE + 20, y: 4 * TILE + 30, vx: 0, vy: 300, r: 4, friendly: true, life: 2 });
    for (let i = 0; i < 10; i++) update(s, 1 / 60, emptyInput(), () => 0.5);
    expect(s.map[5 * COLS + 5]).toBe(2);
  });
});
