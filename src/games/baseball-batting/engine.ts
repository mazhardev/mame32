import type { DifficultySetting } from '@/types';

/**
 * Pitches, contact and batted-ball flight for a home run derby. Depth d runs
 * from home plate (0) to the mound (18.4 m); x is sideways (positive towards
 * first base) and z is height. The strike zone spans the plate's width and
 * roughly knee to chest height.
 */
export const MOUND = 18.4;
export const RELEASE = { x: 0.35, z: 1.8 };
export const ZONE = { x0: -0.25, x1: 0.25, z0: 0.48, z1: 1.08 };
/** Seconds from starting the swing until the bat reaches the plate. */
export const SWING = 0.13;
const SWEET_BELOW = 0.04;

export type PitchKind = 'fastball' | 'changeup' | 'curveball' | 'slider';

export interface Pitch {
  kind: PitchKind;
  speed: number;
  /** Where it crosses the plate. */
  x: number;
  z: number;
  /** Late sideways and downward break (m), included in the crossing point. */
  breakX: number;
  breakZ: number;
}

export const flightTime = (p: Pitch) => MOUND / p.speed;

/** Ball position t seconds after release. Breaking balls bend late. */
export function pitchAt(p: Pitch, t: number) {
  const u = Math.min(1.2, t / flightTime(p));
  const late = u * u;
  return {
    d: MOUND * (1 - u),
    x: RELEASE.x + (p.x - p.breakX - RELEASE.x) * u + p.breakX * late,
    z: RELEASE.z + (p.z + p.breakZ - RELEASE.z) * u - p.breakZ * late + 0.35 * u * (1 - u),
  };
}

export const inZone = (p: Pitch) =>
  p.x >= ZONE.x0 && p.x <= ZONE.x1 && p.z >= ZONE.z0 && p.z <= ZONE.z1;

interface PitcherCfg {
  speed: [number, number];
  mix: PitchKind[];
  /** Chance a pitch is in the zone. */
  strikes: number;
  window: number;
}

export const PITCHER: Record<DifficultySetting, PitcherCfg> = {
  easy: { speed: [29, 33], mix: ['fastball', 'fastball', 'changeup'], strikes: 0.85, window: 0.11 },
  normal: {
    speed: [33, 37],
    mix: ['fastball', 'fastball', 'changeup', 'curveball', 'slider'],
    strikes: 0.72,
    window: 0.09,
  },
  hard: {
    speed: [37, 41],
    mix: ['fastball', 'changeup', 'curveball', 'slider', 'slider'],
    strikes: 0.62,
    window: 0.075,
  },
};

export function makePitch(d: DifficultySetting, random: () => number): Pitch {
  const cfg = PITCHER[d];
  const kind = cfg.mix[Math.floor(random() * cfg.mix.length)];
  const fast = cfg.speed[0] + random() * (cfg.speed[1] - cfg.speed[0]);
  const speed = kind === 'fastball' ? fast : kind === 'slider' ? fast * 0.88 : fast * 0.8;
  const inside = random() < cfg.strikes;
  const x = inside
    ? ZONE.x0 + 0.04 + random() * (ZONE.x1 - ZONE.x0 - 0.08)
    : (random() < 0.5 ? -1 : 1) * (0.32 + random() * 0.2);
  const z = inside
    ? ZONE.z0 + 0.04 + random() * (ZONE.z1 - ZONE.z0 - 0.08)
    : random() < 0.5
      ? 0.25 + random() * 0.15
      : 1.2 + random() * 0.2;
  const breakX = kind === 'slider' ? 0.28 : kind === 'curveball' ? 0.12 : 0;
  const breakZ = kind === 'curveball' ? 0.35 : kind === 'changeup' ? 0.1 : 0;
  return { kind, speed, x, z, breakX, breakZ };
}

export interface Swing {
  /** Time the swing started (since release). */
  at: number;
  /** Where the batter aimed the bat in the plate plane. */
  x: number;
  z: number;
}

export type Contact =
  | { kind: 'miss' }
  | { kind: 'foul'; spray: number }
  | {
      kind: 'fair';
      distance: number;
      spray: number;
      angle: number;
      exitSpeed: number;
      homer: boolean;
      quality: number;
    };

export const fenceAt = (spray: number) => 100 + 18 * Math.cos(spray * 2);

/**
 * Contact model. Timing (early pulls, late pushes) and how far the bat's
 * sweet spot was from the ball decide the exit speed, launch angle and
 * direction. Undercutting the ball lifts it; topping it drives it down.
 */
export function contact(p: Pitch, s: Swing, window: number): Contact {
  const timing = s.at + SWING - flightTime(p);
  const dx = s.x - p.x;
  // The sweet spot is a few centimetres under the ball's centre: that is what lifts it.
  const dz = s.z - p.z + SWEET_BELOW;
  const dist = Math.hypot(dx, dz * 1.3);
  if (Math.abs(timing) > window || dist > 0.17) return { kind: 'miss' };
  const q = (1 - Math.abs(timing) / window) * (1 - dist / 0.17);
  const spray = Math.max(-1.2, Math.min(1.2, -timing * 9 + dx * 1.5));
  if (Math.abs(spray) > Math.PI / 4 || q < 0.12) return { kind: 'foul', spray };
  const exitSpeed = 26 + q * 26;
  const angle = Math.max(-0.25, Math.min(1.05, 0.5 - dz * 5));
  const distance =
    angle <= 0
      ? 15 + exitSpeed * 0.8
      : ((exitSpeed * exitSpeed * Math.sin(2 * angle)) / 9.81) * 0.62;
  return {
    kind: 'fair',
    distance,
    spray,
    angle,
    exitSpeed,
    homer: distance > fenceAt(spray),
    quality: q,
  };
}
