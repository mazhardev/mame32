import type { DifficultySetting } from '@/types';

/**
 * Cricket kit: delivery physics, the batting outcome model, a field of
 * fielders, computer bowlers and batters, and innings bookkeeping.
 *
 * Units are metres and seconds. Depth `d` runs from the batter's stumps
 * (d = 0) to the bowler's end (d = PITCH). Lateral `x` is positive on the
 * off side; height `z` is above the pitch. On the field map the batter is at
 * the origin, straight down the ground is angle 0 and the off side positive.
 */
export const PITCH = 20.12;
export const RELEASE_Z = 2.1;
export const GRAVITY = 9.81;
export const STUMP_HALF = 0.15;
export const STUMP_HEIGHT = 0.72;
/** Where the bat meets the ball, in front of the stumps. */
export const CONTACT_D = 0.8;
/** Seconds from pressing swing to the bat reaching the contact point. */
export const SWING_TIME = 0.16;
export const BOUNDARY = 65;

export type Kind = 'pace' | 'spin';

export interface Delivery {
  kind: Kind;
  /** Speed out of the hand (m/s). */
  speed: number;
  releaseX: number;
  /** Where it pitches: distance from the batter's stumps and line. */
  length: number;
  bounceX: number;
  /** Sideways movement after pitching (seam or spin), measured at the stumps. */
  turn: number;
}

const bounceRestitution = (dl: Delivery) => (dl.kind === 'spin' ? 0.5 : 0.58);
const afterSpeed = (dl: Delivery) => dl.speed * (dl.kind === 'spin' ? 0.82 : 0.88);
const preTime = (dl: Delivery) => (PITCH - dl.length) / dl.speed;

/** Seconds from release until the ball reaches depth d. */
export function arrival(dl: Delivery, d = 0): number {
  if (d >= dl.length) return (PITCH - d) / dl.speed;
  return preTime(dl) + (dl.length - d) / afterSpeed(dl);
}

export interface BallPos {
  d: number;
  x: number;
  z: number;
  bounced: boolean;
}

export function ballAt(dl: Delivery, t: number): BallPos {
  const tb = preTime(dl);
  if (t <= tb) {
    const vz0 = (0.5 * GRAVITY * tb * tb - RELEASE_Z) / tb;
    return {
      d: PITCH - dl.speed * t,
      x: dl.releaseX + (dl.bounceX - dl.releaseX) * (t / tb),
      z: Math.max(0, RELEASE_Z + vz0 * t - 0.5 * GRAVITY * t * t),
      bounced: false,
    };
  }
  const vz0 = (0.5 * GRAVITY * tb * tb - RELEASE_Z) / tb;
  const vzUp = -(vz0 - GRAVITY * tb) * bounceRestitution(dl);
  const tp = t - tb;
  const post = dl.length / afterSpeed(dl);
  const z = vzUp * tp - 0.5 * GRAVITY * tp * tp;
  return {
    d: dl.length - afterSpeed(dl) * tp,
    x: dl.bounceX + dl.turn * Math.min(1.4, tp / post),
    z: Math.max(0, z),
    bounced: true,
  };
}

export function hitsStumps(dl: Delivery): boolean {
  const p = ballAt(dl, arrival(dl, 0));
  return Math.abs(p.x) < STUMP_HALF && p.z < STUMP_HEIGHT;
}

export function isWide(dl: Delivery): boolean {
  return Math.abs(ballAt(dl, arrival(dl, 0)).x) > 1.0;
}

export interface Fielder {
  name: string;
  /** Angle from straight (radians, off side positive) and distance from the batter. */
  angle: number;
  r: number;
}

export const KEEPER: Fielder = { name: 'the keeper', angle: Math.PI, r: 12 };

export const FIELD: Fielder[] = [
  KEEPER,
  { name: 'slip', angle: Math.PI - 0.32, r: 14 },
  { name: 'point', angle: 1.5, r: 24 },
  { name: 'cover', angle: 0.85, r: 28 },
  { name: 'mid-off', angle: 0.22, r: 30 },
  { name: 'mid-on', angle: -0.22, r: 30 },
  { name: 'midwicket', angle: -0.95, r: 27 },
  { name: 'square leg', angle: -1.55, r: 26 },
  { name: 'fine leg', angle: -2.6, r: 56 },
  { name: 'third man', angle: 2.55, r: 56 },
  { name: 'long-on', angle: -0.45, r: 60 },
];

