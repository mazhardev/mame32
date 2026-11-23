import type { DifficultySetting } from '@/types';
import { FIELD, PITCH, fielderXY } from '../_shared/cricket/cricket';
import type { BaseState, Input } from '../_shared/arcade/kit';

/**
 * Cricket Fielding: the computer bats, you field.
 *
 * Units are metres and seconds. The striker's stumps (the keeper's end) are
 * at the origin and the bowler's end is at y = PITCH, straight down the
 * ground; +x is the off side. The boundary is a circle around the middle of
 * the pitch. Each ball the computer plays a shot (or misses); you control the
 * fielder best placed to reach it, take catches, stop it before the rope and
 * throw to either end to run a batter out. The batters judge each run from
 * how quickly they think the ball can come back, and sometimes get it wrong.
 */
export const W = 360;
export const H = 480;
export const BOUNDARY = 62;
export const CENTER = { x: 0, y: PITCH / 2 };
/** The popping crease: a batter is safe once within this distance of the stumps. */
export const CREASE = 1.22;
const G = 9.81;
const ROLL_DECEL = 4.2;
const BOUNCE = 0.42;
export const CATCH_HEIGHT = 2.6;
const GATHER_HEIGHT = 1.1;
const STEP = 1 / 120;
/** Share of full speed your fielder runs at, unsteered, to a ball that has nearly stopped. */
export const AUTO_PACE = 0.6;

export interface Cfg {
  /** Fielder running speed (m/s). */
  run: number;
  /** How close you must be to take a catch or gather the ball. */
  reach: number;
  throwSpeed: number;
  /** Batters' running speed and how badly they misjudge a run (fraction). */
  batterSpeed: number;
  misjudge: number;
  /** Share of shots hit in the air, and shot speed range (m/s). */
  lofted: number;
  power: [number, number];
  /** The batter tries this many shots in its head and plays the one that finds the biggest gap. */
  gaps: number;
  /** Chance of dropping a catch taken at full stretch or on the dive. */
  drop: number;
  target: number;
  wickets: number;
  balls: number;
}

export const CFG: Record<DifficultySetting, Cfg> = {
  easy: { run: 7.2, reach: 1.7, throwSpeed: 30, batterSpeed: 5.6, misjudge: 0.3, lofted: 0.32, power: [16, 27], gaps: 2, drop: 0.15, target: 13, wickets: 3, balls: 12 },
  normal: { run: 6.6, reach: 1.5, throwSpeed: 28, batterSpeed: 6.0, misjudge: 0.2, lofted: 0.36, power: [17, 29], gaps: 3, drop: 0.25, target: 15, wickets: 3, balls: 12 },
  hard: { run: 6.2, reach: 1.3, throwSpeed: 26, batterSpeed: 6.4, misjudge: 0.12, lofted: 0.4, power: [18, 31], gaps: 4, drop: 0.35, target: 17, wickets: 3, balls: 12 },
};

export interface Fielder {
  name: string;
  x: number;
  y: number;
  hx: number;
  hy: number;
  /** Seconds of diving left, then seconds lying on the ground. */
  dive: number;
  down: number;
  dvx: number;
  dvy: number;
}

export type BallState = 'air' | 'ground' | 'held' | 'thrown' | 'dead';

export interface Ball {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  bounced: boolean;
  state: BallState;
  /** Fielder holding it, or the end it was thrown to (0 = keeper's end, 1 = bowler's end). */
  holder: number;
  throwEnd: 0 | 1;
  throwT: number;
  throwDur: number;
  fromX: number;
  fromY: number;
  direct: boolean;
}

export type Phase = 'runup' | 'live' | 'after' | 'done';

export interface BallLog {
  runs: number;
  text: string;
  out: boolean;
}

