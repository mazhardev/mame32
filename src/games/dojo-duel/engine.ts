import type { SoundName } from '@/services/audio';
import type { FighterDef } from './fighters';
import { moveLength } from './moves';
import type { Box, Move, ProjDef } from './moves';

/**
 * The Dojo Duel fight simulation. It advances in whole frames (60 per
 * second) from a pair of pads, so fights replay exactly and the rules can be
 * tested without a browser. Positions are logical pixels: x across the
 * stage, y up from the floor.
 */
export const STAGE_W = 480;
export const WALL_L = 22;
export const WALL_R = 458;
export const GRAVITY = 0.45;
/** Width of a fighter's body for pushing (two bodies never overlap). */
export const BODY_W = 30;
export const ROUND_FRAMES = 60 * 60;
export const METER_MAX = 100;
/** Frames a button press is remembered while the fighter is still busy. */
const BUFFER = 8;
/** Frames within which punch and kick count as pressed together (the super). */
const CHORD = 3;
const DOWN_FRAMES = 38;
const GETUP_FRAMES = 20;
const THROW_HOLD = 22;

export interface Pad {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** Buttons pressed this frame. */
  p: boolean;
  k: boolean;
  s: boolean;
}

export const emptyPad = (): Pad => ({ left: false, right: false, up: false, down: false, p: false, k: false, s: false });

export type Act = 'stand' | 'walk' | 'crouch' | 'jump' | 'move' | 'hit' | 'block' | 'fall' | 'down' | 'getup' | 'thrown' | 'ko' | 'win';

export interface MoveRun {
  m: Move;
  t: number;
  hits: number;
  lastHit: number;
  /** It has hit or been blocked (opens cancels). */
  connected: boolean;
  /** It is a special or super (no further cancels). */
  special: boolean;
}

interface Press {
  b: 'p' | 'k' | 's';
  t: number;
  fwd: boolean;
  down: boolean;
}

export interface Fighter {
  def: FighterDef;
  side: 0 | 1;
  x: number;
  y: number;
  vx: number;
  vy: number;
  face: 1 | -1;
  hp: number;
  meter: number;
  act: Act;
  t: number;
  run: MoveRun | null;
  stun: number;
  invuln: number;
  /** Hits taken in the current combo. */
  combo: number;
  comboDmg: number;
  buf: Press[];
  pad: Pad;
  /** Airborne after a special: no actions until landing. */
  helpless: boolean;
  /** 0 when vanished mid-teleport. */
  alpha: number;
  /** Frames left of the white hit flash. */
  flash: number;
  /** Walking backwards with an attack incoming shows the block pose. */
  guarding: boolean;
  wins: number;
  stats: { dealt: number; bestCombo: number; supers: number; specials: number };
}

export interface Proj {
  owner: 0 | 1;
  def: ProjDef;
  x: number;
  y: number;
  dir: 1 | -1;
  t: number;
  hits: number;
  lastHit: number;
  dead: boolean;
}

export interface Effect {
  x: number;
  y: number;
  t: number;
  kind: 'hit' | 'block' | 'dust' | 'super' | 'clash';
  big: boolean;
}

export type RoundPhase = 'intro' | 'fight' | 'ko' | 'over';

export interface Battle {
  f: [Fighter, Fighter];
  projs: Proj[];
  fx: Effect[];
  /** Global freeze frames: hit-stop and the super flash. */
  freeze: number;
  superFlash: { side: 0 | 1; t: number } | null;
  frame: number;
  timer: number;
  phase: RoundPhase;
  phaseT: number;
  round: number;
  /** Round result: 0 or 1 won, 2 a draw, -1 still on. */
  winner: number;
  koBy: 'ko' | 'time' | 'super' | 'perfect' | '';
  events: SoundName[];
  /** Banner texts: combo counts and announcements. */
  texts: { text: string; t: number; side: number }[];
  shake: number;
  stage: number;
}

