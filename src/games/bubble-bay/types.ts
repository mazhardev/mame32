import type { DifficultySetting } from '@/types';
import type { Mob } from '../_shared/arena/actors';
import type { ArenaCore } from '../_shared/arena/flow';

export type CritterKind = 'crab' | 'puffer' | 'jelly' | 'squid' | 'eel';

/**
 * spawn   — swimming into place (harmless)
 * live    — about, dangerous to touch
 * trapped — inside a bubble (the bubble carries it)
 * out     — popped free and tumbling off to become treasure
 */
export type CritterState = 'spawn' | 'live' | 'trapped' | 'out';

export interface Critter extends Mob {
  kind: CritterKind;
  state: CritterState;
  /** Escaped from a bubble, or the level is running long: faster and red. */
  angry: boolean;
  timer: number;
  fireCD: number;
  spin: number;
  /** Size of the chain that popped it (better treasure for bigger chains). */
  chain: number;
  /** Animation offset, so critters do not all wiggle in step. */
  seed: number;
}

export interface Bubble {
  /** Centre. */
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  /** shoot: just blown, can trap · float: drifting up · pop: about to burst in a chain · gone: removed */
  state: 'shoot' | 'float' | 'pop' | 'gone';
  age: number;
  life: number;
  critter: Critter | null;
  /** Counting down to a chain pop. */
  popDelay: number;
  chainId: number;
  /** Phase of its bobbing. */
  wob: number;
}

export interface Ink {
  /** A squid's ink blob, or a shell thrown by King Crab. */
  kind: 'ink' | 'shell';
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  life: number;
}

export type BossKind = 'crab' | 'ray' | 'kraken';

export interface Boss {
  kind: BossKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  /** move · trapped (beaten, floating in a giant bubble) · popped */
  state: 'move' | 'trapped' | 'popped';
  hurt: number;
  attackCD: number;
  summonCD: number;
  /** Horizontal beam: seconds of warning, then seconds of zap. */
  beam: { y: number; warn: number; life: number } | null;
  t: number;
}

export interface Powers {
  /** Bubbles travel further. */
  range: boolean;
  /** Bubbles come faster. */
  rapid: boolean;
  speed: boolean;
  /** Seconds of invincibility left. */
  shield: number;
}

export interface Stats {
  bestChain: number;
  bounces: number;
  bestBounces: number;
  treasures: number;
  bosses: number;
  levelsCleared: number;
}

export interface State extends ArenaCore {
  difficulty: DifficultySetting;
  startLevel: number;
  critters: Critter[];
  bubbles: Bubble[];
  inks: Ink[];
  boss: Boss | null;
  powers: Powers;
  fireCD: number;
  /** Seconds since a bubble was blown (Ollie puffs his cheeks). */
  blow: number;
  /** Chain counters by chain id. */
  chains: Record<number, number>;
  nextChain: number;
  shake: number;
  /** Where Ollie was when the level was cleared (he floats from there to the next start). */
  carry: { x: number; y: number } | null;
  stats: Stats;
}