export interface State extends BaseState {
  difficulty: DifficultySetting;
  cfg: Cfg;
  phase: Phase;
  phaseT: number;
  fielders: Fielder[];
  /** Index of the fielder you control. */
  active: number;
  ball: Ball;
  /** Runs completed this ball, and progress (0–1) of the run under way, if any. */
  runs: number;
  running: boolean;
  runP: number;
  /** The batters wait at the crease for this long before deciding on the next run. */
  pause: number;
  /** Seconds the ball has been held with nobody running: after a while it counts as returned. */
  heldIdle: number;
  /** Seconds since the ball was gathered (for the throw prompt). */
  heldT: number;
  switchT: number;
  /** Totals for the innings. */
  total: number;
  wickets: number;
  balled: number;
  log: BallLog[];
  banner: string;
  /** What the computer batter does this ball. */
  shot: 'miss' | 'bowled' | 'hit';
  stats: { catches: number; drops: number; runOuts: number; directHits: number; dots: number; ropeSaves: number; boundaries: number };
  result: 'won' | 'lost' | null;
  /** Where the pointer last asked the active fielder to run, in metres. */
  goal: { x: number; y: number } | null;
  /** Where the active fielder jogs on their own when you are not steering. */
  auto: { x: number; y: number } | null;
}

const fieldPositions = (): Fielder[] => {
  const spots = FIELD.filter((f) => f.name !== 'slip').map((f) => ({ name: f.name, ...fielderXY(f) }));
  spots.push({ name: 'the bowler', x: 1.2, y: PITCH + 2.5 });
  // Keep the deep fielders a few metres inside this (smaller) boundary.
  for (const p of spots) {
    const d = distFromCenter(p.x, p.y);
    if (d > BOUNDARY - 5) {
      const k = (BOUNDARY - 5) / d;
      p.x = CENTER.x + (p.x - CENTER.x) * k;
      p.y = CENTER.y + (p.y - CENTER.y) * k;
    }
  }
  return spots.map((p) => ({ name: p.name, x: p.x, y: p.y, hx: p.x, hy: p.y, dive: 0, down: 0, dvx: 0, dvy: 0 }));
};

export const KEEPER_INDEX = 0;

export function freshBall(): Ball {
  return {
    x: 0,
    y: PITCH,
    z: 2,
    vx: 0,
    vy: 0,
    vz: 0,
    bounced: false,
    state: 'dead',
    holder: -1,
    throwEnd: 0,
    throwT: 0,
    throwDur: 0,
    fromX: 0,
    fromY: 0,
    direct: false,
  };
}

export function create(difficulty: DifficultySetting): State {
  const cfg = CFG[difficulty];
  return {
    score: 0,
    over: false,
    events: [],
    time: 0,
    difficulty,
    cfg,
    phase: 'runup',
    phaseT: 0,
    fielders: fieldPositions(),
    active: 0,
    ball: freshBall(),
    runs: 0,
    running: false,
    runP: 0,
    pause: 0,
    heldIdle: 0,
    heldT: 0,
    switchT: 0,
    total: 0,
    wickets: 0,
    balled: 0,
    log: [],
    banner: '',
    shot: 'hit',
    stats: { catches: 0, drops: 0, runOuts: 0, directHits: 0, dots: 0, ropeSaves: 0, boundaries: 0 },
    result: null,
    goal: null,
    auto: null,
  };
}

export const needed = (s: State) => Math.max(0, s.cfg.target - s.total);
export const ballsLeft = (s: State) => s.cfg.balls - s.balled;
function distFromCenter(x: number, y: number) {
  return Math.hypot(x - CENTER.x, y - CENTER.y);
}
export const endY = (end: 0 | 1) => (end === 0 ? 0 : PITCH);

/** Where an airborne ball first lands, and when (seconds from now). */
export function landing(b: Ball): { x: number; y: number; t: number } {
  const t = (b.vz + Math.sqrt(b.vz * b.vz + 2 * G * Math.max(0, b.z))) / G;
  return { x: b.x + b.vx * t, y: b.y + b.vy * t, t };
}

/**
 * The computer batter's shot for this ball: a miss now and then, a rare
 * bowled, otherwise a stroke somewhere around the ground, in the air or
 * along it. Front-of-the-wicket shots are more common, as in real cricket.
 */