export function makeFighter(def: FighterDef, side: 0 | 1): Fighter {
  return {
    def,
    side,
    x: side === 0 ? 160 : 320,
    y: 0,
    vx: 0,
    vy: 0,
    face: side === 0 ? 1 : -1,
    hp: def.hp,
    meter: 0,
    act: 'stand',
    t: 0,
    run: null,
    stun: 0,
    invuln: 0,
    combo: 0,
    comboDmg: 0,
    buf: [],
    pad: emptyPad(),
    helpless: false,
    alpha: 1,
    flash: 0,
    guarding: false,
    wins: 0,
    stats: { dealt: 0, bestCombo: 0, supers: 0, specials: 0 },
  };
}

export function makeBattle(a: FighterDef, b: FighterDef, stage: number): Battle {
  return {
    f: [makeFighter(a, 0), makeFighter(b, 1)],
    projs: [],
    fx: [],
    freeze: 0,
    superFlash: null,
    frame: 0,
    timer: ROUND_FRAMES,
    phase: 'intro',
    phaseT: 0,
    round: 1,
    winner: -1,
    koBy: '',
    events: [],
    texts: [],
    shake: 0,
    stage,
  };
}

/** Resets positions and health for the next round, keeping round wins and meter. */
export function nextRound(b: Battle) {
  for (const f of b.f) {
    const keep = { wins: f.wins, meter: f.meter, stats: f.stats };
    Object.assign(f, makeFighter(f.def, f.side), keep);
  }
  b.projs = [];
  b.fx = [];
  b.freeze = 0;
  b.superFlash = null;
  b.timer = ROUND_FRAMES;
  b.phase = 'intro';
  b.phaseT = 0;
  b.round++;
  b.winner = -1;
  b.koBy = '';
  b.texts = [];
}

/* ---------------------------------------------------------------- geometry */
export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** A move-relative box placed in the world for a fighter. */
export function worldBox(f: Fighter, box: Box): Rect {
  const s = f.def.scale;
  const a = f.x + f.face * box.x * s;
  const b = f.x + f.face * (box.x + box.w) * s;
  return { x0: Math.min(a, b), x1: Math.max(a, b), y0: f.y + box.y * s, y1: f.y + (box.y + box.h) * s };
}

export function hurtbox(f: Fighter): Rect | null {
  if (f.invuln > 0 || f.act === 'down' || f.act === 'getup' || f.act === 'ko' || f.act === 'thrown' || f.alpha < 0.5) return null;
  const s = f.def.scale;
  const w = 15 * s;
  const crouching = f.act === 'crouch' || (f.act === 'block' && f.pad.down) || f.run?.m.pose === 'cpunch' || f.run?.m.pose === 'ckick' || f.run?.m.pose === 'slide';
  const h = (crouching ? 52 : f.y > 0 ? 70 : 82) * s;
  const y0 = f.y + (f.y > 0 ? 10 * s : 0);
  return { x0: f.x - w, x1: f.x + w, y0, y1: y0 + h };
}

export const overlap = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

/* ------------------------------------------------------------------ input */
const isGround = (f: Fighter) => f.y <= 0 && f.vy <= 0;
const neutral = (f: Fighter) => f.act === 'stand' || f.act === 'walk' || f.act === 'crouch';
const fwdHeld = (f: Fighter, pad: Pad) => (f.face === 1 ? pad.right : pad.left);
const backHeld = (f: Fighter, pad: Pad) => (f.face === 1 ? pad.left : pad.right);

function startMove(b: Battle, f: Fighter, m: Move, special: boolean) {
  f.run = { m, t: 0, hits: 0, lastHit: -99, connected: false, special };
  f.act = 'move';
  f.t = 0;
  if (m.invuln) f.invuln = Math.max(f.invuln, m.invuln);
  if (special) f.stats.specials++;
  if (m.super) {
    f.meter = 0;
    f.stats.supers++;
    b.freeze = 30;
    b.superFlash = { side: f.side, t: 30 };
    b.events.push('powerup');
    b.fx.push({ x: f.x, y: f.y + 50, t: 0, kind: 'super', big: true });
  } else if (special && m.sound && !m.proj) b.events.push(m.sound);
}