export function fielderXY(f: Fielder) {
  return { x: Math.sin(f.angle) * f.r, y: Math.cos(f.angle) * f.r };
}

export interface ShotInput {
  /** Time (since release) the swing started, or null for no shot. */
  swingAt: number | null;
  /** −1 leg side, 0 straight, 1 off side. */
  dir: -1 | 0 | 1;
  lofted: boolean;
}

export type Dismissal = 'bowled' | 'caught' | 'caught behind';

export interface Outcome {
  runs: number;
  extras: number;
  out: Dismissal | null;
  /** The ball does not count towards the over (a wide). */
  rebowl: boolean;
  text: string;
  /** Contact quality 0–1, or −1 when the ball was missed or left. */
  quality: number;
  /** Timing error in seconds (negative = early). */
  timing: number;
  angle: number;
  /** Distance the ball travelled on the field map, and whether it went in the air. */
  dist: number;
  aerial: boolean;
  fielder: string | null;
}

export interface FieldCfg {
  /** Timing window (s) within which contact is possible. */
  window: number;
  /** Fielders reach this far sideways to stop a ground shot. */
  reach: number;
  catchRadius: number;
  /** Chance a catchable ball is held. */
  hands: number;
}

export const FIELD_CFG: Record<DifficultySetting, FieldCfg> = {
  easy: { window: 0.15, reach: 3, catchRadius: 7, hands: 0.75 },
  normal: { window: 0.12, reach: 4, catchRadius: 10, hands: 0.85 },
  hard: { window: 0.095, reach: 5, catchRadius: 12, hands: 0.92 },
};

function noShot(dl: Delivery, timing: number, missed: boolean): Outcome {
  const base = {
    extras: 0,
    rebowl: false,
    quality: -1,
    timing,
    angle: 0,
    dist: 0,
    aerial: false,
    fielder: null,
  };
  if (isWide(dl) && !missed)
    return { ...base, runs: 0, extras: 1, out: null, rebowl: true, text: 'Wide! +1' };
  if (hitsStumps(dl)) return { ...base, runs: 0, out: 'bowled', text: 'BOWLED!' };
  return { ...base, runs: 0, out: null, text: missed ? 'Beaten — no run' : 'Left alone — no run' };
}

function groundRuns(
  dist: number,
  angle: number,
  cfg: FieldCfg,
): { runs: number; fielder: string | null; stop: number } {
  let best: { f: Fielder; along: number } | null = null;
  for (const f of FIELD) {
    if (f === KEEPER) continue;
    const da = angle - f.angle;
    const along = f.r * Math.cos(da);
    const side = Math.abs(f.r * Math.sin(da));
    if (along <= 0 || side > cfg.reach || f.r > dist + 3) continue;
    if (!best || along < best.along) best = { f, along };
  }
  if (best) {
    const r = best.f.r;
    return { runs: r < 22 ? 0 : r < 45 ? 1 : 2, fielder: best.f.name, stop: r };
  }
  if (dist >= BOUNDARY) return { runs: 4, fielder: null, stop: BOUNDARY };
  return { runs: dist < 30 ? 1 : dist < 50 ? 2 : 3, fielder: null, stop: dist };
}

/**
 * Decides what happens to a delivery given the batter's swing. Timing sets
 * the contact quality; early contact goes to the leg side and late contact
 * to the off side, on top of the direction the batter chose.
 */
