import type { DifficultySetting } from '@/types';
import { baseState } from '../_shared/arcade/kit';
import type { BaseState, Input } from '../_shared/arcade/kit';
import {
  BALL_R,
  BUMPERS,
  DROPS,
  DROP_X,
  H,
  LANE_REST_Y,
  LANE_SENSOR_Y,
  LANE_X,
  SAUCER,
  SUBSTEPS,
  TOP_LANES,
  W,
  buildWalls,
  capSpeed,
  collideBalls,
  collideCirc,
  collideFlipper,
  collideSeg,
  makeFlippers,
  moveFlipper,
  newBall,
} from './table';
import type { Ball, Flipper, Hit, Seg } from './table';

/**
 * Nebula Pinball rules: balls, the plunger, scoring, top lanes and bonus
 * multiplier, drop targets that light the black-hole lock, multiball with
 * jackpots, ball save, nudging and tilt.
 */
export { W, H };

const FRAME = 1 / 60;
const LOCKS_FOR_MULTIBALL = 2;
const MAX_MULT = 6;
const TILT_LIMIT = 4;

export interface Settings {
  balls: number;
  /** Seconds of ball save after each launch. */
  save: number;
  gravity: number;
  /** Tilt meter gained per nudge. */
  nudgeCost: number;
}

export const SETTINGS: Record<DifficultySetting, Settings> = {
  easy: { balls: 5, save: 15, gravity: 620, nudgeCost: 0.8 },
  normal: { balls: 3, save: 8, gravity: 700, nudgeCost: 1 },
  hard: { balls: 3, save: 4, gravity: 780, nudgeCost: 1.3 },
};

export interface Msg {
  text: string;
  t: number;
  big: boolean;
}

export interface State extends BaseState {
  difficulty: DifficultySetting;
  set: Settings;
  walls: Seg[];
  flippers: Flipper[];
  balls: Ball[];
  /** Ball number in play (1-based) and how many remain after it. */
  ball: number;
  ballsLeft: number;
  plunger: number;
  pulling: boolean;
  saveT: number;
  lanes: boolean[];
  mult: number;
  drops: boolean[];
  dropResetT: number;
  lockLit: boolean;
  locks: number;
  multiball: boolean;
  jackpots: number;
  bumperHits: number;
  bumperLevel: number;
  /** Flash timers for drawing. */
  flash: { bumpers: number[]; slings: number[]; saucer: number; lanes: number[] };
  tilt: number;
  tilted: boolean;
  /** End-of-ball bonus counting. */
  bonusT: number;
  bonusPts: number;
  counts: { lanes: number; drops: number; bumpers: number };
  extraBallAt: number;
  extraGiven: boolean;
  msgs: Msg[];
  acc: number;
  shake: number;
  /** Fingers on the left / right half of the table last frame. */
  touchL: boolean;
  touchR: boolean;
  stats: { jackpots: number; maxMult: number; multiballs: number };
}

export function create(difficulty: DifficultySetting): State {
  const set = SETTINGS[difficulty];
  return {
    ...baseState(),
    difficulty,
    set,
    walls: buildWalls(),
    flippers: makeFlippers(),
    balls: [newBall()],
    ball: 1,
    ballsLeft: set.balls - 1,
    plunger: 0,
    pulling: false,
    saveT: 0,
    lanes: [false, false, false],
    mult: 1,
    drops: [true, true, true],
    dropResetT: 0,
    lockLit: false,
    locks: 0,
    multiball: false,
    jackpots: 0,
    bumperHits: 0,
    bumperLevel: 0,
    flash: { bumpers: [0, 0, 0], slings: [0, 0], saucer: 0, lanes: [0, 0, 0] },
    tilt: 0,
    tilted: false,
    bonusT: -1,
    bonusPts: 0,
    counts: { lanes: 0, drops: 0, bumpers: 0 },
    extraBallAt: difficulty === 'hard' ? 400000 : 250000,
    extraGiven: false,
    msgs: [],
    acc: 0,
    shake: 0,
    touchL: false,
    touchR: false,
    stats: { jackpots: 0, maxMult: 1, multiballs: 0 },
  };
}

export function say(s: State, text: string, big = false) {
  s.msgs = s.msgs.filter((m) => m.t < 1.4 || !big);
  s.msgs.push({ text, t: 0, big });
  if (s.msgs.length > 3) s.msgs.shift();
}

function add(s: State, pts: number) {
  if (s.tilted) return;
  s.score += pts;
  if (!s.extraGiven && s.score >= s.extraBallAt) {
    s.extraGiven = true;
    s.ballsLeft++;
    say(s, 'EXTRA BALL!', true);
    s.events.push('powerup');
  }
}

const inPlay = (s: State) => s.balls.filter((b) => !b.gone);

