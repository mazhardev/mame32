import type { DifficultySetting } from '@/types';
import { BODY_W, METER_MAX, emptyPad } from './engine';
import type { Battle, Fighter, MoveRun, Pad } from './engine';

/**
 * The computer fighter. It reads the fight like a player would, a few frames
 * late: it blocks attacks it sees coming (guessing high or low), meets jumps
 * with an anti-air, turns hits into combos, punishes whiffs and otherwise
 * walks, pokes, jumps in or fires projectiles according to its personality.
 * How fast it reacts and how often it gets each read right is its skill.
 */
export interface Skill {
  /** Frames before it reacts to what it sees. */
  react: number;
  block: number;
  antiAir: number;
  combo: number;
  punish: number;
  aggro: number;
}

export const SKILLS: Record<DifficultySetting, Skill> = {
  easy: { react: 22, block: 0.22, antiAir: 0.18, combo: 0.15, punish: 0.2, aggro: 0.45 },
  normal: { react: 13, block: 0.5, antiAir: 0.45, combo: 0.45, punish: 0.5, aggro: 0.6 },
  hard: { react: 8, block: 0.78, antiAir: 0.75, combo: 0.8, punish: 0.8, aggro: 0.7 },
};

/** Opponents further up the arcade ladder get a little sharper. */
export function skillFor(d: DifficultySetting, rung: number): Skill {
  const s = SKILLS[d];
  const up = Math.min(rung, 7) * 0.025;
  return {
    react: Math.max(5, s.react - Math.floor(rung / 2)),
    block: Math.min(0.92, s.block + up),
    antiAir: Math.min(0.92, s.antiAir + up),
    combo: Math.min(0.95, s.combo + up),
    punish: Math.min(0.95, s.punish + up),
    aggro: s.aggro,
  };
}

type Dir = 'none' | 'fwd' | 'back' | 'down' | 'downback' | 'up' | 'upfwd';
type Btn = 'p' | 'k' | 's' | 'pk';

interface Step {
  /** Frames to wait before this step. */
  at: number;
  dir: Dir;
  btn?: Btn;
}

export interface Brain {
  hold: Dir;
  holdT: number;
  plan: Step[];
  wait: number;
  seenRun: MoveRun | null;
  seenProj: number;
  seenJump: boolean;
  /** A reaction scheduled for the future. */
  react: { t: number; kind: 'guardHigh' | 'guardLow' | 'antiAir' | 'jumpOver' | 'punish' | 'none' } | null;
  guardT: number;
  guardLow: boolean;
  comboTried: MoveRun | null;
}

export function newBrain(): Brain {
  return {
    hold: 'none',
    holdT: 0,
    plan: [],
    wait: 30,
    seenRun: null,
    seenProj: 0,
    seenJump: false,
    react: null,
    guardT: 0,
    guardLow: true,
    comboTried: null,
  };
}

function toPad(f: Fighter, dir: Dir, btn?: Btn): Pad {
  const pad = emptyPad();
  const fwdKey = f.face === 1 ? 'right' : 'left';
  const backKey = f.face === 1 ? 'left' : 'right';
  if (dir === 'fwd' || dir === 'upfwd') pad[fwdKey] = true;
  if (dir === 'back' || dir === 'downback') pad[backKey] = true;
  if (dir === 'down' || dir === 'downback') pad.down = true;
  if (dir === 'up' || dir === 'upfwd') pad.up = true;
  if (btn === 'p' || btn === 'pk') pad.p = true;
  if (btn === 'k' || btn === 'pk') pad.k = true;
  if (btn === 's') pad.s = true;
  return pad;
}

const free = (f: Fighter) => !f.run && (f.act === 'stand' || f.act === 'walk' || f.act === 'crouch');
const reachOf = (f: Fighter) => 60 * f.def.scale;

/** Which special to finish a combo with. */
function comboSpecial(f: Fighter, dist: number): Dir {
  const sp = f.def.specials;
  if (sp.fwd.pose === 'rush' || sp.fwd.pose === 'slide' || sp.fwd.pose === 'burst') return 'fwd';
  if (sp.down.pose === 'rise' && dist < 70) return 'down';
  if (sp.neutral.proj || sp.neutral.pose === 'spin' || sp.neutral.pose === 'rush') return 'none';
  return 'down';
}