export function resolveBall(
  dl: Delivery,
  shot: ShotInput,
  cfg: FieldCfg,
  random: () => number,
): Outcome {
  const tc = arrival(dl, CONTACT_D);
  if (shot.swingAt === null) return noShot(dl, 0, false);
  const timing = shot.swingAt + SWING_TIME - tc;
  let q = 1 - Math.abs(timing) / cfg.window;
  const contact = ballAt(dl, tc);
  if (contact.z > 1.35 && !shot.lofted) q *= 0.6;
  if (Math.abs(contact.x) > 0.8) q *= 0.7;
  if (q <= 0) return noShot(dl, timing, true);
  const wide = isWide(dl);
  const extras = wide ? 1 : 0;
  const base = { extras, rebowl: wide, quality: q, timing };

  if (q < 0.3) {
    // An edge: it flies behind the wicket.
    const angle = Math.PI - 0.3 + (random() - 0.5) * 0.8;
    const behind = dl.kind === 'pace' ? ((0.3 - q) / 0.3) * 0.75 * cfg.hands : 0.1;
    if (random() < behind) {
      const who = random() < 0.5 ? 'the keeper' : 'slip';
      return {
        ...base,
        runs: 0,
        out: 'caught behind',
        text: `Edged… caught by ${who}!`,
        angle,
        dist: 14,
        aerial: true,
        fielder: who,
      };
    }
    const runs = random() < 0.5 ? 0 : 1;
    return {
      ...base,
      runs,
      out: null,
      text: runs ? 'Thick edge — one run' : 'Edged, no run',
      angle,
      dist: 18,
      aerial: false,
      fielder: null,
    };
  }

  const baseAngle = shot.dir === -1 ? -1.1 : shot.dir === 1 ? 1.1 : 0;
  const angle = Math.max(
    -2.6,
    Math.min(2.6, baseAngle + Math.max(-0.7, Math.min(0.7, timing * 6)) + (random() - 0.5) * 0.25),
  );

  if (shot.lofted) {
    const carry = 25 + q ** 1.4 * 68;
    if (carry >= BOUNDARY + 1)
      return {
        ...base,
        runs: 6,
        out: null,
        text: 'SIX!',
        angle,
        dist: carry,
        aerial: true,
        fielder: null,
      };
    const land = { x: Math.sin(angle) * carry, y: Math.cos(angle) * carry };
    let near: { f: Fielder; d: number } | null = null;
    for (const f of FIELD) {
      if (f === KEEPER) continue;
      const p = fielderXY(f);
      const d = Math.hypot(p.x - land.x, p.y - land.y);
      if (!near || d < near.d) near = { f, d };
    }
    if (near && near.d < cfg.catchRadius && random() < cfg.hands) {
      return {
        ...base,
        runs: 0,
        out: 'caught',
        text: `Caught at ${near.f.name}!`,
        angle,
        dist: carry,
        aerial: true,
        fielder: near.f.name,
      };
    }
    const g = groundRuns(carry + 10, angle, { ...cfg, reach: cfg.reach * 0.6 });
    const runs = carry + 10 >= BOUNDARY && g.fielder === null ? 4 : g.runs;
    const dropped = near && near.d < cfg.catchRadius;
    return {
      ...base,
      runs,
      out: null,
      text: `${dropped ? 'Dropped! ' : ''}${runs === 4 ? 'FOUR!' : runs === 0 ? 'No run' : `${runs} run${runs > 1 ? 's' : ''}`}`,
      angle,
      dist: carry,
      aerial: true,
      fielder: g.fielder,
    };
  }

  const dist = 15 + q ** 1.3 * 80;
  const g = groundRuns(dist, angle, cfg);
  const text =
    g.runs === 4
      ? 'FOUR!'
      : g.runs === 0
        ? `Straight to ${g.fielder ?? 'a fielder'} — no run`
        : `${g.runs} run${g.runs > 1 ? 's' : ''}`;
  return {
    ...base,
    runs: g.runs,
    out: null,
    text,
    angle,
    dist: g.stop,
    aerial: false,
    fielder: g.fielder,
  };
}

// ——— Computer bowler ———

export interface BowlerCfg {
  pace: [number, number];
  spinShare: number;
  /** Chance of a well-directed delivery (on the stumps, good length). */
  accuracy: number;
}

export const BOWLER: Record<DifficultySetting, BowlerCfg> = {
  easy: { pace: [27, 31], spinShare: 0.4, accuracy: 0.45 },
  normal: { pace: [31, 35], spinShare: 0.35, accuracy: 0.65 },
  hard: { pace: [34, 39], spinShare: 0.3, accuracy: 0.8 },
};