/* ------------------------------------------------------------ rule events */
function onHit(s: State, b: Ball, h: Hit) {
  switch (h.kind) {
    case 'bumper': {
      // Bumpers kick the ball away hard.
      const c = BUMPERS[h.id];
      const dx = b.x - c.x;
      const dy = b.y - c.y;
      const d = Math.hypot(dx, dy) || 1;
      const out = (b.vx * dx + b.vy * dy) / d;
      const kick = Math.max(0, 430 - out);
      b.vx += (dx / d) * kick;
      b.vy += (dy / d) * kick;
      s.flash.bumpers[h.id] = 0.18;
      s.bumperHits++;
      s.counts.bumpers++;
      add(s, 100 * (1 + s.bumperLevel));
      if (s.bumperHits % 25 === 0) {
        s.bumperLevel = Math.min(4, s.bumperLevel + 1);
        say(s, `SUPER BUMPERS ×${s.bumperLevel + 1}`);
      }
      s.events.push('pop');
      break;
    }
    case 'sling': {
      if (h.speed < 60) break;
      const sl = s.walls.find((w) => w.kind === 'sling' && w.id === h.id);
      if (!sl) break;
      // Kick out along the face's normal, toward the middle.
      let nx = sl.y1 - sl.y2;
      let ny = sl.x2 - sl.x1;
      const n = Math.hypot(nx, ny);
      nx /= n;
      ny /= n;
      if ((nx > 0 ? 1 : -1) !== (h.id === 0 ? 1 : -1)) {
        nx = -nx;
        ny = -ny;
      }
      b.vx += nx * 330;
      b.vy += ny * 330;
      s.flash.slings[h.id] = 0.15;
      add(s, 50);
      s.events.push('blip');
      break;
    }
    case 'target':
      if (s.drops[h.id]) {
        s.drops[h.id] = false;
        s.counts.drops++;
        add(s, 750);
        s.events.push('hit');
        if (s.drops.every((d) => !d)) {
          add(s, 7500);
          s.dropResetT = 1.2;
          if (!s.multiball && !s.lockLit) {
            s.lockLit = true;
            say(s, 'LOCK IS LIT');
          } else say(s, 'TARGETS +7,500');
          s.events.push('success');
        }
      }
      break;
    case 'flipper':
    case 'wall':
    case 'rubber':
    case 'post':
      if (h.speed > 260) s.events.push('blip');
      break;
  }
}

function dropSegs(s: State): Seg[] {
  const out: Seg[] = [];
  DROPS.forEach((d, i) => {
    if (s.drops[i]) out.push({ x1: DROP_X, y1: d.y1, x2: DROP_X, y2: d.y2, r: 2.5, e: 0.35, kind: 'target', id: i });
  });
  return out;
}

function sensors(s: State, b: Ball, prevY: number) {
  // Top lanes: rolling down through a lane lights it.
  if (prevY < LANE_SENSOR_Y && b.y >= LANE_SENSOR_Y && b.vy > 0) {
    TOP_LANES.forEach((x, i) => {
      if (Math.abs(b.x - x) < 11) {
        s.flash.lanes[i] = 0.3;
        s.counts.lanes++;
        add(s, 1000);
        s.events.push('coin');
        if (!s.lanes[i]) {
          s.lanes[i] = true;
          if (s.lanes.every(Boolean)) {
            s.lanes = [false, false, false];
            s.mult = Math.min(MAX_MULT, s.mult + 1);
            s.stats.maxMult = Math.max(s.stats.maxMult, s.mult);
            say(s, `BONUS ×${s.mult}`);
            s.events.push('success');
          }
        }
      }
    });
  }
  // The black-hole saucer captures slow-ish balls.
  if (b.held < 0 && Math.hypot(b.x - SAUCER.x, b.y - SAUCER.y) < SAUCER.r && Math.hypot(b.vx, b.vy) < 700) {
    b.held = 0;
    b.vx = 0;
    b.vy = 0;
    b.x = SAUCER.x;
    b.y = SAUCER.y;
    s.flash.saucer = 1;
    saucerCapture(s);
  }
}

function saucerCapture(s: State) {
  if (s.tilted) return;
  if (s.multiball) {
    s.jackpots++;
    s.stats.jackpots++;
    const pts = 25000 * s.jackpots;
    add(s, pts);
    say(s, `JACKPOT ${pts.toLocaleString()}!`, true);
    s.events.push('levelComplete');
    s.shake = 6;
    return;
  }
  if (s.lockLit) {
    s.locks++;
    s.lockLit = false;
    add(s, 5000);
    if (s.locks >= LOCKS_FOR_MULTIBALL) {
      s.locks = 0;
      startMultiball(s);
    } else {
      say(s, `BALL ${s.locks} LOCKED`, true);
      s.events.push('powerup');
    }
    return;
  }
  add(s, 2500);
  say(s, 'BLACK HOLE 2,500');
  s.events.push('whoosh');
}

