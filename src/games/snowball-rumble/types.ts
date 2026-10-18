import type { DifficultySetting } from '@/types';
import type { Mob } from '../_shared/arena/actors';
import type { ArenaCore } from '../_shared/arena/flow';

export type FoeKind = 'goblin' | 'hopper' | 'imp' | 'bat';

/**
 * spawn — popping into the room (harmless)
 * live  — about; with any snow on it, it is stuck and harmless
 * ball  — packed into a full snowball: push it, or hit it to send it rolling
 * roll  — a rolling snowball, knocking out everything in its way
 * out   — knocked out, tumbling off before turning into a treat
 */
export type FoeState = 'spawn' | 'live' | 'ball' | 'roll' | 'out';

export interface Foe extends Mob {
  kind: FoeKind;
  state: FoeState;
  /** 0–4 layers of snow; 4 is a full snowball. */
  snow: number;
  /** Seconds until a layer of snow melts off. */
  melt: number;
  timer: number;
  /** Wall bounces of a rolling snowball. */
  bounces: number;
  /** Enemies knocked out by this rolling snowball. */
  chain: number;
  fireCD: number;
  spin: number;
}

export interface Shot {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  life: number;
  power: number;
}

export interface Fire {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  life: number;
}

export type BossKind = 'troll' | 'djinn' | 'king';

export interface Boss {
  kind: BossKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  dir: number;
  hp: number;
  maxHp: number;
  state: string;
  timer: number;
  hurt: number;
  dying: number;
  spawnCD: number;
  attackCD: number;
}

export interface Bolt {
  x: number;
  /** Seconds of warning left before it strikes. */
  warn: number;
  /** Seconds the strike lasts. */
  life: number;
}

export interface Potions {
  speed: boolean;
  power: boolean;
  range: boolean;
  /** Seconds of invincibility left. */
  shield: number;
}

export interface Stats {
  frozen: number;
  bestChain: number;
  bosses: number;
  potionKinds: string[];
  floorsCleared: number;
}

export interface State extends ArenaCore {
  difficulty: DifficultySetting;
  startFloor: number;
  foes: Foe[];
  shots: Shot[];
  fires: Fire[];
  bolts: Bolt[];
  boss: Boss | null;
  potions: Potions;
  fireCD: number;
  shake: number;
  stats: Stats;
}
