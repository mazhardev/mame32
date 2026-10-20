import type { SoundName } from '@/services/audio';

/**
 * Dojo Duel move data. Everything runs in frames at 60 per second; distances
 * are logical pixels with x measured in the direction the fighter faces and
 * y up from the floor. A move has startup, active and recovery frames; its
 * hitbox can only hit during the active frames.
 */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How a hit must be blocked: high and mid either way, low crouching, overheads standing; grabs cannot be blocked. */
export type Level = 'high' | 'mid' | 'low' | 'over' | 'grab';

export type Pose =
  | 'punch'
  | 'kick'
  | 'cpunch'
  | 'ckick'
  | 'jpunch'
  | 'jkick'
  | 'throw'
  | 'push'
  | 'rise'
  | 'rush'
  | 'spin'
  | 'grab'
  | 'vanish'
  | 'dive'
  | 'slide'
  | 'stomp'
  | 'burst'
  | 'hammer'
  | 'flurry';

export type ProjKind = 'orb' | 'star' | 'wave' | 'spark' | 'dark' | 'storm';

export interface ProjDef {
  kind: ProjKind;
  speed: number;
  dmg: number;
  stun: number;
  block: number;
  w: number;
  h: number;
  /** Height of the projectile's centre above the floor. */
  y: number;
  life: number;
  hits: number;
  low?: boolean;
}

export interface Move {
  name: string;
  startup: number;
  active: number;
  recovery: number;
  dmg: number;
  /** Frames of hitstun and blockstun caused. */
  stun: number;
  block: number;
  box: Box | null;
  level: Level;
  /** Pushback on hit or block. */
  push: number;
  pose: Pose;
  /** Knocks down on hit. */
  kd?: boolean;
  /** Hits up to this many times during its active frames, every `every` frames. */
  hits?: number;
  every?: number;
  /** A normal that can be cancelled into a special once it connects. */
  cancel?: boolean;
  /** A light attack that can chain into another light attack once it connects. */
  chain?: boolean;
  /** Forward speed (px/frame) between frames `move[1]` and `move[2]` of the move. */
  move?: [number, number, number];
  /** Upward speed given on the first active frame (rising attacks). */
  lift?: number;
  /** Frames of invulnerability from the start of the move. */
  invuln?: number;
  proj?: ProjDef;
  /** Share of the damage dealt even when blocked. */
  chip?: number;
  /** Grabs reach this far beyond the two bodies touching. */
  range?: number;
  /** Reappears behind the opponent on the first active frame. */
  teleport?: boolean;
  /** Only in the air; the move ends on landing. */
  air?: boolean;
  /** Supers: costs the full meter, with a freeze-frame flash first. */
  super?: boolean;
  sound?: SoundName;
}

export type Normal = 'sP' | 'sK' | 'cP' | 'cK' | 'jP' | 'jK' | 'throw';

/** The shared normal attacks, stretched by a fighter's reach and power. */
export function normals(reach: number, power: number, staff = false): Record<Normal, Move> {
  const r = (n: number) => Math.round(n * reach);
  const d = (n: number) => Math.round(n * power);
  const extra = staff ? 14 : 0;
  return {
    sP: {
      name: 'Jab',
      startup: 4,
      active: 3,
      recovery: 8,
      dmg: d(40),
      stun: 15,
      block: 10,
      box: { x: 12, y: 54, w: r(34) + extra, h: 14 },
      level: 'high',
      push: 6,
      pose: 'punch',
      cancel: true,
      chain: true,
      sound: 'hit',
    },
    sK: {
      name: 'Kick',
      startup: 7,
      active: 4,
      recovery: 15,
      dmg: d(70),
      stun: 19,
      block: 13,
      box: { x: 12, y: 32, w: r(48) + extra, h: 18 },
      level: 'mid',
      push: 10,
      pose: 'kick',
      cancel: true,
      sound: 'hit',
    },
    cP: {
      name: 'Low jab',
      startup: 4,
      active: 3,
      recovery: 7,
      dmg: d(30),
      stun: 14,
      block: 9,
      box: { x: 12, y: 28, w: r(32) + extra, h: 14 },
      level: 'mid',
      push: 6,
      pose: 'cpunch',
      cancel: true,
      chain: true,
      sound: 'hit',
    },
    cK: {
      name: 'Low kick',
      startup: 6,
      active: 4,
      recovery: 17,
      dmg: d(55),
      stun: 17,
      block: 12,
      box: { x: 12, y: 0, w: r(52) + extra, h: 15 },
      level: 'low',
      push: 9,
      pose: 'ckick',
      cancel: true,
      sound: 'hit',
    },
    jP: {
      name: 'Jumping punch',
      startup: 4,
      active: 9,
      recovery: 3,
      dmg: d(50),
      stun: 17,
      block: 12,
      box: { x: 6, y: 26, w: r(32) + extra, h: 20 },
      level: 'over',
      push: 5,
      pose: 'jpunch',
      air: true,
      sound: 'hit',
    },
    jK: {
      name: 'Jumping kick',
      startup: 5,
      active: 11,
      recovery: 3,
      dmg: d(75),
      stun: 19,
      block: 14,
      box: { x: 8, y: 0, w: r(40) + extra, h: 24 },
      level: 'over',
      push: 6,
      pose: 'jkick',
      air: true,
      sound: 'hit',
    },
    throw: {
      name: 'Throw',
      startup: 3,
      active: 2,
      recovery: 22,
      dmg: d(120),
      stun: 0,
      block: 0,
      box: null,
      level: 'grab',
      push: 0,
      pose: 'throw',
      kd: true,
      range: 12,
      sound: 'hit',
    },
  };
}

