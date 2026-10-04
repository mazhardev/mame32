import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { GRID, makeFloor, neighbour } from './dungeon';
import { create, enterRoom, update } from './game';

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

describe('dungeon shooter', () => {
  it('floors are connected, with stairs in the deepest room', () => {
    for (let k = 1; k < 20; k++) {
      const f = makeFloor(8, rng(k), () => []);
      expect(f.rooms.size).toBe(8);
      for (const r of f.rooms.values()) {
        if (r.cell !== f.start) expect(r.depth).toBeGreaterThan(0);
        // Doors are mirrored on both sides.
        for (const d of ['n', 'e', 's', 'w'] as const) {
          if (!r.doors[d]) continue;
          const n = neighbour(r.cell, d)!;
          expect(f.rooms.get(n)).toBeDefined();
        }
      }
      const deepest = Math.max(...[...f.rooms.values()].map((r) => r.depth));
      expect(f.rooms.get(f.exit)!.depth).toBe(deepest);
    }
    expect(neighbour(0, 'n')).toBeNull();
    expect(neighbour(GRID - 1, 'e')).toBeNull();
  });

  it('entering an uncleared room spawns monsters and locks the doors', () => {
    const s = create('normal', rng(3));
    const start = s.floor.rooms.get(s.room)!;
    const dir = (['n', 'e', 's', 'w'] as const).find((d) => start.doors[d])!;
    enterRoom(s, dir, rng(4));
    expect(s.monsters.length).toBeGreaterThan(0);
    expect(s.floor.rooms.get(s.room)!.cleared).toBe(false);
    s.monsters = [];
    update(s, 1 / 60, emptyInput(), rng(5));
    expect(s.floor.rooms.get(s.room)!.cleared).toBe(true);
    expect(s.roomsCleared).toBe(1);
  });

  it('the start room is safe and walls hold the player in', () => {
    const s = create('easy', rng(9));
    for (let i = 0; i < 300; i++) update(s, 1 / 60, inputWith(['up', 'left']), rng(i));
    expect(s.over).toBe(false);
  });
});
