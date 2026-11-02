import type { DifficultySetting } from '@/types';
import { baseState } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';
import { cpuPad, newBrain, skillFor } from './ai';
import type { Brain, Skill } from './ai';
import { METER_MAX, emptyPad, makeBattle, nextRound, stepBattle } from './engine';
import type { Battle, Pad } from './engine';
import { STAGES, fighterById, ladderFor } from './fighters';
import type { FighterDef } from './fighters';

/**
 * Dojo Duel game flow around the fight engine: the arcade ladder (seven
 * opponents then the boss), a two-player versus match on one keyboard,
 * best-of-three rounds, scoring, and turning keys and touch buttons into pads.
 */
export const W = 480;
export const H = 270;
export const FLOOR_Y = 240;
const FRAME = 1 / 60;
const WINS_NEEDED = 2;
const MAX_ROUNDS = 5;
const BETWEEN_FRAMES = 60 * 3.2;

export type Mode = 'arcade' | 'versus';

export type Phase = 'fight' | 'matchEnd' | 'between' | 'done';

export interface State extends BaseState {
  mode: Mode;
  difficulty: DifficultySetting;
  p1: FighterDef;
  ladder: FighterDef[];
  rung: number;
  battle: Battle;
  brain: Brain;
  skill: Skill;
  phase: Phase;
  phaseT: number;
  acc: number;
  /** Button presses waiting for the next simulated frame. */
  pending: [Pad, Pad];
  /** Health shown in the bars, catching up after a hit. */
  shownHp: [number, number];
  /** Winner of the match just played (0 or 1), or -1 for a draw. */
  matchWinner: number;
  won: boolean;
  /** Bonuses earned at the end of the last round, for the banner. */
  bonus: { text: string; t: number }[];
  stats: { bestCombo: number; perfects: number; superFinish: boolean; beaten: number; bossBeaten: boolean };
}

function battleFor(p1: FighterDef, p2: FighterDef, rung: number, mode: Mode): Battle {
  const stage = mode === 'arcade' ? (p2.stage + rung) % STAGES.length : (p1.stage + p2.stage) % STAGES.length;
  return makeBattle(p1, p2, p2.id === 'oni' ? 4 : stage === 4 ? 0 : stage);
}

export function create(difficulty: DifficultySetting, mode: Mode, p1Id: string, p2Id: string): State {
  const p1 = fighterById(p1Id);
  const ladder = mode === 'arcade' ? ladderFor(p1.id) : [fighterById(p2Id)];
  const battle = battleFor(p1, ladder[0], 0, mode);
  return {
    ...baseState(),
    mode,
    difficulty,
    p1,
    ladder,
    rung: 0,
    battle,
    brain: newBrain(),
    skill: skillFor(difficulty, 0),
    phase: 'fight',
    phaseT: 0,
    acc: 0,
    pending: [emptyPad(), emptyPad()],
    shownHp: [p1.hp, ladder[0].hp],
    matchWinner: -1,
    won: false,
    bonus: [],
    stats: { bestCombo: 0, perfects: 0, superFinish: false, beaten: 0, bossBeaten: false },
  };
}

export const opponent = (s: State) => s.ladder[s.rung];

/* ------------------------------------------------------------------ input */
/** Keyboard layout: single player uses arrows or WASD; versus splits the keyboard. */
export const SOLO_KEYS = {
  left: ['arrowleft', 'a'],
  right: ['arrowright', 'd'],
  up: ['arrowup', 'w'],
  down: ['arrowdown', 's'],
  p: ['j', 'z'],
  k: ['k', 'x'],
  s: ['l', 'c'],
  super: [' ', 'i', 'v'],
};
export const P1_KEYS = { left: ['a'], right: ['d'], up: ['w'], down: ['s'], p: ['f'], k: ['g'], s: ['h'], super: ['t'] };
export const P2_KEYS = {
  left: ['arrowleft'],
  right: ['arrowright'],
  up: ['arrowup'],
  down: ['arrowdown'],
  p: [',', '1'],
  k: ['.', '2'],
  s: ['/', '3'],
  super: [';', '0'],
};
/** Raw keys the game listens to (the runner lower-cases letters only). */
export const ALL_KEYS = [
  ...new Set([...Object.values(SOLO_KEYS), ...Object.values(P1_KEYS), ...Object.values(P2_KEYS)].flat()),
].map((k) => (k.startsWith('arrow') ? `Arrow${k[5].toUpperCase()}${k.slice(6)}` : k));

type Keys = typeof SOLO_KEYS;
const norm = (k: string) => k.toLowerCase();

function padFrom(input: Input, keys: Keys, touch: boolean): { pad: Pad; superPress: boolean } {
  const held = new Set([...input.keysHeld].map(norm));
  const pressed = new Set([...input.keys].map(norm));
  const any = (list: string[], set: Set<string>) => list.some((k) => set.has(k));
  const pad: Pad = {
    left: any(keys.left, held) || (touch && input.held.has('left')),
    right: any(keys.right, held) || (touch && input.held.has('right')),
    up: any(keys.up, held) || (touch && input.held.has('up')),
    down: any(keys.down, held) || (touch && input.held.has('down')),
    p: any(keys.p, pressed) || (touch && input.pressed.has('action')),
    k: any(keys.k, pressed) || (touch && input.pressed.has('action2')),
    s: any(keys.s, pressed) || (touch && input.pressed.has('action3')),
  };
  // Left and right together cancel out.
  if (pad.left && pad.right) pad.left = pad.right = false;
  return { pad, superPress: any(keys.super, pressed) || (touch && input.pressed.has('action4')) };
}

