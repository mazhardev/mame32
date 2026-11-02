import { describe, expect, it } from 'vitest';
import { emptyInput, inputWith } from '../_shared/arcade/kit';
import { botPlay } from './bot';
import { COLS, LEVELS, PLANTS, ROWS, plantsFor } from './data';
import { BANK_Y, CARD_H, CARD_W, PARKED, cardX, cellX, cellY, collectSun, create, dig, plant, step, update } from './engine';
import type { Pest, State } from './engine';
import type { PestId } from './data';

const run = (s: State, secs: number) => {
  for (let t = 0; t < secs && s.phase === 'play'; t += 1 / 30) step(s, 1 / 30);
};

/** A quiet lawn: no waves will come unless a test adds pests. */
function quiet(level = 8): State {
  const s = create('normal', level, 1);
  // Waves held back: the level can't be won or start a wave by itself.
  s.waveT = 1e9;
  s.sun = 5000;
  return s;
}

function pest(s: State, id: PestId, row: number, x: number): Pest {
  const p: Pest = { id, row, x, hp: 9999, maxHp: 9999, slowT: 0, eating: false, hurt: 0, vaulted: id !== 'hopper', jumpT: 0, anim: 0 };
  s.pests.push(p);
  return p;
}

describe('planting', () => {
  it('costs sunlight, recharges and needs an empty square', () => {
    const s = create('normal', 0, 1);
    s.sun = 200;
    expect(plant(s, 'spitter', 2, 3)).toBe(true);
    expect(s.sun).toBe(100);
    expect(plant(s, 'spitter', 2, 4)).toBe(false);
    s.cool.spitter = 0;
    expect(plant(s, 'spitter', 2, 3)).toBe(false);
    expect(plant(s, 'sunbloom', 1, 1)).toBe(true);
    expect(s.sun).toBe(50);
    expect(plant(s, 'spitter', 0, 0)).toBe(false);
    expect(dig(s, 2, 3)).toBe(true);
    expect(s.plants.map((p) => p.id)).toEqual(['sunbloom']);
  });

  it('new defenders unlock as the levels go on', () => {
    expect(plantsFor(0)).toEqual(['sunbloom', 'spitter']);
    expect(plantsFor(14)).toHaveLength(Object.keys(PLANTS).length);
    expect(create('normal', 0).bank).not.toContain('twin');
  });

  it('sunblooms make sunlight to collect, and the sky drops more', () => {
    const s = quiet();
    s.sun = 50;
    plant(s, 'sunbloom', 2, 0);
    s.sun = 0;
    run(s, 10);
    expect(s.suns.length).toBeGreaterThan(0);
    const sun = s.suns[0];
    expect(collectSun(s, sun.x, sun.y)).toBe(true);
    expect(s.sun).toBe(25);
  });
});

describe('fighting', () => {
  it('a spitter shoots pests in its row only', () => {
    const s = quiet();
    plant(s, 'spitter', 1, 1);
    const target = pest(s, 'snail', 1, 400);
    const other = pest(s, 'snail', 3, 400);
    run(s, 6);
    expect(target.hp).toBeLessThan(9999);
    expect(other.hp).toBe(9999);
  });

  it('pests stop to eat plants, and a shell holds them far longer', () => {
    const s = quiet();
    plant(s, 'spitter', 0, 4);
    plant(s, 'shell', 1, 4);
    pest(s, 'snail', 0, cellX(4) + 26);
    pest(s, 'snail', 1, cellX(4) + 26);
    run(s, 8);
    expect(s.plants.some((p) => p.row === 0)).toBe(false);
    expect(s.plants.some((p) => p.row === 1 && p.id === 'shell')).toBe(true);
  });

  it('frost slows pests down', () => {
    const s = quiet();
    plant(s, 'frost', 2, 0);
    const slowed = pest(s, 'snail', 2, 470);
    const normal = pest(s, 'snail', 3, 470);
    run(s, 8);
    expect(slowed.slowT).toBeGreaterThan(0);
    expect(slowed.x).toBeGreaterThan(normal.x + 10);
  });

  it('a pop berry flattens pests in three rows around it', () => {
    const s = quiet();
    const hit = [pest(s, 'armor', 1, cellX(5)), pest(s, 'armor', 2, cellX(6)), pest(s, 'armor', 3, cellX(4))];
    hit.forEach((p) => (p.hp = 1300));
    const far = pest(s, 'armor', 4, cellX(5));
    far.hp = 1300;
    plant(s, 'popberry', 2, 5);
    run(s, 2);
    expect(hit.every((p) => !s.pests.includes(p))).toBe(true);
    expect(s.pests).toContain(far);
    expect(s.stats.popBest).toBe(3);
  });

  it('a root mine arms, then blows up the first pest on it', () => {
    const s = quiet();
    plant(s, 'mine', 2, 4);
    const early = pest(s, 'snail', 2, cellX(4) + 20);
    early.hp = 200;
    run(s, 3);
    expect(s.pests).toContain(early);
    s.pests = [];
    run(s, 10);
    const late = pest(s, 'helmet', 2, cellX(4) + 30);
    late.hp = 560;
    run(s, 4);
    expect(s.pests).not.toContain(late);
  });

  it('hoppers vault the first plant they meet', () => {
    const s = quiet();
    plant(s, 'shell', 2, 6);
    const h = pest(s, 'hopper', 2, cellX(7));
    run(s, 4);
    expect(h.vaulted).toBe(true);
    expect(h.x).toBeLessThan(cellX(6));
  });
});

