import { describe, expect, it } from 'vitest';
import {
  COLS,
  MAPS,
  ROWS,
  TOWERS,
  build,
  canBuild,
  newTD,
  sell,
  startWave,
  step,
  upgrade,
  waveList,
  won,
} from './engine';
import type { TD, TowerKind } from './engine';

function runWave(td: TD) {
  startWave(td);
  for (let i = 0; i < 60 * 240 && td.waveActive && td.lives > 0; i++) step(td, 1 / 60);
}

/** A reasonable builder: towers on free tiles next to the path, upgrades later. */
function autoplay(td: TD) {
  const spots: [number, number][] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (!canBuild(td, c, r)) continue;
      const near = [...td.pathTiles].filter((k) => {
        const [pc, pr] = k.split(',').map(Number);
        return Math.abs(pc - c) <= 1 && Math.abs(pr - r) <= 1;
      }).length;
      if (near > 0) spots.push([c, r]);
    }
  spots.sort((a, b) => b[1] - a[1]);
  const plan: TowerKind[] = [
    'arrow',
    'arrow',
    'frost',
    'cannon',
    'arrow',
    'laser',
    'cannon',
    'laser',
  ];
  let k = 0;
  while (!won(td) && td.lives > 0) {
    for (let tries = 0; tries < 10; tries++) {
      const kind = plan[k % plan.length];
      if (k < spots.length && td.gold >= TOWERS[kind].cost) {
        build(td, kind, spots[k][0], spots[k][1]);
        k++;
      } else {
        const cheapest = td.towers.filter((t) => t.level < 3).sort((a, b) => a.level - b.level)[0];
        if (!cheapest || !upgrade(td, cheapest)) break;
      }
    }
    runWave(td);
  }
}

describe('tower defense', () => {
  it('cannot build on the path or on another tower', () => {
    const td = newTD('normal', 0);
    expect(canBuild(td, 0, 1)).toBe(false);
    expect(build(td, 'arrow', 0, 0)).toBe(true);
    expect(canBuild(td, 0, 0)).toBe(false);
    const gold = td.gold;
    expect(sell(td, td.towers[0])).toBe(35);
    expect(td.gold).toBe(gold + 35);
  });

  it('an undefended base loses lives', () => {
    const td = newTD('normal', 0);
    runWave(td);
    expect(td.lives).toBe(20 - waveList(1, 20).length);
  });

  it('frost slows and towers kill for gold', () => {
    const td = newTD('normal', 0);
    build(td, 'frost', 2, 2);
    build(td, 'arrow', 4, 2);
    runWave(td);
    expect(td.kills).toBeGreaterThan(0);
  });

  it('every map can be won by a sensible builder on Normal', () => {
    for (let m = 0; m < MAPS.length; m++) {
      const td = newTD('normal', m);
      autoplay(td);
      expect(won(td)).toBe(true);
    }
  });

  it('later waves bring tanks and a boss', () => {
    expect(waveList(5, 20)).toContain('tank');
    expect(waveList(10, 20)).toContain('boss');
    expect(waveList(1, 20)).not.toContain('tank');
  });
});