export function playShot(s: State, random: () => number) {
  const r = random();
  const b = freshBall();
  b.x = 0.3;
  b.y = 0.9;
  b.z = 0.6;
  if (r < 0.14) {
    s.shot = 'miss';
    // Beaten: the ball carries to the keeper.
    b.vx = 0;
    b.vy = -10;
    b.vz = 1.5;
    b.state = 'air';
    s.ball = b;
    return;
  }
  if (r < 0.17) {
    s.shot = 'bowled';
    s.ball = b;
    return;
  }
  s.shot = 'hit';
  const [lo, hi] = s.cfg.power;
  const lofted = random() < s.cfg.lofted;
  let best: Ball | null = null;
  let bestT = -1;
  for (let k = 0; k < s.cfg.gaps; k++) {
    const c = { ...b };
    const front = random() < 0.72;
    const side = random() < 0.5 ? -1 : 1;
    const angle = side * (front ? random() * 1.35 : 1.35 + random() * 1.5);
    const speed = lo + (hi - lo) * random();
    const elev = lofted ? 0.36 + random() * 0.4 : 0.04 + random() * 0.08;
    const h = speed * Math.cos(elev);
    c.vx = Math.sin(angle) * h;
    c.vy = Math.cos(angle) * h;
    c.vz = speed * Math.sin(elev);
    c.state = 'air';
    // How long the quickest fielder would take to get to it: bigger is a better gap.
    s.ball = c;
    const path = predictPath(c);
    const t = Math.min(...s.fielders.map((f) => intercept(f, c, s.cfg, path).t));
    if (t > bestT) {
      bestT = t;
      best = c;
    }
  }
  s.ball = best ?? b;
}

/** Seconds a fielder needs to reach a point. */
const reachTime = (f: Fielder, x: number, y: number, cfg: Cfg) => Math.max(0, Math.hypot(f.x - x, f.y - y) - cfg.reach) / cfg.run;

type PathPoint = { x: number; y: number; z: number; t: number };

/** Simulated ball path for planning: positions every 0.1 s until it stops or crosses the rope. */
export function predictPath(b: Ball, secs = 8): PathPoint[] {
  const p = { ...b };
  const out: PathPoint[] = [];
  const dt = 1 / 40;
  for (let n = 0; n * dt <= secs; n++) {
    const t = n * dt;
    if (n % 4 === 0) out.push({ x: p.x, y: p.y, z: p.z, t });
    if (!moveBall(p, dt) || distFromCenter(p.x, p.y) > BOUNDARY) {
      out.push({ x: p.x, y: p.y, z: p.z, t: t + dt });
      break;
    }
  }
  return out;
}

/** The best intercept for a fielder: earliest point on the path they can reach in time. */
export function intercept(f: Fielder, b: Ball, cfg: Cfg, path: PathPoint[] = predictPath(b)): { x: number; y: number; t: number } {
  for (const p of path) {
    if (p.z > CATCH_HEIGHT && p.t < 0.6) continue;
    if (reachTime(f, p.x, p.y, cfg) <= p.t) return { x: p.x, y: p.y, t: p.t };
  }
  const last = path.at(-1) ?? { x: b.x, y: b.y, t: 0 };
  return { x: last.x, y: last.y, t: last.t + reachTime(f, last.x, last.y, cfg) };
}

/** Pick the fielder who can get to the ball first. */
export function chooseActive(s: State, path: PathPoint[] = predictPath(s.ball)): number {
  let best = s.active;
  let bestT = Infinity;
  s.fielders.forEach((f, i) => {
    const t = intercept(f, s.ball, s.cfg, path).t;
    if (t < bestT) {
      bestT = t;
      best = i;
    }
  });
  return best;
}

/** Moves a free ball one step; false once it has stopped. */
function moveBall(b: Ball, dt: number): boolean {
  if (b.z > 0 || b.vz > 0) {
    b.vz -= G * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.z += b.vz * dt;
    if (b.z <= 0) {
      b.z = 0;
      b.bounced = true;
      b.vz = -b.vz * BOUNCE;
      b.vx *= 0.72;
      b.vy *= 0.72;
      if (b.vz < 1.2) b.vz = 0;
    }
    return true;
  }
  const v = Math.hypot(b.vx, b.vy);
  if (v < 0.05) {
    b.vx = 0;
    b.vy = 0;
    return false;
  }
  const nv = Math.max(0, v - ROLL_DECEL * dt);
  b.vx *= nv / v;
  b.vy *= nv / v;
  b.x += b.vx * dt;
  b.y += b.vy * dt;
  return true;
}