function specialFor(f: Fighter, p: Press): Move | null {
  const sp = f.def.specials;
  if (!isGround(f)) return sp.air ?? null;
  if (p.down) return sp.down;
  if (p.fwd) return sp.fwd;
  return sp.neutral;
}

/** Throw range: the gap between the two bodies. */
const gap = (a: Fighter, d: Fighter) => Math.abs(a.x - d.x) - BODY_W * ((a.def.scale + d.def.scale) / 2);

/** Picks the action for a fighter free to act (or in a cancel window). */
function act(b: Battle, f: Fighter, o: Fighter, pad: Pad): boolean {
  const ground = isGround(f);
  const has = (k: Press['b']) => f.buf.find((p) => p.b === k);
  const pP = has('p');
  const pK = has('k');
  const pS = has('s');
  const run = f.run;
  const canCancel = !!run && run.connected && !run.special && !!run.m.cancel && run.t < run.m.startup + run.m.active + 8;
  const free = !run && (neutral(f) || (f.act === 'jump' && !f.helpless));
  if (!free && !canCancel) return false;

  // Super: punch and kick together with a full meter.
  if (pP && pK && Math.abs(pP.t - pK.t) <= CHORD && f.meter >= METER_MAX && ground) {
    f.buf = [];
    startMove(b, f, f.def.specials.super, true);
    return true;
  }
  if (pS) {
    const m = specialFor(f, pS);
    if (m && !(m.proj && f.def.specials.neutral === m && b.projs.some((q) => q.owner === f.side && !q.dead))) {
      f.buf = f.buf.filter((p) => p !== pS);
      startMove(b, f, m, true);
      return true;
    }
  }
  if (canCancel) {
    // Light attacks chain into light attacks.
    if (run && run.m.chain && pP) {
      f.buf = f.buf.filter((p) => p !== pP);
      startMove(b, f, pP.down ? f.def.normals.cP : f.def.normals.sP, false);
      return true;
    }
    return false;
  }
  // Wait a couple of frames for a possible chord before a full-meter punch or kick.
  const fresh = (p?: Press) => !!p && p.t < CHORD;
  const chordWait = f.meter >= METER_MAX && ground && ((fresh(pP) && !pK) || (fresh(pK) && !pP));
  if (chordWait) return false;
  const n = f.def.normals;
  if (!ground) {
    if (pK) {
      f.buf = f.buf.filter((p) => p !== pK);
      startMove(b, f, n.jK, false);
      return true;
    }
    if (pP) {
      f.buf = f.buf.filter((p) => p !== pP);
      startMove(b, f, n.jP, false);
      return true;
    }
    return false;
  }
  if (pP) {
    f.buf = f.buf.filter((p) => p !== pP);
    const throwable = pP.fwd && !pP.down && gap(f, o) <= n.throw.range! && isGround(o) && (neutral(o) || o.act === 'move') && o.invuln <= 0;
    startMove(b, f, throwable ? n.throw : pP.down ? n.cP : n.sP, false);
    return true;
  }
  if (pK) {
    f.buf = f.buf.filter((p) => p !== pK);
    startMove(b, f, pK.down ? n.cK : n.sK, false);
    return true;
  }
  // Movement.
  if (pad.up) {
    f.act = 'jump';
    f.t = 0;
    f.vy = f.def.jumpY;
    f.vx = fwdHeld(f, pad) ? f.def.jumpX * f.face : backHeld(f, pad) ? -f.def.jumpX * f.face : 0;
    return true;
  }
  if (pad.down) {
    if (f.act !== 'crouch') {
      f.act = 'crouch';
      f.t = 0;
    }
    f.vx = 0;
    return true;
  }
  const fw = fwdHeld(f, pad);
  const bk = backHeld(f, pad);
  f.guarding = bk && threatened(b, f, o);
  if ((fw || bk) && !f.guarding) {
    if (f.act !== 'walk') f.t = 0;
    f.act = 'walk';
    f.vx = fw ? f.def.walk * f.face : -f.def.back * f.face;
  } else {
    if (f.act !== 'stand') f.t = 0;
    f.act = 'stand';
    f.vx = 0;
  }
  return true;
}