describe('the house', () => {
  it('the roller clears a row once; the next pest through loses the level', () => {
    const s = quiet();
    const a = pest(s, 'snail', 2, 60);
    const b = pest(s, 'snail', 2, 200);
    run(s, 3.5);
    expect(s.pests).not.toContain(a);
    expect(s.pests).not.toContain(b);
    run(s, 2);
    expect(s.rollers[2]).toBeNull();
    expect(s.rollers[1]).toBe(PARKED);
    pest(s, 'snail', 2, 60);
    run(s, 10);
    expect(s.phase).toBe('lost');
  });

  it('nobody planting anything loses the first level', () => {
    const s = create('normal', 0, 4);
    run(s, 400);
    expect(s.phase).toBe('lost');
  });
});

describe('levels', () => {
  it('has 15 levels that grow harder', () => {
    expect(LEVELS).toHaveLength(15);
    expect(LEVELS[14].waves).toBeGreaterThan(LEVELS[0].waves);
    expect(LEVELS[14].budget[1]).toBeGreaterThan(LEVELS[0].budget[1]);
    expect(LEVELS[14].pool.length).toBeGreaterThan(LEVELS[0].pool.length);
  });

  it('a sensible gardener can win every level on Easy', () => {
    for (let i = 0; i < LEVELS.length; i++) {
      let won = false;
      for (let k = 0; k < 3 && !won; k++) won = botPlay(create('easy', i, 40 + i * 9 + k), 0.5, 1200);
      expect(won, `level ${i + 1}`).toBe(true);
    }
  }, 240_000);

  it('and every level on Normal at least some of the time', () => {
    for (let i = 0; i < LEVELS.length; i++) {
      let won = false;
      for (let k = 0; k < 6 && !won; k++) won = botPlay(create('normal', i, 100 + i * 13 + k), 0.5, 1200);
      expect(won, `level ${i + 1}`).toBe(true);
    }
  }, 360_000);
});

describe('controls', () => {
  it('tap a card then a square to plant; tap sunlight to collect it', () => {
    const s = quiet(0);
    s.sun = 100;
    const at = (x: number, y: number) => inputWith([], [], { x, y, down: true, pressed: true, active: true });
    update(s, 1 / 60, at(cardX(1) + CARD_W / 2, BANK_Y + CARD_H / 2));
    expect(s.selected).toBe('spitter');
    update(s, 1 / 60, at(cellX(2), cellY(3)));
    expect(s.plants.map((p) => [p.id, p.row, p.col])).toEqual([['spitter', 3, 2]]);
    expect(s.selected).toBeNull();
    s.suns.push({ x: 300, y: 100, landY: 100, t: 1, taken: false });
    update(s, 1 / 60, at(302, 98));
    expect(s.sun).toBe(25);
    update(s, 1 / 60, emptyInput());
  });

  it('keyboard: number keys pick, arrows move, Space plants', () => {
    const s = quiet(0);
    s.sun = 100;
    const keys = emptyInput();
    keys.keys.add('1');
    update(s, 1 / 60, keys);
    update(s, 1 / 60, inputWith([], ['right']));
    update(s, 1 / 60, inputWith([], ['action']));
    expect(s.plants).toHaveLength(1);
    expect(s.plants[0]).toMatchObject({ id: 'sunbloom', row: 2, col: 1 });
    expect(ROWS * COLS).toBe(45);
  });
});