function startMultiball(s: State) {
  s.multiball = true;
  s.jackpots = 0;
  s.stats.multiballs++;
  say(s, 'MULTIBALL!', true);
  s.events.push('levelComplete');
  s.saveT = Math.max(s.saveT, 10);
  // Two more balls fly out of the black hole.
  for (let i = 0; i < 2; i++) {
    const b = newBall();
    b.inLane = false;
    b.x = SAUCER.x + 14 + i * 13;
    b.y = SAUCER.y + 4;
    b.vx = 220 + i * 140;
    b.vy = 160 - i * 90;
    s.balls.push(b);
  }
}

/* ----------------------------------------------------------- ball changes */
function serve(s: State) {
  s.balls = [newBall()];
  s.tilt = 0;
  s.tilted = false;
  s.plunger = 0;
  s.lanes = [false, false, false];
}

function drained(s: State, b: Ball) {
  b.gone = true;
  const left = inPlay(s);
  if (s.saveT > 0 && !s.tilted) {
    // Ball save: straight back to the plunger.
    b.gone = false;
    Object.assign(b, newBall());
    say(s, 'BALL SAVED');
    s.events.push('powerup');
    if (left.length === 0) s.saveT = 0;
    return;
  }
  if (left.length >= 1) {
    if (left.length === 1 && s.multiball) {
      s.multiball = false;
      say(s, 'MULTIBALL OVER');
    }
    return;
  }
  // Last ball gone: count the bonus.
  s.events.push('failure');
  s.multiball = false;
  s.bonusPts = s.tilted ? 0 : (s.counts.lanes * 1000 + s.counts.drops * 500 + s.counts.bumpers * 25) * s.mult;
  s.bonusT = 2.2;
  say(s, s.tilted ? 'TILT — NO BONUS' : `BONUS ${s.bonusPts.toLocaleString()}`, true);
}

function endOfBall(s: State) {
  add(s, s.bonusPts);
  s.bonusPts = 0;
  s.counts = { lanes: 0, drops: 0, bumpers: 0 };
  s.mult = 1;
  s.bonusT = -1;
  if (s.ballsLeft <= 0) {
    s.over = true;
    s.events.push('gameOver');
    return;
  }
  s.ballsLeft--;
  s.ball++;
  serve(s);
}

/** Pushes the table: all balls jolt, and too much shaking tilts it. */
export function nudge(s: State, dir: number) {
  if (s.tilted || s.bonusT >= 0) return;
  for (const b of inPlay(s)) {
    if (b.inLane || b.held >= 0) continue;
    b.vx += dir * 70;
    b.vy -= 90;
  }
  s.shake = 4;
  s.tilt += s.set.nudgeCost;
  if (s.tilt >= TILT_LIMIT) {
    s.tilted = true;
    s.saveT = 0;
    for (const f of s.flippers) f.held = false;
    say(s, 'TILT', true);
    s.events.push('failure');
  } else if (s.tilt >= TILT_LIMIT - 1.2) say(s, 'DANGER');
}

/* ------------------------------------------------------------------ physics */
export function physicsFrame(s: State) {
  const dt = FRAME / SUBSTEPS;
  const balls = inPlay(s);
  const extra = dropSegs(s);
  const hits: Hit[] = [];
  for (let k = 0; k < SUBSTEPS; k++) {
    for (const f of s.flippers) moveFlipper(f, dt);
    for (const b of balls) {
      if (b.gone || b.held >= 0) continue;
      if (b.inLane && b.y >= LANE_REST_Y - 0.5 && Math.abs(b.vy) < 1) {
        b.vy = 0;
        b.y = LANE_REST_Y;
        continue;
      }
      const prevY = b.y;
      b.vy += s.set.gravity * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      hits.length = 0;
      for (const w of s.walls) collideSeg(b, w, hits);
      for (const w of extra) collideSeg(b, w, hits);
      for (const c of BUMPERS) collideCirc(b, c, hits);
      s.flippers.forEach((f, i) => collideFlipper(b, f, i, hits));
      for (const h of hits) onHit(s, b, h);
      capSpeed(b);
      if (b.inLane && b.x < 240 - BALL_R) b.inLane = false;
      if (!b.inLane) sensors(s, b, prevY);
    }
    for (let i = 0; i < balls.length; i++)
      for (let j = i + 1; j < balls.length; j++) if (!balls[i].gone && !balls[j].gone && balls[i].held < 0 && balls[j].held < 0) collideBalls(balls[i], balls[j]);
  }
  for (const b of balls) {
    if (b.gone) continue;
    if (b.y > H + 12) drained(s, b);
  }
}