/** An attack or projectile is on its way. */
function threatened(b: Battle, f: Fighter, o: Fighter): boolean {
  if (o.run && o.run.t < o.run.m.startup + o.run.m.active && Math.abs(o.x - f.x) < 150) return true;
  return b.projs.some((p) => p.owner !== f.side && !p.dead && Math.abs(p.x - f.x) < 160);
}

/* ----------------------------------------------------------------- hits */
interface PendingHit {
  att: Fighter;
  def: Fighter;
  dmg: number;
  stun: number;
  block: number;
  level: Move['level'];
  push: number;
  kd: boolean;
  chip: number;
  big: boolean;
  proj: Proj | null;
  run: MoveRun | null;
  x: number;
  y: number;
}

function blocks(def: Fighter, att: Fighter, level: Move['level'], fromX: number): boolean {
  if (level === 'grab') return false;
  if (!isGround(def) || def.helpless) return false;
  if (!(neutral(def) || def.act === 'block')) return false;
  const away = fromX > def.x ? def.pad.left : def.pad.right;
  if (!away) return false;
  if (level === 'low' && !def.pad.down) return false;
  if (level === 'over' && def.pad.down) return false;
  void att;
  return true;
}

function applyHit(b: Battle, h: PendingHit) {
  const { att, def } = h;
  const fromX = h.proj ? h.proj.x : att.x;
  const dir = def.x >= fromX ? 1 : -1;
  if (blocks(def, att, h.level, fromX)) {
    def.act = 'block';
    def.t = 0;
    def.stun = h.block;
    def.run = null;
    const chip = Math.round(h.dmg * h.chip);
    def.hp = Math.max(h.chip > 0 ? 0 : 1, def.hp - chip);
    def.vx = dir * (h.push / 6);
    att.meter = Math.min(METER_MAX, att.meter + 3);
    def.meter = Math.min(METER_MAX, def.meter + 4);
    b.freeze = Math.max(b.freeze, 5);
    b.fx.push({ x: h.x, y: h.y, t: 0, kind: 'block', big: false });
    b.events.push('blip');
    if (def.hp <= 0) knockOut(b, def, att, 'ko');
    return;
  }
  const scale = Math.max(0.35, 1 - 0.1 * def.combo);
  const dmg = Math.max(1, Math.round(h.dmg * scale));
  def.hp = Math.max(0, def.hp - dmg);
  def.combo++;
  def.comboDmg += dmg;
  att.stats.dealt += dmg;
  att.stats.bestCombo = Math.max(att.stats.bestCombo, def.combo);
  if (def.combo >= 2) {
    b.texts = b.texts.filter((t) => t.side !== att.side || !t.text.endsWith('HITS'));
    b.texts.push({ text: `${def.combo} HITS`, t: 0, side: att.side });
  }
  def.run = null;
  def.flash = 8;
  def.guarding = false;
  att.meter = Math.min(METER_MAX, att.meter + dmg * 0.09 + 2);
  def.meter = Math.min(METER_MAX, def.meter + dmg * 0.06);
  if (h.kd || !isGround(def) || def.hp <= 0) {
    def.act = 'fall';
    def.t = 0;
    def.vy = def.hp <= 0 ? 7 : 6;
    def.vx = dir * 2.6;
    def.invuln = 999;
    def.helpless = true;
  } else {
    def.act = 'hit';
    def.t = 0;
    def.stun = h.stun;
    def.vx = dir * (h.push / 5);
  }
  b.freeze = Math.max(b.freeze, h.big ? 9 : 6);
  b.shake = Math.max(b.shake, h.big ? 5 : 2);
  b.fx.push({ x: h.x, y: h.y, t: 0, kind: 'hit', big: h.big });
  b.events.push(h.big ? 'explosion' : 'hit');
  if (def.hp <= 0) knockOut(b, def, att, h.run?.m.super || h.proj?.def.kind === 'storm' ? 'super' : 'ko');
}

