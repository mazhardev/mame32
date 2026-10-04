import type { DifficultySetting } from '@/types';

/**
 * Boxing rules and the computer boxer. The opponent cycles through guard,
 * a telegraphed wind-up, the punch and a short recovery in which it is open.
 * Jabs are dodged either way or blocked; hooks must be dodged away from the
 * swinging glove (or blocked); uppercuts cannot be blocked, only dodged.
 */
export type Punch = 'jab' | 'hookL' | 'hookR' | 'upper';
export type OppState = 'guard' | 'windup' | 'punch' | 'recover' | 'stunned' | 'down';
export type Dodge = 'none' | 'left' | 'right';

export const ROUND_TIME = 45;
export const ROUNDS = 3;
const DAMAGE: Record<Punch, number> = { jab: 8, hookL: 12, hookR: 12, upper: 16 };

export interface AiCfg {
  windup: number;
  recover: number;
  guardTime: [number, number];
  /** Chance a punch thrown at its guard is blocked. */
  block: number;
  /** Chance a wind-up is a feint that goes straight back to guard. */
  feint: number;
  /** Button presses needed to get up from a knockdown. */
  getUp: number;
}

export const AI: Record<DifficultySetting, AiCfg> = {
  easy: { windup: 0.8, recover: 0.75, guardTime: [1.3, 2.3], block: 0.55, feint: 0, getUp: 6 },
  normal: { windup: 0.58, recover: 0.55, guardTime: [0.9, 1.7], block: 0.7, feint: 0.1, getUp: 10 },
  hard: { windup: 0.42, recover: 0.4, guardTime: [0.6, 1.2], block: 0.82, feint: 0.2, getUp: 14 },
};

export interface Fighter {
  hp: number;
  stamina: number;
  knockdowns: number;
  /** Damage dealt this round, for the judges. */
  roundDamage: number;
  cards: number[];
}

export interface Bout {
  you: Fighter;
  opp: Fighter;
  oppState: OppState;
  stateT: number;
  next: Punch;
  dodge: Dodge;
  dodgeT: number;
  blocking: boolean;
  /** Seconds until your next punch can land. */
  recoil: number;
  combo: number;
  round: number;
  clock: number;
  /** You are down: presses so far and the count. */
  youDown: boolean;
  presses: number;
  count: number;
  ai: AiCfg;
  over: 'ko-win' | 'ko-loss' | 'decision' | null;
  log: { text: string; t: number };
  hitFlash: number;
  youFlash: number;
  bestCombo: number;
  counters: number;
}

const fighter = (): Fighter => ({
  hp: 100,
  stamina: 100,
  knockdowns: 0,
  roundDamage: 0,
  cards: [],
});

export function newBout(difficulty: DifficultySetting): Bout {
  return {
    you: fighter(),
    opp: fighter(),
    oppState: 'guard',
    stateT: 1.4,
    next: 'jab',
    dodge: 'none',
    dodgeT: 0,
    blocking: false,
    recoil: 0,
    combo: 0,
    round: 1,
    clock: ROUND_TIME,
    youDown: false,
    presses: 0,
    count: 0,
    ai: AI[difficulty],
    over: null,
    log: { text: 'Round 1 — fight!', t: 1.6 },
    hitFlash: 0,
    youFlash: 0,
    bestCombo: 0,
    counters: 0,
  };
}

function say(b: Bout, text: string, t = 1) {
  b.log = { text, t };
}

/** Does the incoming punch miss, given how you are defending? */
export function defended(p: Punch, dodge: Dodge, blocking: boolean): 'dodged' | 'blocked' | 'hit' {
  if (p === 'jab') return dodge !== 'none' ? 'dodged' : blocking ? 'blocked' : 'hit';
  if (p === 'hookL') return dodge === 'right' ? 'dodged' : blocking ? 'blocked' : 'hit';
  if (p === 'hookR') return dodge === 'left' ? 'dodged' : blocking ? 'blocked' : 'hit';
  return dodge !== 'none' ? 'dodged' : 'hit';
}

export type Sound = 'hit' | 'blip' | 'whoosh' | 'explosion' | 'success' | 'failure';

/** Your punch. Returns the sound to play, if any. */
export function throwPunch(b: Bout, kind: 'jab' | 'hook', random: () => number): Sound | null {
  if (b.recoil > 0 || b.youDown || b.dodge !== 'none' || b.oppState === 'down' || b.over)
    return null;
  const cost = kind === 'jab' ? 7 : 14;
  if (b.you.stamina < cost) {
    say(b, 'Too tired!', 0.6);
    return 'blip';
  }
  b.you.stamina -= cost;
  b.recoil = kind === 'jab' ? 0.22 : 0.38;
  let dmg = kind === 'jab' ? 5 : 10;
  const s = b.oppState;
  if (s === 'guard' && random() < b.ai.block) {
    dmg *= 0.15;
    b.combo = 0;
    say(b, 'Blocked', 0.4);
    hurt(b.opp, dmg);
    return 'blip';
  }
  if (s === 'windup') {
    // Beating the punch to the punch: a counter that interrupts it.
    dmg *= 1.6;
    b.counters += 1;
    say(b, 'Counter!', 0.7);
    b.oppState = 'recover';
    b.stateT = b.ai.recover;
  } else if (s === 'recover' || s === 'stunned') {
    dmg *= 1.5;
  }
  b.combo += 1;
  b.bestCombo = Math.max(b.bestCombo, b.combo);
  b.hitFlash = 0.15;
  hurt(b.opp, dmg);
  b.you.roundDamage += dmg;
  if (b.combo >= 4 && b.oppState === 'recover') {
    b.oppState = 'stunned';
    b.stateT = 0.9;
    say(b, 'Dazed!', 0.8);
  }
  if (b.opp.hp <= 0) knockdown(b, 'opp');
  return 'hit';
}