export function aiDelivery(cfg: BowlerCfg, random: () => number): Delivery {
  const spin = random() < cfg.spinShare;
  const good = random() < cfg.accuracy;
  const lengths = good ? [0.9, 4.5, 5.5, 6.5] : [2.5, 3, 7.5, 8.5, 9.5];
  const length = lengths[Math.floor(random() * lengths.length)] + (random() - 0.5) * 0.8;
  const line = good ? (random() - 0.4) * 0.3 : (random() - 0.3) * 1.2;
  const turn = spin
    ? (random() < 0.5 ? -1 : 1) * (0.15 + random() * 0.25)
    : (random() - 0.5) * 0.16;
  return {
    kind: spin ? 'spin' : 'pace',
    speed: spin ? 21 + random() * 3 : cfg.pace[0] + random() * (cfg.pace[1] - cfg.pace[0]),
    releaseX: spin ? 0.25 : 0.4,
    length: spin ? Math.max(2.5, length) : length,
    bounceX: line - turn * 0.5,
    turn,
  };
}

// ——— Computer batter ———

export interface BatterCfg {
  skill: number;
}

export const BATTER: Record<DifficultySetting, BatterCfg> = {
  easy: { skill: 0.55 },
  normal: { skill: 0.7 },
  hard: { skill: 0.85 },
};

/** How hard a delivery is to score from (0 = easy, ~1 = unplayable). */
export function deliveryDanger(dl: Delivery, previous: Delivery | null): number {
  const atStumps = ballAt(dl, arrival(dl, 0));
  let danger = 0;
  if (Math.abs(atStumps.x) < 0.25) danger += 0.3;
  if (dl.length < 1.4) danger += 0.35;
  else if (dl.length >= 3.5 && dl.length <= 7) danger += 0.25;
  else if (dl.length > 8) danger += 0.05;
  danger += Math.max(0, (dl.speed - 30) / 30);
  danger += Math.min(0.15, Math.abs(dl.turn) * 0.4);
  if (previous && (Math.abs(previous.length - dl.length) > 2.5 || previous.kind !== dl.kind))
    danger += 0.12;
  return danger;
}

export function aiShot(
  dl: Delivery,
  previous: Delivery | null,
  cfg: BatterCfg,
  field: FieldCfg,
  aggression: number,
  random: () => number,
): ShotInput {
  const at = ballAt(dl, arrival(dl, 0));
  if (Math.abs(at.x) > 0.55 && !hitsStumps(dl) && random() < 0.6)
    return { swingAt: null, dir: 0, lofted: false };
  const g = Math.sqrt(-2 * Math.log(Math.max(1e-9, random()))) * Math.cos(2 * Math.PI * random());
  const q = cfg.skill - deliveryDanger(dl, previous) * 0.55 + g * 0.22;
  const err = Math.max(0, 1 - q) * field.window * (random() < 0.5 ? -1 : 1);
  const tc = arrival(dl, CONTACT_D);
  const dir: -1 | 0 | 1 =
    at.x > 0.2 ? 1 : at.x < -0.05 ? -1 : random() < 0.5 ? 0 : random() < 0.5 ? -1 : 1;
  const lofted = random() < aggression * (dl.length > 7 || dl.kind === 'spin' ? 1.2 : 0.7);
  return { swingAt: tc - SWING_TIME + err, dir, lofted };
}

// ——— Innings ———

export interface Innings {
  runs: number;
  wickets: number;
  balls: number;
  maxBalls: number;
  maxWickets: number;
  fours: number;
  sixes: number;
  /** One symbol per delivery: 0–6, W, wd. */
  log: string[];
  target: number | null;
}

export function newInnings(overs: number, wickets: number, target: number | null = null): Innings {
  return {
    runs: 0,
    wickets: 0,
    balls: 0,
    maxBalls: overs * 6,
    maxWickets: wickets,
    fours: 0,
    sixes: 0,
    log: [],
    target,
  };
}

export function addOutcome(inn: Innings, o: Outcome) {
  inn.runs += o.runs + o.extras;
  if (!o.rebowl) inn.balls += 1;
  if (o.out) inn.wickets += 1;
  if (o.runs === 4) inn.fours += 1;
  if (o.runs === 6) inn.sixes += 1;
  inn.log.push(o.out ? 'W' : o.rebowl ? 'wd' : String(o.runs));
}

export function inningsOver(inn: Innings): boolean {
  return (
    inn.balls >= inn.maxBalls ||
    inn.wickets >= inn.maxWickets ||
    (inn.target !== null && inn.runs >= inn.target)
  );
}

export const oversText = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;