function knockOut(b: Battle, loser: Fighter, winner: Fighter, how: 'ko' | 'super') {
  if (b.phase !== 'fight') return;
  b.phase = 'ko';
  b.phaseT = 0;
  b.winner = winner.side;
  b.koBy = winner.hp === winner.def.hp ? 'perfect' : how;
  if (loser.act !== 'thrown') {
    loser.act = 'fall';
    loser.vy = Math.max(loser.vy, 6);
  }
  loser.helpless = true;
  loser.invuln = 999;
  b.events.push('explosion');
}

function tryGrab(b: Battle, att: Fighter, def: Fighter, m: Move): boolean {
  if (gap(att, def) > (m.range ?? 12)) return false;
  if (!isGround(def) || def.invuln > 0 || def.act === 'hit' || def.act === 'block' || def.act === 'fall' || def.act === 'down') return false;
  def.act = 'thrown';
  def.t = 0;
  def.run = null;
  def.vx = 0;
  def.invuln = 999;
  def.flash = 6;
  att.run!.connected = true;
  att.run!.hits = 1;
  return true;
}

/* ---------------------------------------------------------------- update */
function updateFighter(b: Battle, f: Fighter, o: Fighter) {
  f.t++;
  if (f.flash > 0) f.flash--;
  if (f.invuln > 0 && f.invuln < 999) f.invuln--;
  for (const p of f.buf) p.t++;
  f.buf = f.buf.filter((p) => p.t <= BUFFER);
  const pad = b.phase === 'fight' ? f.pad : emptyPad();
  if (pad.p) f.buf.push({ b: 'p', t: 0, fwd: fwdHeld(f, pad), down: pad.down });
  if (pad.k) f.buf.push({ b: 'k', t: 0, fwd: fwdHeld(f, pad), down: pad.down });
  if (pad.s) f.buf.push({ b: 's', t: 0, fwd: fwdHeld(f, pad), down: pad.down });

  switch (f.act) {
    case 'hit':
    case 'block':
      f.vx *= 0.8;
      if (--f.stun <= 0) {
        f.act = 'stand';
        f.t = 0;
        f.combo = 0;
        f.comboDmg = 0;
      }
      break;
    case 'thrown': {
      // Held for a moment, then hurled behind or ahead of the thrower.
      const grabber = o.run;
      f.x = o.x + o.face * 26 * o.def.scale;
      f.y = Math.min(30, f.t * 2);
      if (f.t >= THROW_HOLD || !grabber) {
        const m = grabber?.m;
        const dmg = m ? m.dmg : 100;
        f.hp = Math.max(0, f.hp - dmg);
        o.stats.dealt += dmg;
        o.meter = Math.min(METER_MAX, o.meter + dmg * 0.08);
        f.act = 'fall';
        f.t = 0;
        f.vy = 5;
        f.vx = o.face * 3.4;
        f.helpless = true;
        b.shake = 6;
        b.fx.push({ x: f.x, y: 10, t: 0, kind: 'dust', big: true });
        b.events.push('explosion');
        if (f.hp <= 0) knockOut(b, f, o, m?.super ? 'super' : 'ko');
      }
      return;
    }
    case 'fall':
      f.vy -= GRAVITY;
      f.x += f.vx;
      f.y += f.vy;
      if (f.y <= 0) {
        f.y = 0;
        f.vy = 0;
        f.vx = 0;
        f.act = f.hp <= 0 ? 'ko' : 'down';
        f.t = 0;
        f.combo = 0;
        f.comboDmg = 0;
        b.fx.push({ x: f.x, y: 2, t: 0, kind: 'dust', big: false });
        b.shake = Math.max(b.shake, 3);
      }
      clampWalls(f);
      return;
    case 'down':
      if (f.t >= DOWN_FRAMES) {
        f.act = 'getup';
        f.t = 0;
      }
      return;
    case 'getup':
      if (f.t >= GETUP_FRAMES) {
        f.act = 'stand';
        f.t = 0;
        f.invuln = 6;
        f.helpless = false;
      }
      return;
    case 'ko':
    case 'win':
      return;
  }

  if (f.act !== 'hit' && f.act !== 'block') act(b, f, o, pad);

  // Running moves.
  const r = f.run;
  if (r) {
    const m = r.m;
    r.t++;
    const first = r.t === m.startup + 1;
    if (first) {
      if (m.proj) {
        const s = f.def.scale;
        b.projs.push({ owner: f.side, def: m.proj, x: f.x + f.face * 34 * s, y: m.proj.y * s, dir: f.face, t: 0, hits: 0, lastHit: -99, dead: false });
        b.events.push(m.sound ?? 'shoot');
      }
      if (m.lift) f.vy = m.lift;
      if (m.teleport) {
        f.x = Math.max(WALL_L, Math.min(WALL_R, o.x - o.face * 46));
        f.face = o.x >= f.x ? 1 : -1;
        f.alpha = 1;
      }
      if (m.level === 'grab' && !tryGrab(b, f, o, m)) {
        // A whiffed grab just recovers.
      }
      if (m.pose === 'dive') {
        f.vx = 5.2 * f.face;
        f.vy = -6;
      }
    }
    // The overhead hop: up early in the startup so it lands as the blow comes down.
    if (m.pose === 'hammer' && r.t === 2) f.vy = 5.2;
    if (m.teleport) f.alpha = r.t <= m.startup ? Math.max(0, 1 - r.t / 6) : Math.min(1, (r.t - m.startup) / 5);
    if (m.move && r.t >= m.move[1] && r.t <= m.move[2]) f.vx = m.move[0] * f.face;
    else if (m.move && r.t > m.move[2]) f.vx *= 0.7;
    else if (isGround(f) && !m.air && m.pose !== 'hammer') f.vx = 0;
    if (m.air && isGround(f) && r.t > 1) {
      // Air attacks end on landing.
      f.run = null;
      f.act = 'stand';
      f.t = 0;
      f.vx = 0;
    } else if (r.t >= moveLength(m) && (m.air ? false : true)) {
      f.run = null;
      if (isGround(f)) {
        f.act = 'stand';
        f.t = 0;
      } else {
        f.act = 'jump';
        f.helpless = true;
      }
    }
  }

  // Physics.
  if (!isGround(f) || f.vy > 0) {
    f.vy -= GRAVITY;
    f.x += f.vx;
    f.y += f.vy;
    if (f.y <= 0) {
      f.y = 0;
      f.vy = 0;
      if (f.act === 'jump' || (f.run && f.run.m.air)) {
        f.act = 'stand';
        f.t = 0;
        f.vx = 0;
        f.helpless = false;
        if (f.run && f.run.m.air) f.run = null;
      }
      if (f.run && f.run.m.pose === 'hammer') f.vx = 0;
      if (!f.run && f.act === 'move') f.act = 'stand';
      f.helpless = false;
    }
  } else {
    f.x += f.vx;
  }
  clampWalls(f);
}