/** Buttons from this update are kept until a frame is simulated. */
function merge(into: Pad, from: Pad, superPress: boolean) {
  into.left = from.left;
  into.right = from.right;
  into.up = from.up;
  into.down = from.down;
  into.p = into.p || from.p || superPress;
  into.k = into.k || from.k || superPress;
  into.s = into.s || from.s;
}

/* ------------------------------------------------------------------ flow */
function startMatch(s: State) {
  s.battle = battleFor(s.p1, opponent(s), s.rung, s.mode);
  s.brain = newBrain();
  s.skill = skillFor(s.difficulty, s.rung);
  s.shownHp = [s.p1.hp, opponent(s).hp];
  s.phase = 'fight';
  s.phaseT = 0;
  s.matchWinner = -1;
}

function roundOver(s: State) {
  const b = s.battle;
  const [me, them] = b.f;
  const w = b.winner;
  if (w === 0 || w === 1) b.f[w].wins++;
  if (s.mode === 'arcade' && w === 0) {
    const secs = Math.ceil(b.timer / 60);
    const lines: [string, number][] = [
      ['Round won', 1000],
      [`Time bonus ${secs}s`, secs * 20],
    ];
    if (me.hp === me.def.hp) {
      lines.push(['PERFECT', 5000]);
      s.stats.perfects++;
    }
    if (b.koBy === 'super') {
      lines.push(['Super finish', 2000]);
      s.stats.superFinish = true;
    }
    for (const [text, pts] of lines) {
      s.score += pts;
      s.bonus.push({ text: `${text} +${pts.toLocaleString()}`, t: 0 });
    }
  }
  s.stats.bestCombo = Math.max(s.stats.bestCombo, me.stats.bestCombo);
  const decided = me.wins >= WINS_NEEDED || them.wins >= WINS_NEEDED || b.round >= MAX_ROUNDS;
  if (!decided) {
    nextRound(b);
    s.brain = newBrain();
    s.shownHp = [me.def.hp, them.def.hp];
    return;
  }
  s.matchWinner = me.wins > them.wins ? 0 : them.wins > me.wins ? 1 : -1;
  s.phase = 'matchEnd';
  s.phaseT = 0;
  s.events.push(s.matchWinner === 0 || s.mode === 'versus' ? 'success' : 'failure');
}

function afterMatch(s: State) {
  if (s.mode === 'versus') {
    s.won = s.matchWinner === 0;
    s.phase = 'done';
    s.over = true;
    return;
  }
  if (s.matchWinner !== 0) {
    s.phase = 'done';
    s.over = true;
    return;
  }
  s.stats.beaten++;
  if (opponent(s).id === 'oni') s.stats.bossBeaten = true;
  s.score += 3000 * (s.rung + 1);
  if (s.rung >= s.ladder.length - 1) {
    s.won = true;
    s.phase = 'done';
    s.over = true;
    s.events.push('levelComplete');
    return;
  }
  s.rung++;
  s.phase = 'between';
  s.phaseT = 0;
}

/** One simulated frame. */
export function frame(s: State, pads: [Pad, Pad]) {
  s.phaseT++;
  for (const t of s.bonus) t.t++;
  s.bonus = s.bonus.filter((t) => t.t < 150);
  const b = s.battle;
  for (let i = 0; i < 2; i++) {
    const hp = b.f[i].hp;
    s.shownHp[i] = hp < s.shownHp[i] ? Math.max(hp, s.shownHp[i] - 4) : hp;
  }
  if (s.phase === 'fight') {
    const before = b.f[0].stats.dealt;
    stepBattle(b, pads);
    if (s.mode === 'arcade') s.score += (b.f[0].stats.dealt - before) * 2;
    for (const e of b.events) s.events.push(e);
    b.events.length = 0;
    if (b.phase === 'over') roundOver(s);
  } else if (s.phase === 'matchEnd') {
    stepBattle(b, [emptyPad(), emptyPad()]);
    b.events.length = 0;
    if (s.phaseT >= 120) afterMatch(s);
  } else if (s.phase === 'between') {
    if (s.phaseT >= BETWEEN_FRAMES) startMatch(s);
  }
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  const p1 = padFrom(input, s.mode === 'versus' ? P1_KEYS : SOLO_KEYS, true);
  merge(s.pending[0], p1.pad, p1.superPress && s.battle.f[0].meter >= METER_MAX);
  if (s.mode === 'versus') {
    const p2 = padFrom(input, P2_KEYS, false);
    merge(s.pending[1], p2.pad, p2.superPress && s.battle.f[1].meter >= METER_MAX);
  }
  s.acc = Math.min(s.acc + dt, FRAME * 6);
  while (s.acc >= FRAME - 1e-9 && !s.over) {
    s.acc -= FRAME;
    const cpu = s.mode === 'arcade' ? cpuPad(s.battle, 1, s.brain, s.skill, random) : s.pending[1];
    frame(s, [s.pending[0], cpu]);
    for (const p of s.pending) p.p = p.k = p.s = false;
  }
}