function hurt(f: Fighter, dmg: number) {
  f.hp = Math.max(0, f.hp - dmg);
}

function knockdown(b: Bout, who: 'you' | 'opp') {
  const f = who === 'you' ? b.you : b.opp;
  f.knockdowns += 1;
  if (f.knockdowns >= 3) {
    b.over = who === 'opp' ? 'ko-win' : 'ko-loss';
    say(b, who === 'opp' ? 'K.O.! You win!' : 'K.O. — you lose', 3);
    if (who === 'opp') b.oppState = 'down';
    return;
  }
  if (who === 'opp') {
    b.oppState = 'down';
    b.stateT = 3;
    say(b, 'DOWN! 1… 2… 3…', 2.5);
  } else {
    b.youDown = true;
    b.presses = 0;
    b.count = 0;
    say(b, 'You’re down! Mash Space / tap to get up', 3);
  }
  b.combo = 0;
}

function pickPunch(random: () => number): Punch {
  const r = random();
  return r < 0.45 ? 'jab' : r < 0.65 ? 'hookL' : r < 0.85 ? 'hookR' : 'upper';
}

export function dodge(b: Bout, side: Dodge) {
  if (b.dodge !== 'none' || b.youDown || b.over || side === 'none') return;
  b.dodge = side;
  b.dodgeT = 0.42;
  b.combo = 0;
}

/** Advances the bout. Returns sounds to play. */
export function step(b: Bout, dt: number, random: () => number): Sound[] {
  const sounds: Sound[] = [];
  if (b.over) return sounds;
  b.log.t = Math.max(0, b.log.t - dt);
  b.hitFlash = Math.max(0, b.hitFlash - dt);
  b.youFlash = Math.max(0, b.youFlash - dt);
  b.recoil = Math.max(0, b.recoil - dt);
  b.you.stamina = Math.min(100, b.you.stamina + (b.blocking ? 8 : 20) * dt);
  if (b.dodge !== 'none') {
    b.dodgeT -= dt;
    if (b.dodgeT <= 0) b.dodge = 'none';
  }

  if (b.youDown) {
    b.count += dt * 1.2;
    if (b.presses >= b.ai.getUp) {
      b.youDown = false;
      b.you.hp = 40;
      say(b, 'Back on your feet!', 1.2);
      b.oppState = 'guard';
      b.stateT = 1.5;
    } else if (b.count >= 10) {
      b.you.knockdowns = 3;
      b.over = 'ko-loss';
      say(b, 'Counted out — K.O.', 3);
      sounds.push('failure');
    }
    return sounds;
  }

  b.clock -= dt;
  if (b.clock <= 0) {
    b.you.cards.push(b.you.roundDamage);
    b.opp.cards.push(b.opp.roundDamage);
    b.you.roundDamage = 0;
    b.opp.roundDamage = 0;
    if (b.round >= ROUNDS) {
      b.over = 'decision';
      say(b, 'Time! The judges decide…', 3);
      return sounds;
    }
    b.round += 1;
    b.clock = ROUND_TIME;
    b.you.hp = Math.min(100, b.you.hp + 25);
    b.opp.hp = Math.min(100, b.opp.hp + 25);
    b.oppState = 'guard';
    b.stateT = 2;
    say(b, `Round ${b.round}!`, 1.6);
    sounds.push('success');
    return sounds;
  }

  b.stateT -= dt;
  if (b.stateT > 0) return sounds;
  switch (b.oppState) {
    case 'guard':
    case 'stunned':
      b.next = pickPunch(random);
      b.oppState = 'windup';
      b.stateT = b.ai.windup * (b.next === 'upper' ? 1.15 : 1);
      break;
    case 'windup':
      if (random() < b.ai.feint) {
        b.oppState = 'guard';
        b.stateT = 0.4;
        break;
      }
      b.oppState = 'punch';
      b.stateT = 0.12;
      sounds.push('whoosh');
      break;
    case 'punch': {
      const res = defended(b.next, b.dodge, b.blocking);
      const dmg = DAMAGE[b.next];
      if (res === 'hit') {
        hurt(b.you, dmg);
        b.opp.roundDamage += dmg;
        b.youFlash = 0.3;
        b.combo = 0;
        sounds.push('explosion');
        if (b.you.hp <= 0) knockdown(b, 'you');
      } else if (res === 'blocked') {
        hurt(b.you, dmg * 0.25);
        b.you.stamina = Math.max(0, b.you.stamina - 15);
        sounds.push('blip');
      } else {
        say(b, 'Slipped it!', 0.5);
      }
      b.oppState = 'recover';
      b.stateT = res === 'dodged' ? b.ai.recover * 1.3 : b.ai.recover;
      break;
    }
    case 'recover':
      b.oppState = 'guard';
      b.stateT = b.ai.guardTime[0] + random() * (b.ai.guardTime[1] - b.ai.guardTime[0]);
      break;
    case 'down':
      b.opp.hp = 40;
      b.oppState = 'guard';
      b.stateT = 1.2;
      say(b, 'Up at the count of 6!', 1.2);
      break;
  }
  return sounds;
}

/** Points decision: damage per round, with knockdowns costing 15 each. */
export function judges(b: Bout): { you: number; opp: number } {
  const you = b.you.cards.reduce((a, c) => a + c, 0) - b.you.knockdowns * 15;
  const opp = b.opp.cards.reduce((a, c) => a + c, 0) - b.opp.knockdowns * 15;
  return { you: Math.round(you), opp: Math.round(opp) };
}

export function won(b: Bout): boolean {
  if (b.over === 'ko-win') return true;
  if (b.over === 'ko-loss') return false;
  const j = judges(b);
  return j.you > j.opp;
}