function clampWalls(f: Fighter) {
  f.x = Math.max(WALL_L, Math.min(WALL_R, f.x));
}

/** Keeps the two bodies apart, sharing the push (and pushing off walls). */
function separate(a: Fighter, b: Fighter) {
  if (a.act === 'thrown' || b.act === 'thrown') return;
  if (a.alpha < 0.5 || b.alpha < 0.5) return;
  const tall = (f: Fighter) => f.y + 70 * f.def.scale;
  if (a.y > tall(b) || b.y > tall(a)) return;
  const minD = BODY_W * ((a.def.scale + b.def.scale) / 2);
  const d = b.x - a.x;
  if (Math.abs(d) >= minD) return;
  const s = d === 0 ? (a.side === 0 ? 1 : -1) : Math.sign(d);
  const push = (minD - Math.abs(d)) / 2;
  a.x -= s * push;
  b.x += s * push;
  clampWalls(a);
  clampWalls(b);
  // A fighter pinned to a wall pushes the other away instead.
  const d2 = Math.abs(b.x - a.x);
  if (d2 < minD) {
    if (a.x <= WALL_L || a.x >= WALL_R) b.x = a.x + s * minD;
    else a.x = b.x - s * minD;
    clampWalls(a);
    clampWalls(b);
  }
}