function launch(s: State) {
  for (const b of inPlay(s)) {
    if (!b.inLane || b.y < LANE_REST_Y - 2) continue;
    b.vy = -(430 + 820 * s.plunger);
    s.saveT = s.set.save;
    s.events.push('whoosh');
  }
  s.plunger = 0;
}

/** One frame of rules, timers and physics. */
export function frame(s: State) {
  for (const m of s.msgs) m.t += FRAME;
  s.msgs = s.msgs.filter((m) => m.t < 2.2);
  s.shake = Math.max(0, s.shake - FRAME * 20);
  s.tilt = Math.max(0, s.tilt - FRAME * 0.45);
  const fl = s.flash;
  fl.bumpers = fl.bumpers.map((v) => Math.max(0, v - FRAME));
  fl.slings = fl.slings.map((v) => Math.max(0, v - FRAME));
  fl.lanes = fl.lanes.map((v) => Math.max(0, v - FRAME));
  fl.saucer = Math.max(0, fl.saucer - FRAME);
  const live = inPlay(s);
  const launched = live.some((b) => !b.inLane);
  if (s.saveT > 0 && launched) s.saveT = Math.max(0, s.saveT - FRAME);
  if (s.dropResetT > 0) {
    s.dropResetT -= FRAME;
    if (s.dropResetT <= 0) s.drops = [true, true, true];
  }
  if (s.bonusT >= 0) {
    s.bonusT -= FRAME;
    if (s.bonusT < 0) endOfBall(s);
    return;
  }
  // Saucer: hold the ball a moment, then kick it back out.
  for (const b of live) {
    if (b.held < 0) continue;
    b.held += FRAME;
    if (b.held > 1.1) {
      b.held = -1;
      b.x = SAUCER.x + SAUCER.r + BALL_R + 1;
      b.y = SAUCER.y + 2;
      b.vx = 330;
      b.vy = 230;
    }
  }
  // A ball that hardly moves for a while gets a gentle shake loose.
  for (const b of live) {
    if (b.inLane || b.held >= 0) continue;
    b.still = Math.hypot(b.vx, b.vy) < 15 ? b.still + FRAME : 0;
    if (b.still > 4) {
      b.vy -= 160;
      b.vx += b.x < W / 2 ? 60 : -60;
      b.still = 0;
    }
  }
  physicsFrame(s);
}

/* ------------------------------------------------------------------- input */
export function update(s: State, dt: number, input: Input) {
  // Flippers: keys, the on-screen buttons, or a finger on either half of the table.
  let left = input.held.has('left') || input.keysHeld.has('z');
  let right = input.held.has('right') || input.keysHeld.has('/') || input.keysHeld.has('m');
  let touchL = false;
  let touchR = false;
  for (const t of input.touches) {
    if (t.x < W / 2) touchL = true;
    else touchR = true;
  }
  const ballInLane = inPlay(s).some((b) => b.inLane);
  // On a touch screen the right half pulls the plunger while a ball waits in the lane.
  const touchPlunger = ballInLane && touchR && !touchL;
  left = left || touchL;
  right = right || (touchR && !touchPlunger);
  const wasL = s.flippers[0].held;
  const wasR = s.flippers[1].held;
  if (!s.tilted && s.bonusT < 0) {
    s.flippers[0].held = left;
    s.flippers[1].held = right;
  }
  // Lane change: flipping shifts the lit top lanes.
  if (s.flippers[0].held && !wasL) {
    s.lanes = [s.lanes[1], s.lanes[2], s.lanes[0]];
    s.events.push('click');
  }
  if (s.flippers[1].held && !wasR) {
    s.lanes = [s.lanes[2], s.lanes[0], s.lanes[1]];
    s.events.push('click');
  }
  // Plunger: hold to pull back, release to launch.
  const pull = input.held.has('down') || input.held.has('action') || touchPlunger;
  if (pull && ballInLane) {
    s.pulling = true;
    s.plunger = Math.min(1, s.plunger + dt * 1.1);
  } else if (s.pulling) {
    s.pulling = false;
    launch(s);
  }
  if (input.pressed.has('up') || input.pressed.has('action2')) nudge(s, input.held.has('left') ? -1 : input.held.has('right') ? 1 : 0);
  s.touchL = touchL;
  s.touchR = touchR;
  s.acc = Math.min(s.acc + dt, FRAME * 5);
  while (s.acc >= FRAME - 1e-9 && !s.over) {
    s.acc -= FRAME;
    frame(s);
  }
}

export const laneBall = (s: State) => inPlay(s).find((b) => b.inLane);
export { LANE_X, inPlay };