function hasAntiAir(f: Fighter) {
  const d = f.def.specials.down;
  return d.pose === 'rise' || d.pose === 'burst' || f.def.specials.neutral.pose === 'spin';
}

/** One frame of the computer's controls. */
export function cpuPad(b: Battle, side: 0 | 1, brain: Brain, skill: Skill, rand: () => number): Pad {
  const me = b.f[side];
  const op = b.f[1 - side];
  if (b.phase !== 'fight') return emptyPad();
  const dist = Math.abs(op.x - me.x);
  const gapBetween = dist - BODY_W;

  // 1. Notice new threats; act on them after the reaction delay.
  const run = op.run;
  if (run && run !== brain.seenRun) {
    brain.seenRun = run;
    const m = run.m;
    const reach = (m.box ? (m.box.x + m.box.w) * op.def.scale : 40) + (m.move ? m.move[0] * (m.move[2] - m.move[1]) : 0) + 40;
    if (m.level === 'grab' && dist < reach) brain.react = { t: skill.react, kind: 'punish' };
    else if (m.box && dist < reach && rand() < skill.block) {
      // Lows need a crouching guard and overheads a standing one; anything
      // else can be blocked either way. Weaker players guess wrong more.
      const correctLow = m.level === 'low' ? true : m.level === 'over' ? false : rand() < 0.7;
      const low = rand() < 0.5 + skill.block * 0.5 ? correctLow : !correctLow;
      brain.react = { t: skill.react, kind: low ? 'guardLow' : 'guardHigh' };
    }
  }
  const projs = b.projs.filter((p) => p.owner !== side).length;
  if (projs > brain.seenProj) {
    const r = rand();
    brain.react = {
      t: skill.react,
      kind: r < skill.block * 0.6 ? 'jumpOver' : r < skill.block + 0.1 ? 'guardLow' : 'none',
    };
  }
  brain.seenProj = projs;
  const jumping = op.act === 'jump' || (op.run?.m.air ?? false);
  const towardMe = Math.sign(op.vx) === Math.sign(me.x - op.x) || Math.abs(op.vx) < 0.5;
  if (jumping && !brain.seenJump && dist < 190 && towardMe) {
    brain.seenJump = true;
    const r = rand();
    brain.react = { t: skill.react, kind: r < skill.antiAir ? 'antiAir' : r < skill.antiAir + skill.block * 0.5 ? 'guardHigh' : 'none' };
  }
  if (!jumping) brain.seenJump = false;

  if (brain.react) {
    brain.react.t--;
    if (brain.react.t <= 0) {
      const k = brain.react.kind;
      brain.react = null;
      brain.plan = [];
      if (k === 'guardHigh' || k === 'guardLow') {
        brain.guardT = 26;
        brain.guardLow = k === 'guardLow';
      } else if (k === 'antiAir' && free(me)) {
        brain.guardT = 0;
        if (hasAntiAir(me) && dist < 120) brain.plan = [{ at: 0, dir: me.def.specials.down.pose === 'rise' || me.def.specials.down.pose === 'burst' ? 'down' : 'none', btn: 's' }];
        else brain.plan = [{ at: 0, dir: 'none', btn: 'k' }];
      } else if (k === 'jumpOver' && free(me) && dist > 110) {
        brain.plan = [{ at: 0, dir: 'upfwd' }, { at: 14, dir: 'none', btn: 'k' }];
      } else if (k === 'punish' && free(me)) {
        brain.plan = [{ at: 0, dir: 'back' }];
      }
    }
  }

  // 2. Holding a guard.
  if (brain.guardT > 0) {
    brain.guardT--;
    if (me.act === 'block' || free(me)) return toPad(me, brain.guardLow ? 'downback' : 'back');
  }
  if (me.act === 'block') return toPad(me, brain.guardLow ? 'downback' : 'back');

  // 3. Turn a landed hit into a combo.
  const mine = me.run;
  if (mine && mine.connected && !mine.special && mine !== brain.comboTried && mine.m.cancel) {
    brain.comboTried = mine;
    if (op.act === 'hit' && rand() < skill.combo) {
      if (me.meter >= METER_MAX && rand() < 0.6) return toPad(me, 'none', 'pk');
      return toPad(me, comboSpecial(me, dist), 's');
    }
    if (op.act === 'hit' && mine.m.chain && rand() < skill.combo) return toPad(me, 'none', 'p');
  }
  // Jump-ins: kick on the way down.
  if (me.act === 'jump' && !me.run && me.vy < 1 && dist < 70 && me.y < 70 && rand() < 0.4) return toPad(me, 'none', 'k');

  // 4. Follow the current plan.
  if (brain.plan.length) {
    const step = brain.plan[0];
    if (step.at > 0) {
      step.at--;
      return toPad(me, brain.hold);
    }
    brain.plan.shift();
    brain.hold = step.dir === 'up' || step.dir === 'upfwd' ? 'none' : step.dir;
    return toPad(me, step.dir, step.btn);
  }
  if (brain.holdT > 0) {
    brain.holdT--;
    return toPad(me, brain.hold);
  }
  if (!free(me)) return toPad(me, brain.hold === 'downback' || brain.hold === 'back' ? brain.hold : 'none');

  // 5. Punish a whiffed move.
  if (op.run && op.run.t > op.run.m.startup + op.run.m.active && !op.run.connected && dist < reachOf(me) + 20 && rand() < skill.punish * 0.25) {
    if (me.meter >= METER_MAX && rand() < 0.5) return toPad(me, 'none', 'pk');
    brain.plan = [{ at: 0, dir: 'none', btn: rand() < 0.5 ? 'k' : 'p' }];
    return toPad(me, 'none');
  }

  // 6. Neutral game.
  if (--brain.wait > 0) return toPad(me, brain.hold);
  brain.wait = 8 + Math.floor(rand() * 18);
  const rush = me.def.rushdown * skill.aggro + 0.15;
  const sp = me.def.specials;
  const r = rand();
  brain.hold = 'none';
  if (dist > 220) {
    if (sp.neutral.proj && r < 0.55 - rush * 0.4) brain.plan = [{ at: 0, dir: 'none', btn: 's' }];
    else if (r < 0.75) {
      brain.hold = 'fwd';
      brain.holdT = 18 + Math.floor(rand() * 26);
    } else if (r < 0.88) brain.plan = [{ at: 0, dir: 'upfwd' }];
    else brain.holdT = 10;
  } else if (dist > 100) {
    if (r < 0.32 + rush * 0.2) {
      brain.hold = 'fwd';
      brain.holdT = 12 + Math.floor(rand() * 18);
    } else if (r < 0.46 + rush * 0.2) brain.plan = [{ at: 0, dir: 'upfwd' }];
    else if (r < 0.6 && sp.fwd.move && dist < 170) brain.plan = [{ at: 0, dir: 'fwd', btn: 's' }];
    else if (r < 0.72 && sp.neutral.proj) brain.plan = [{ at: 0, dir: 'none', btn: 's' }];
    else if (r < 0.82 && sp.fwd.teleport) brain.plan = [{ at: 0, dir: 'fwd', btn: 's' }];
    else {
      brain.hold = 'back';
      brain.holdT = 8 + Math.floor(rand() * 12);
    }
  } else {
    if (gapBetween < 12 && r < 0.12) brain.plan = [{ at: 0, dir: 'fwd', btn: 'p' }];
    else if (r < 0.3) brain.plan = [{ at: 0, dir: 'none', btn: 'p' }, { at: 6, dir: 'none', btn: 'p' }];
    else if (r < 0.45) brain.plan = [{ at: 0, dir: 'down', btn: 'k' }];
    else if (r < 0.58) brain.plan = [{ at: 0, dir: 'none', btn: 'k' }];
    else if (r < 0.66) brain.plan = [{ at: 0, dir: comboSpecial(me, dist), btn: 's' }];
    else if (r < 0.66 + (1 - skill.aggro) * 0.4) {
      brain.hold = 'downback';
      brain.holdT = 14 + Math.floor(rand() * 16);
    } else if (r < 0.9) {
      brain.hold = 'back';
      brain.holdT = 10 + Math.floor(rand() * 12);
    } else brain.plan = [{ at: 0, dir: 'up' }];
  }
  if (me.meter >= METER_MAX && dist < 120 && r < 0.08) brain.plan = [{ at: 0, dir: 'none', btn: 'pk' }];
  return toPad(me, brain.hold);
}