function collectHits(b: Battle, att: Fighter, def: Fighter, out: PendingHit[]) {
  const r = att.run;
  if (!r || !r.m.box) return;
  const m = r.m;
  const t = r.t;
  if (t <= m.startup || t > m.startup + m.active) return;
  const maxHits = m.hits ?? 1;
  if (r.hits >= maxHits) return;
  if (maxHits > 1 && t - r.lastHit < (m.every ?? 6)) return;
  const hb = worldBox(att, m.box);
  const hurt = hurtbox(def);
  if (!hurt || !overlap(hb, hurt)) return;
  r.hits++;
  r.lastHit = t;
  r.connected = true;
  const lastHit = r.hits >= maxHits;
  out.push({
    att,
    def,
    dmg: m.dmg,
    stun: m.stun,
    block: m.block,
    level: m.level,
    push: m.push,
    kd: !!m.kd && lastHit,
    chip: m.chip ?? 0,
    big: m.dmg >= 70 || !!m.super,
    proj: null,
    run: r,
    x: (Math.max(hb.x0, hurt.x0) + Math.min(hb.x1, hurt.x1)) / 2,
    y: (Math.max(hb.y0, hurt.y0) + Math.min(hb.y1, hurt.y1)) / 2,
  });
}

function updateProjectiles(b: Battle, out: PendingHit[]) {
  for (const p of b.projs) {
    if (p.dead) continue;
    p.t++;
    p.x += p.def.speed * p.dir;
    if (p.t > p.def.life || p.x < -40 || p.x > STAGE_W + 40) p.dead = true;
  }
  // Opposing projectiles cancel each other out, hit for hit.
  for (const a of b.projs)
    for (const c of b.projs) {
      if (a.dead || c.dead || a.owner >= c.owner || a.owner === c.owner) continue;
      if (Math.abs(a.x - c.x) < (a.def.w + c.def.w) / 2 && Math.abs(a.y - c.y) < (a.def.h + c.def.h) / 2) {
        const left = Math.min(a.def.hits - a.hits, c.def.hits - c.hits);
        a.hits += left;
        c.hits += left;
        if (a.hits >= a.def.hits) a.dead = true;
        if (c.hits >= c.def.hits) c.dead = true;
        b.fx.push({ x: (a.x + c.x) / 2, y: (a.y + c.y) / 2, t: 0, kind: 'clash', big: false });
        b.events.push('pop');
      }
    }
  for (const p of b.projs) {
    if (p.dead) continue;
    const def = b.f[1 - p.owner];
    const hurt = hurtbox(def);
    if (!hurt) continue;
    const box: Rect = { x0: p.x - p.def.w / 2, x1: p.x + p.def.w / 2, y0: p.y - p.def.h / 2, y1: p.y + p.def.h / 2 };
    if (!overlap(box, hurt) || p.t - p.lastHit < 6) continue;
    p.hits++;
    p.lastHit = p.t;
    if (p.hits >= p.def.hits) p.dead = true;
    out.push({
      att: b.f[p.owner],
      def,
      dmg: p.def.dmg,
      stun: p.def.stun,
      block: p.def.block,
      level: p.def.low ? 'low' : 'mid',
      push: 8,
      kd: p.def.hits > 1 && p.hits >= p.def.hits,
      chip: 0.2,
      big: p.def.hits > 1,
      proj: p,
      run: null,
      x: p.x,
      y: p.y,
    });
  }
  b.projs = b.projs.filter((p) => !p.dead);
}

