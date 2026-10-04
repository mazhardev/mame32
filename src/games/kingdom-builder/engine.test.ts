import { describe, expect, it } from 'vitest';
import {
  BUILDING,
  TUNING,
  botTurn,
  build,
  canBuild,
  choiceAllowed,
  choose,
  defence,
  endSeason,
  housing,
  newKingdom,
  seasonOf,
  staffed,
  trade,
  validKingdom,
} from './engine';
import type { Kingdom } from './engine';

const calm = (k: Kingdom) => {
  k.event = { id: 'test', title: '', text: '', icon: '', choices: [{ label: 'ok', effect: {} }] };
};

describe('kingdom builder', () => {
  it('starts in spring with a valid save shape', () => {
    const k = newKingdom(1, 'normal');
    expect(seasonOf(k.turn)).toBe('Spring');
    expect(k.event).not.toBeNull();
    expect(validKingdom(JSON.parse(JSON.stringify(k)))).toBe(true);
    expect(validKingdom({ ...k, tax: 'none' })).toBe(false);
  });

  it('building costs resources and respects limits', () => {
    const k = newKingdom(1, 'normal');
    k.res = { gold: 1000, food: 100, wood: 1000, stone: 1000 };
    for (let i = 0; i < 3; i++) expect(build(k, 'walls')).toBe(true);
    expect(canBuild(k, 'walls')).toBe(false);
    expect(k.res.stone).toBe(1000 - 3 * BUILDING.walls.cost.stone!);
    expect(defence(k)).toBe(k.soldiers + 24);
  });

  it('buildings only produce when staffed', () => {
    const k = newKingdom(1, 'normal');
    k.people = 4;
    expect(staffed(k).farm).toBe(1);
    expect(staffed(k).lumber).toBe(0);
  });

  it('farms feed the people and autumn brings the harvest', () => {
    const k = newKingdom(1, 'normal');
    calm(k);
    choose(k, 0);
    k.turn = 3;
    const r = endSeason(k, 'normal');
    expect(r.food).toBe(20);
    expect(r.eaten).toBe(Math.ceil(k.people - r.born + k.soldiers * 0.5));
  });

  it('starvation drives people away; housing caps growth', () => {
    const k = newKingdom(1, 'normal');
    k.res.food = 0;
    k.built.farm = 0;
    calm(k);
    choose(k, 0);
    const r = endSeason(k, 'normal');
    expect(r.born).toBeLessThan(0);
    const g = newKingdom(1, 'normal');
    g.people = housing(g);
    g.res.food = 500;
    calm(g);
    choose(g, 0);
    expect(endSeason(g, 'normal').born).toBe(0);
  });

  it('raids are won with enough defence and plunder you without it', () => {
    const k = newKingdom(1, 'normal');
    k.event = {
      id: 'raiders',
      title: '',
      text: '',
      icon: '',
      choices: [{ label: 'Fight', effect: {}, raid: 10 }],
    };
    k.soldiers = 12;
    const gold = k.res.gold;
    choose(k, 0);
    expect(k.res.gold).toBeGreaterThan(gold);
    const w = newKingdom(1, 'normal');
    w.event = {
      id: 'raiders',
      title: '',
      text: '',
      icon: '',
      choices: [{ label: 'Fight', effect: {}, raid: 30 }],
    };
    w.soldiers = 0;
    const people = w.people;
    choose(w, 0);
    expect(w.people).toBeLessThan(people);
  });

  it('choices with unmet needs cannot be picked; trades need a market', () => {
    const k = newKingdom(1, 'normal');
    k.res.gold = 0;
    const c = { label: 'pay', effect: { gold: -10 }, needs: { gold: 10 } };
    expect(choiceAllowed(k, c)).toBe(false);
    k.res.gold = 100;
    expect(trade(k, 'wood')).toBe(false);
    k.built.market = 1;
    expect(trade(k, 'wood')).toBe(true);
    expect(k.res.wood).toBeGreaterThan(TUNING.normal.start.wood);
  });

  it('a careful steward always finishes the castle on easy and normal, and sometimes on hard', () => {
    for (const d of ['easy', 'normal'] as const)
      for (let seed = 1; seed <= 8; seed++) {
        const k = newKingdom(seed, d);
        while (!k.over) botTurn(k, d);
        expect(k.over, `${d} ${seed}`).toBe('won');
      }
    let hardWins = 0;
    for (let seed = 1; seed <= 8; seed++) {
      const k = newKingdom(seed, 'hard');
      while (!k.over) botTurn(k, 'hard');
      if (k.over === 'won') hardWins++;
    }
    expect(hardWins).toBeGreaterThan(1);
  });
});