/** How long, from now, the batters think it will take the ball to reach the stumps. */
function returnEstimate(s: State): number {
  const b = s.ball;
  if (b.state === 'held') {
    const f = s.fielders[b.holder];
    return Math.min(Math.hypot(f.x, f.y), Math.hypot(f.x, f.y - PITCH)) / s.cfg.throwSpeed + 0.5;
  }
  if (b.state === 'thrown') return Math.max(0, b.throwDur - b.throwT) + 0.3;
  let best = Infinity;
  const path = predictPath(b);
  for (const f of s.fielders) {
    const i = intercept(f, b, s.cfg, path);
    const back = Math.min(Math.hypot(i.x, i.y), Math.hypot(i.x, i.y - PITCH)) / s.cfg.throwSpeed;
    best = Math.min(best, i.t + 0.35 + back + 0.5);
  }
  return best;
}

const runTime = (s: State) => PITCH / s.cfg.batterSpeed;

/** The batters decide whether to go for a run, misjudging it by up to cfg.misjudge. */
function decideRun(s: State, random: () => number) {
  if (s.ball.state === 'dead') return;
  const guess = returnEstimate(s) * (1 + (random() * 2 - 1) * s.cfg.misjudge);
  // They take on a run whenever they think the ball will come back slower than they can run it.
  if (guess > runTime(s)) {
    s.running = true;
    s.runP = 0;
  }
}

function endBall(s: State, runs: number, text: string, out: boolean) {
  s.ball.state = 'dead';
  s.running = false;
  s.total += runs;
  if (out) s.wickets++;
  if (runs === 0 && !out) s.stats.dots++;
  s.balled++;
  s.log.unshift({ runs, text, out });
  s.banner = text;
  s.phase = 'after';
  s.phaseT = 0;
  if (out) s.events.push('success');
  else if (runs >= 4) s.events.push('failure');
  else s.events.push('click');
}

/** Stumps broken at one end: a batter short of that crease is run out. */
function breakStumps(s: State) {
  const short = s.running && (1 - s.runP) * PITCH > CREASE;
  if (short) {
    s.stats.runOuts++;
    if (s.ball.direct) s.stats.directHits++;
    endBall(s, s.runs, s.ball.direct ? 'RUN OUT! Direct hit!' : 'RUN OUT!', true);
    return;
  }
  // Safe: they finish the run they are on, then the ball is dead.
  const runs = s.runs + (s.running ? 1 : 0);
  endBall(s, runs, runs === 0 ? 'Dot ball' : runs === 1 ? '1 run' : `${runs} runs`, false);
}

/** Throw the ball to one end. */
export function throwTo(s: State, end: 0 | 1, random: () => number) {
  const b = s.ball;
  if (b.state !== 'held') return;
  const f = s.fielders[b.holder];
  const d = Math.hypot(f.x, f.y - endY(end));
  b.state = 'thrown';
  b.throwEnd = end;
  b.throwT = 0;
  b.throwDur = d / s.cfg.throwSpeed;
  b.fromX = f.x;
  b.fromY = f.y;
  // Close in, a throw usually hits the stumps; from the deep it rarely does.
  b.direct = random() < Math.max(0.15, Math.min(0.85, 1.05 - d / 40));
  b.z = 1;
  s.events.push('click');
}

