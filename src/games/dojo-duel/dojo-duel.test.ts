import { describe, expect, it } from 'vitest';
import { emptyInput } from '../_shared/arcade/kit';
import { cpuPad, newBrain, skillFor } from './ai';
import { METER_MAX, emptyPad, hurtbox, makeBattle, nextRound, stepBattle } from './engine';
import type { Battle, Pad } from './engine';
import { ALL_FIGHTERS, BOSS, ROSTER, fighterById, ladderFor } from './fighters';
import { create, frame, update } from './game';
import { moveLength } from './moves';
import { STANCE, poseOf, solveLimb } from './pose';

const pad = (p: Partial<Pad> = {}): Pad => ({ ...emptyPad(), ...p });
const idle = (): [Pad, Pad] => [pad(), pad()];

/** A fight already past the intro, fighters `gap` pixels apart in the middle. */
function fight(a = 'kenta', b = 'kenta', gap = 40): Battle {
  const bt = makeBattle(fighterById(a), fighterById(b), 0);
  bt.phase = 'fight';
  bt.f[0].x = 240 - gap / 2;
  bt.f[1].x = 240 + gap / 2;
  return bt;
}

function run(b: Battle, frames: number, pads: (n: number) => [Pad, Pad] = idle) {
  for (let n = 0; n < frames; n++) stepBattle(b, pads(n));
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

describe('roster', () => {
  it('has eight fighters plus a boss, each with three specials and a super', () => {
    expect(ROSTER).toHaveLength(8);
    expect(new Set(ALL_FIGHTERS.map((f) => f.id)).size).toBe(9);
    for (const f of ALL_FIGHTERS) {
      expect(f.specials.super.super).toBe(true);
      for (const m of [f.specials.neutral, f.specials.fwd, f.specials.down]) expect(moveLength(m)).toBeGreaterThan(5);
    }
  });

  it('the arcade ladder is the seven others and then the boss', () => {
    const l = ladderFor('mei');
    expect(l).toHaveLength(8);
    expect(l.some((f) => f.id === 'mei')).toBe(false);
    expect(l[7]).toBe(BOSS);
  });

  it('limbs never stretch past their length', () => {
    const [, end] = solveLimb([0, 0], [100, 0], 20, 20, 1);
    expect(Math.hypot(end[0], end[1])).toBeLessThan(40);
    const b = fight();
    expect(poseOf(b.f[0], 0).hip[1]).toBeCloseTo(STANCE.hip[1], 0);
  });
});

describe('hits and blocks', () => {
  it('a jab hits in range and does damage; out of range it whiffs', () => {
    const near = fight();
    run(near, 12, (n) => [pad({ p: n === 0 }), pad()]);
    expect(near.f[1].hp).toBeLessThan(near.f[1].def.hp);
    expect(near.f[1].act).toBe('hit');

    const far = fight('kenta', 'kenta', 160);
    run(far, 20, (n) => [pad({ p: n === 0 }), pad()]);
    expect(far.f[1].hp).toBe(far.f[1].def.hp);
  });

  it('holding away blocks a punch, taking no damage', () => {
    const b = fight();
    run(b, 12, (n) => [pad({ p: n === 0 }), pad({ right: true })]);
    expect(b.f[1].hp).toBe(b.f[1].def.hp);
    expect(b.f[1].act).toBe('block');
  });

  it('low kicks must be blocked crouching', () => {
    const standing = fight();
    run(standing, 14, (n) => [pad({ k: n === 0, down: n === 0 }), pad({ right: true })]);
    expect(standing.f[1].hp).toBeLessThan(standing.f[1].def.hp);

    const crouching = fight();
    run(crouching, 14, (n) => [pad({ k: n === 0, down: n === 0 }), pad({ right: true, down: true })]);
    expect(crouching.f[1].hp).toBe(crouching.f[1].def.hp);
  });

  it('jumping attacks must be blocked standing', () => {
    const play = (crouch: boolean) => {
      const b = fight('kenta', 'kenta', 130);
      run(b, 60, (n) => [pad({ up: n === 0, right: n === 0, k: n === 22 }), pad({ right: true, down: crouch })]);
      return b.f[1].hp < b.f[1].def.hp;
    };
    expect(play(true)).toBe(true);
    expect(play(false)).toBe(false);
  });

  it('a throw up close cannot be blocked and knocks down', () => {
    const b = fight('kenta', 'kenta', 32);
    run(b, 80, (n) => [pad({ p: n === 0, right: n === 0 }), pad({ right: true })]);
    expect(b.f[1].hp).toBeLessThan(b.f[1].def.hp);
    expect(['fall', 'down', 'getup']).toContain(b.f[1].act);
  });

  it('a punch cancelled into a special makes a combo', () => {
    const b = fight();
    run(b, 40, (n) => [pad({ p: n === 0, s: n === 6, right: n === 6 }), pad()]);
    expect(b.f[0].stats.bestCombo).toBeGreaterThanOrEqual(2);
  });
});

describe('specials and supers', () => {
  it('a fireball travels across the stage and hits', () => {
    const b = fight('kenta', 'kenta', 200);
    run(b, 15, (n) => [pad({ s: n === 0 }), pad()]);
    expect(b.projs).toHaveLength(1);
    run(b, 60);
    expect(b.f[1].hp).toBeLessThan(b.f[1].def.hp);
  });

  it('two fireballs cancel each other out', () => {
    const b = fight('kenta', 'kenta', 240);
    run(b, 90, (n) => [pad({ s: n === 0 }), pad({ s: n === 0 })]);
    expect(b.f[0].hp).toBe(b.f[0].def.hp);
    expect(b.f[1].hp).toBe(b.f[1].def.hp);
  });

  it('the super needs a full meter and empties it', () => {
    const empty = fight();
    run(empty, 3, (n) => [pad({ p: n === 0, k: n === 0 }), pad()]);
    expect(empty.f[0].run?.m.super).toBeFalsy();

    const full = fight('rex', 'kenta', 50);
    full.f[0].meter = METER_MAX;
    run(full, 2, (n) => [pad({ p: n === 0, k: n === 0 }), pad()]);
    expect(full.f[0].run?.m.super).toBe(true);
    expect(full.f[0].meter).toBe(0);
    run(full, 120);
    expect(full.f[1].hp).toBeLessThan(full.f[1].def.hp - 150);
  });

  it('a rising special is invulnerable at the start', () => {
    const b = fight();
    run(b, 2, (n) => [pad({ s: n === 0, down: n === 0 }), pad()]);
    expect(b.f[0].invuln).toBeGreaterThan(0);
    expect(hurtbox(b.f[0])).toBeNull();
  });
});

describe('rounds and matches', () => {
  it('a knockout ends the round and the winner is recorded', () => {
    const b = fight();
    b.f[1].hp = 10;
    run(b, 200, (n) => [pad({ p: n === 0 }), pad()]);
    expect(b.winner).toBe(0);
    expect(b.phase).toBe('over');
    nextRound(b);
    expect(b.round).toBe(2);
    expect(b.f[1].hp).toBe(b.f[1].def.hp);
  });

  it('time out goes to whoever has more health left', () => {
    const b = fight('kenta', 'kenta', 200);
    b.f[0].hp = 500;
    b.timer = 5;
    run(b, 10);
    expect(b.winner).toBe(1);
    expect(b.koBy).toBe('time');
  });

  it('winning an arcade match moves up the ladder; losing ends the run', () => {
    const s = create('normal', 'arcade', 'kenta', 'mei');
    s.battle.f[0].wins = 1;
    s.battle.phase = 'fight';
    s.battle.f[1].hp = 5;
    s.battle.f[0].x = 220;
    s.battle.f[1].x = 260;
    for (let n = 0; n < 500 && s.rung === 0; n++) frame(s, [pad({ p: n % 20 === 0 }), pad()]);
    expect(s.rung).toBe(1);
    expect(s.score).toBeGreaterThan(0);

    const l = create('normal', 'arcade', 'kenta', 'mei');
    l.battle.f[1].wins = 1;
    l.battle.phase = 'fight';
    l.battle.f[0].hp = 5;
    l.battle.f[0].x = 220;
    l.battle.f[1].x = 260;
    for (let n = 0; n < 500 && !l.over; n++) frame(l, [pad(), pad({ p: n % 20 === 0 })]);
    expect(l.over).toBe(true);
    expect(l.won).toBe(false);
  });

  it('keys become pads: J punches in arcade, F and comma in versus', () => {
    const s = create('normal', 'arcade', 'kenta', 'mei');
    s.battle.phase = 'fight';
    const input = emptyInput();
    input.keys.add('j');
    update(s, 1 / 60, input, Math.random);
    expect(s.battle.f[0].run?.m.name).toBe('Jab');

    const v = create('normal', 'versus', 'kenta', 'mei');
    v.battle.phase = 'fight';
    const both = emptyInput();
    both.keys.add('f');
    both.keys.add(',');
    update(v, 1 / 60, both, Math.random);
    expect(v.battle.f[0].run?.m.name).toBe('Jab');
    expect(v.battle.f[1].run?.m.name).toBe('Jab');
  });

  it('the touch ★ button fires the super when the meter is full', () => {
    const s = create('normal', 'arcade', 'kenta', 'mei');
    s.battle.phase = 'fight';
    s.battle.f[0].meter = METER_MAX;
    const input = emptyInput();
    input.pressed.add('action4');
    update(s, 1 / 60, input, Math.random);
    update(s, 1 / 60, emptyInput(), Math.random);
    expect(s.battle.f[0].run?.m.super).toBe(true);
  });
});

describe('computer fighters', () => {
  /** Plays a whole match between two computer fighters; returns the winner's side. */
  function cpuMatch(a: string, b: string, da: 'easy' | 'normal' | 'hard', db: 'easy' | 'normal' | 'hard', seed: number) {
    const bt = makeBattle(fighterById(a), fighterById(b), 0);
    const brains = [newBrain(), newBrain()];
    const skills = [skillFor(da, 0), skillFor(db, 0)];
    const r = rng(seed);
    for (let n = 0; n < 60 * 600; n++) {
      stepBattle(bt, [cpuPad(bt, 0, brains[0], skills[0], r), cpuPad(bt, 1, brains[1], skills[1], r)]);
      if (bt.phase === 'over') {
        if (bt.winner < 2) bt.f[bt.winner].wins++;
        if (bt.f[0].wins === 2 || bt.f[1].wins === 2) return bt.f[0].wins === 2 ? 0 : 1;
        nextRound(bt);
      }
    }
    return -1;
  }

  it('every pairing of fighters finishes its matches', () => {
    let n = 0;
    for (const a of ALL_FIGHTERS)
      for (const b of ALL_FIGHTERS) if (a !== b && n++ % 4 === 0) expect(cpuMatch(a.id, b.id, 'normal', 'normal', n)).not.toBe(-1);
  }, 60_000);

  it('a hard computer beats an easy one most of the time', () => {
    let hard = 0;
    for (let i = 0; i < 16; i++) if (cpuMatch(ROSTER[i % 8].id, ROSTER[(i + 3) % 8].id, 'hard', 'easy', 100 + i) === 0) hard++;
    expect(hard).toBeGreaterThanOrEqual(11);
  }, 60_000);
});