/** Advances the fight by one frame with both players' pads. */
export function stepBattle(b: Battle, pads: [Pad, Pad]) {
  b.frame++;
  b.f[0].pad = pads[0];
  b.f[1].pad = pads[1];
  for (const e of b.fx) e.t++;
  b.fx = b.fx.filter((e) => e.t < 24);
  for (const t of b.texts) t.t++;
  b.texts = b.texts.filter((t) => t.t < 70);
  if (b.shake > 0) b.shake = Math.max(0, b.shake - 0.4);
  if (b.superFlash && --b.superFlash.t <= 0) b.superFlash = null;
  if (b.freeze > 0) {
    b.freeze--;
    // Presses made during hit-stop are still buffered.
    for (const f of b.f) {
      if (f.pad.p) f.buf.push({ b: 'p', t: 0, fwd: fwdHeld(f, f.pad), down: f.pad.down });
      if (f.pad.k) f.buf.push({ b: 'k', t: 0, fwd: fwdHeld(f, f.pad), down: f.pad.down });
      if (f.pad.s) f.buf.push({ b: 's', t: 0, fwd: fwdHeld(f, f.pad), down: f.pad.down });
    }
    return;
  }
  b.phaseT++;
  if (b.phase === 'intro') {
    if (b.phaseT === 1) b.texts.push({ text: `ROUND ${b.round}`, t: 0, side: -1 });
    if (b.phaseT === 60) {
      b.texts.push({ text: 'FIGHT!', t: 0, side: -1 });
      b.events.push('select');
    }
    if (b.phaseT >= 75) {
      b.phase = 'fight';
      b.phaseT = 0;
    }
  } else if (b.phase === 'fight') {
    if (--b.timer <= 0) {
      b.timer = 0;
      const [a, c] = b.f;
      const ra = a.hp / a.def.hp;
      const rc = c.hp / c.def.hp;
      b.phase = 'ko';
      b.phaseT = 0;
      b.winner = Math.abs(ra - rc) < 1e-9 ? 2 : ra > rc ? 0 : 1;
      b.koBy = 'time';
      b.texts.push({ text: 'TIME', t: 0, side: -1 });
    }
  } else if (b.phase === 'ko') {
    // Slow motion for the knockout.
    if (b.phaseT % 2 === 0 && b.phaseT < 50) return;
    if (b.phaseT === 50 && b.winner < 2) {
      const w = b.f[b.winner];
      if (w.hp > 0 && isGround(w)) {
        w.act = 'win';
        w.t = 0;
        w.run = null;
        w.vx = 0;
      }
    }
    if (b.phaseT >= 150) {
      b.phase = 'over';
      b.phaseT = 0;
    }
  }

  const [a, c] = b.f;
  // Fighters on the ground turn to face each other.
  for (const f of b.f) {
    const o = b.f[1 - f.side];
    if (isGround(f) && (neutral(f) || f.act === 'block' || f.act === 'hit') && !f.run) f.face = o.x >= f.x ? 1 : -1;
  }
  updateFighter(b, a, c);
  updateFighter(b, c, a);
  separate(a, c);
  if (b.winner >= 0 && b.phase !== 'fight') {
    for (const f of b.f) if (f.act === 'win') f.vx = 0;
  }
  const hits: PendingHit[] = [];
  collectHits(b, a, c, hits);
  collectHits(b, c, a, hits);
  updateProjectiles(b, hits);
  for (const h of hits) if (b.phase === 'fight' || b.phase === 'ko') applyHit(b, h);
}

/** Running totals for a fighter's pose and effects. */
export const movePhase = (r: MoveRun): 'startup' | 'active' | 'recovery' =>
  r.t <= r.m.startup ? 'startup' : r.t <= r.m.startup + r.m.active ? 'active' : 'recovery';