function gather(s: State, i: number, random: () => number) {
  const b = s.ball;
  const f = s.fielders[i];
  const catchable = !b.bounced && b.z <= CATCH_HEIGHT && s.shot === 'hit';
  const stretch = f.dive > 0 || Math.hypot(f.x - b.x, f.y - b.y) > s.cfg.reach * 0.6;
  if (catchable && stretch && random() < s.cfg.drop) {
    // Dropped! It pops out and falls to the ground.
    s.stats.drops++;
    b.bounced = true;
    b.vx *= -0.15;
    b.vy *= -0.15;
    b.vz = 1.5;
    s.banner = 'Dropped!';
    s.events.push('failure');
    return;
  }
  if (catchable) {
    s.stats.catches++;
    endBall(s, 0, `CAUGHT by ${s.fielders[i].name}!`, true);
    return;
  }
  if (s.shot === 'miss') {
    endBall(s, 0, 'Beaten! Dot ball', false);
    return;
  }
  b.state = 'held';
  b.holder = i;
  s.heldT = 0;
  s.banner = '';
  b.vx = 0;
  b.vy = 0;
  b.vz = 0;
  b.z = 1;
  s.active = i;
  if (distFromCenter(s.fielders[i].x, s.fielders[i].y) > BOUNDARY - 4) s.stats.ropeSaves++;
  s.events.push('pop');
}

/** One fixed physics step. */
function stepLive(s: State, dt: number, input: Input | null, random: () => number) {
  const b = s.ball;
  // Batters run.
  if (s.pause > 0) s.pause = Math.max(0, s.pause - dt);
  if (s.running) {
    s.runP += (dt * s.cfg.batterSpeed) / PITCH;
    if (s.runP >= 1) {
      s.runs++;
      s.running = false;
      s.runP = 0;
      s.pause = 0.35;
    }
  } else if (s.pause === 0 && b.state !== 'thrown' && b.state !== 'dead' && s.shot === 'hit') {
    decideRun(s, random);
    if (!s.running) s.pause = 0.25;
  }

  // The ball.
  if (b.state === 'air' || b.state === 'ground') {
    const moving = moveBall(b, dt);
    if (b.z === 0 && b.vz === 0) b.state = 'ground';
    if (distFromCenter(b.x, b.y) > BOUNDARY) {
      const runs = b.bounced ? 4 : 6;
      s.stats.boundaries++;
      endBall(s, runs, runs === 6 ? 'SIX!' : 'FOUR!', false);
      return;
    }
    // Any fielder close enough gathers it (the one you control can dive for more reach).
    const reachable = b.z <= (b.bounced ? GATHER_HEIGHT : CATCH_HEIGHT);
    if (reachable) {
      for (let i = 0; i < s.fielders.length; i++) {
        const f = s.fielders[i];
        if (f.down > 0 && f.dive <= 0) continue;
        // Only the fielder you control takes catches; the others stop a ball hit right at them.
        if (i !== s.active && !b.bounced) continue;
        const reach = i === s.active ? s.cfg.reach + (f.dive > 0 ? 0.9 : 0) : 0.5;
        if (Math.hypot(f.x - b.x, f.y - b.y) <= reach) {
          gather(s, i, random);
          if (s.ball.state !== 'air' && s.ball.state !== 'ground') return;
          break;
        }
      }
    }
    if (!moving && s.shot === 'miss') {
      endBall(s, 0, 'Beaten! Dot ball', false);
      return;
    }
  } else if (b.state === 'held') {
    const f = s.fielders[b.holder];
    b.x = f.x;
    b.y = f.y;
    s.heldT += dt;
    s.heldIdle = s.running ? 0 : s.heldIdle + dt;
    if (s.heldIdle > 2.2) {
      endBall(s, s.runs, s.runs === 0 ? 'Dot ball' : s.runs === 1 ? '1 run' : `${s.runs} runs`, false);
      return;
    }
  } else if (b.state === 'thrown') {
    b.throwT += dt;
    const k = Math.min(1, b.throwT / b.throwDur);
    b.x = b.fromX + (0 - b.fromX) * k;
    b.y = b.fromY + (endY(b.throwEnd) - b.fromY) * k;
    // Gathering a throw that missed takes the keeper or bowler a moment.
    if (b.throwT >= b.throwDur + (b.direct ? 0 : 0.45)) {
      breakStumps(s);
      return;
    }
  }

  // Fielders: the one you control follows your input; the rest close in a little.
  s.fielders.forEach((f, i) => {
    if (f.down > 0) {
      if (f.dive > 0) {
        f.dive = Math.max(0, f.dive - dt);
        f.x += f.dvx * dt;
        f.y += f.dvy * dt;
      }
      f.down = Math.max(0, f.down - dt);
      return;
    }
    let tx = f.x;
    let ty = f.y;
    let sp = s.cfg.run * 0.6;
    if (i === s.active && b.state !== 'thrown') {
      const mv = input ? moveVector(s, input) : { x: 0, y: 0 };
      if (mv.x || mv.y) {
        tx = f.x + mv.x * 10;
        ty = f.y + mv.y * 10;
        sp = s.cfg.run;
      } else if (s.auto && b.state === 'ground' && Math.hypot(b.vx, b.vy) < 3) {
        // Left alone, your fielder wanders over to a ball that has almost stopped.
        [tx, ty] = [s.auto.x, s.auto.y];
        sp = s.cfg.run * AUTO_PACE;
      }
    } else if (b.state === 'held' || b.state === 'thrown') {
      // Keeper and bowler come up to the stumps to take the throw.
      if (i === KEEPER_INDEX) [tx, ty] = [0.4, -0.8];
      else if (s.fielders[i].name === 'the bowler') [tx, ty] = [0.6, PITCH + 0.8];
    }
    const dx = tx - f.x;
    const dy = ty - f.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.05) {
      const m = Math.min(d, sp * dt);
      f.x += (dx / d) * m;
      f.y += (dy / d) * m;
    }
  });

  // Every so often, hand control to whoever can now get there clearly first.
  s.switchT += dt;
  if ((b.state === 'air' || b.state === 'ground') && s.switchT >= 0.2) {
    s.switchT = 0;
    const path = predictPath(b);
    const mine = intercept(s.fielders[s.active], b, s.cfg, path);
    s.auto = { x: mine.x, y: mine.y };
    const best = chooseActive(s, path);
    if (best !== s.active) {
      const cur = intercept(s.fielders[s.active], b, s.cfg, path).t;
      const alt = intercept(s.fielders[best], b, s.cfg, path).t;
      if (alt < cur * 0.75 - 0.2) {
        s.active = best;
        s.goal = null;
        s.auto = null;
      }
    }
  }
}