/* ------------------------------------------------- special-move templates */
export function projectile(name: string, kind: ProjKind, o: Partial<ProjDef> = {}, m: Partial<Move> = {}): Move {
  return {
    name,
    startup: 12,
    active: 2,
    recovery: 24,
    dmg: 0,
    stun: 0,
    block: 0,
    box: null,
    level: 'mid',
    push: 0,
    pose: 'push',
    chip: 0.2,
    sound: 'shoot',
    proj: { kind, speed: 4.4, dmg: 70, stun: 22, block: 15, w: 26, h: 22, y: 54, life: 150, hits: 1, ...o },
    ...m,
  };
}

export function rush(name: string, m: Partial<Move> = {}): Move {
  return {
    name,
    startup: 8,
    active: 14,
    recovery: 18,
    dmg: 90,
    stun: 22,
    block: 16,
    box: { x: 10, y: 42, w: 38, h: 22 },
    level: 'mid',
    push: 14,
    pose: 'rush',
    kd: true,
    move: [6, 6, 22],
    chip: 0.2,
    sound: 'whoosh',
    ...m,
  };
}

export function rising(name: string, m: Partial<Move> = {}): Move {
  return {
    name,
    startup: 3,
    active: 14,
    recovery: 24,
    dmg: 110,
    stun: 24,
    block: 18,
    box: { x: 2, y: 54, w: 32, h: 52 },
    level: 'mid',
    push: 8,
    pose: 'rise',
    kd: true,
    lift: 9.6,
    move: [1.6, 3, 16],
    invuln: 7,
    chip: 0.2,
    sound: 'whoosh',
    ...m,
  };
}

export function spin(name: string, m: Partial<Move> = {}): Move {
  return {
    name,
    startup: 8,
    active: 30,
    recovery: 14,
    dmg: 34,
    stun: 18,
    block: 12,
    box: { x: -30, y: 38, w: 74, h: 22 },
    level: 'mid',
    push: 5,
    pose: 'spin',
    hits: 3,
    every: 10,
    move: [3, 8, 38],
    chip: 0.2,
    sound: 'whoosh',
    ...m,
  };
}

export function grab(name: string, m: Partial<Move> = {}): Move {
  return {
    name,
    startup: 4,
    active: 3,
    recovery: 32,
    dmg: 180,
    stun: 0,
    block: 0,
    box: null,
    level: 'grab',
    push: 0,
    pose: 'grab',
    kd: true,
    range: 30,
    sound: 'hit',
    ...m,
  };
}

export function vanish(name: string, m: Partial<Move> = {}): Move {
  return {
    name,
    startup: 12,
    active: 1,
    recovery: 14,
    dmg: 0,
    stun: 0,
    block: 0,
    box: null,
    level: 'mid',
    push: 0,
    pose: 'vanish',
    teleport: true,
    invuln: 20,
    sound: 'whoosh',
    ...m,
  };
}

export function dive(name: string, m: Partial<Move> = {}): Move {
  return {
    name,
    startup: 3,
    active: 40,
    recovery: 10,
    dmg: 80,
    stun: 20,
    block: 14,
    box: { x: 6, y: -4, w: 34, h: 26 },
    level: 'over',
    push: 8,
    pose: 'dive',
    air: true,
    chip: 0.2,
    sound: 'whoosh',
    ...m,
  };
}

export function slide(name: string, m: Partial<Move> = {}): Move {
  return {
    name,
    startup: 6,
    active: 16,
    recovery: 18,
    dmg: 80,
    stun: 20,
    block: 14,
    box: { x: 8, y: 0, w: 48, h: 16 },
    level: 'low',
    push: 10,
    pose: 'slide',
    kd: true,
    move: [5.4, 6, 22],
    chip: 0.2,
    sound: 'whoosh',
    ...m,
  };
}

export function burst(name: string, m: Partial<Move> = {}): Move {
  return {
    name,
    startup: 6,
    active: 8,
    recovery: 26,
    dmg: 90,
    stun: 22,
    block: 16,
    box: { x: -38, y: 0, w: 76, h: 92 },
    level: 'mid',
    push: 16,
    pose: 'burst',
    kd: true,
    invuln: 10,
    chip: 0.25,
    sound: 'explosion',
    ...m,
  };
}

export function hammer(name: string, m: Partial<Move> = {}): Move {
  return {
    name,
    startup: 16,
    active: 6,
    recovery: 16,
    dmg: 85,
    stun: 22,
    block: 14,
    box: { x: 8, y: 8, w: 40, h: 44 },
    level: 'over',
    push: 10,
    pose: 'hammer',
    move: [3.2, 0, 22],
    chip: 0.2,
    sound: 'whoosh',
    ...m,
  };
}

export function stomp(name: string, m: Partial<Move> = {}): Move {
  return projectile(name, 'wave', { speed: 3.6, dmg: 75, y: 8, h: 16, w: 30, low: true, life: 120 }, { pose: 'stomp', startup: 14, recovery: 22, sound: 'explosion', ...m });
}

/** Frame totals for a move. */
export const moveLength = (m: Move) => m.startup + m.active + m.recovery;