/** Direction the controlled fielder should run, from keys or the pointer (unit vector or zero). */
export function moveVector(s: State, input: Input): { x: number; y: number } {
  let x = 0;
  let y = 0;
  if (input.held.has('left')) x -= 1;
  if (input.held.has('right')) x += 1;
  if (input.held.has('up')) y += 1;
  if (input.held.has('down')) y -= 1;
  if (x || y) {
    s.goal = null;
    const d = Math.hypot(x, y);
    return { x: x / d, y: y / d };
  }
  const f = s.fielders[s.active];
  if (s.goal) {
    const dx = s.goal.x - f.x;
    const dy = s.goal.y - f.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.3) return { x: 0, y: 0 };
    return { x: dx / d, y: dy / d };
  }
  return { x: 0, y: 0 };
}

/** Dive: a quick burst toward where you are running (or toward the ball), then a moment on the ground. */
export function dive(s: State) {
  const f = s.fielders[s.active];
  if (f.down > 0 || s.ball.state === 'held' || s.ball.state === 'thrown' || s.ball.state === 'dead') return;
  let dx = s.ball.x - f.x;
  let dy = s.ball.y - f.y;
  if (s.goal) {
    dx = s.goal.x - f.x;
    dy = s.goal.y - f.y;
  }
  const d = Math.hypot(dx, dy) || 1;
  const sp = s.cfg.run * 1.6;
  f.dvx = (dx / d) * sp;
  f.dvy = (dy / d) * sp;
  f.dive = 0.35;
  f.down = 0.85;
  s.events.push('jump');
}

// ---- Screen mapping -------------------------------------------------------

export const SCALE = 150 / (BOUNDARY + 4);
export const FIELD_CX = W / 2;
export const FIELD_CY = 290;

export function toScreen(x: number, y: number): { x: number; y: number } {
  return { x: FIELD_CX + (x - CENTER.x) * SCALE, y: FIELD_CY - (y - CENTER.y) * SCALE };
}

export function toField(sx: number, sy: number): { x: number; y: number } {
  return { x: CENTER.x + (sx - FIELD_CX) / SCALE, y: CENTER.y - (sy - FIELD_CY) / SCALE };
}

/** Screen boxes for the two throw targets (shown while you hold the ball). */
export function throwButtons(): { end: 0 | 1; x: number; y: number; w: number; h: number; label: string }[] {
  return [
    { end: 1, x: 10, y: H - 46, w: 150, h: 38, label: '▲ Bowler’s end' },
    { end: 0, x: W - 160, y: H - 46, w: 150, h: 38, label: '▼ Keeper’s end' },
  ];
}

// ---- Update ---------------------------------------------------------------

export function update(s: State, dt: number, input: Input, random: () => number) {
  if (s.over) return;
  s.phaseT += dt;
  if (s.phase === 'runup') {
    if (s.phaseT >= 1.1) {
      s.phase = 'live';
      s.phaseT = 0;
      s.runs = 0;
      s.running = false;
      s.runP = 0;
      s.pause = 0.15;
      s.heldIdle = 0;
      s.banner = '';
      s.fielders.forEach((f) => {
        f.dive = 0;
        f.down = 0;
      });
      playShot(s, random);
      if (s.shot === 'bowled') {
        endBall(s, 0, 'BOWLED!', true);
        return;
      }
      s.active = chooseActive(s);
      s.goal = null;
      s.auto = null;
      s.switchT = 0.2;
      s.events.push('hit');
    }
    return;
  }
  if (s.phase === 'after') {
    if (s.phaseT >= 1.8) nextBall(s);
    return;
  }
  if (s.phase !== 'live') return;

  handleInput(s, input, random);
  let left = Math.min(dt, 0.05);
  while (left > 1e-9 && s.phase === 'live') {
    const h = Math.min(STEP, left);
    stepLive(s, h, input, random);
    left -= h;
  }
}

function handleInput(s: State, input: Input, random: () => number) {
  const p = input.pointer;
  if (s.ball.state === 'held') {
    if (input.pressed.has('action2') || input.keys.has('k') || input.keys.has('1')) return throwTo(s, 0, random);
    if (input.pressed.has('action3') || input.keys.has('b') || input.keys.has('2')) return throwTo(s, 1, random);
    if (p.pressed) {
      for (const bt of throwButtons()) {
        if (p.x >= bt.x && p.x <= bt.x + bt.w && p.y >= bt.y && p.y <= bt.y + bt.h) return throwTo(s, bt.end, random);
      }
      // Tapping a set of stumps throws there too.
      for (const end of [0, 1] as const) {
        const st = toScreen(0, endY(end));
        if (Math.hypot(p.x - st.x, p.y - st.y) < 26) return throwTo(s, end, random);
      }
    }
  }
  if (input.pressed.has('action')) dive(s);
  if (p.down && p.y > 110) s.goal = toField(p.x, p.y);
}

function nextBall(s: State) {
  if (s.total >= s.cfg.target) return finish(s, 'lost');
  if (s.wickets >= s.cfg.wickets || s.balled >= s.cfg.balls) return finish(s, 'won');
  s.phase = 'runup';
  s.phaseT = 0;
  s.banner = '';
  s.ball = freshBall();
  s.fielders.forEach((f) => {
    f.x = f.hx;
    f.y = f.hy;
  });
}

function finish(s: State, result: 'won' | 'lost') {
  s.result = result;
  s.phase = 'done';
  s.over = true;
  const margin = Math.max(0, s.cfg.target - 1 - s.total);
  s.score = s.wickets * 100 + s.stats.dots * 10 + s.stats.catches * 50 + s.stats.runOuts * 50 + (result === 'won' ? 500 + margin * 25 : 0);
  s.events.push(result === 'won' ? 'levelComplete' : 'gameOver');
}
