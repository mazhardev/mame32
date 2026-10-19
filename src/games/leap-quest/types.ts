import type { BaseState } from '../_shared/arcade/kit';
import type { Spark } from '../_shared/arcade/draw';
import type { DifficultySetting } from '@/types';
import type { BossKind, EnemyKind, LevelData } from './levels';
import type { Player } from './player';

export type Phase = 'intro' | 'play' | 'dying' | 'goal' | 'tally';

export interface Enemy {
  kind: EnemyKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  dir: number;
  /** walk · shell · slide · flat · dead · hang · swoop */
  state: 'walk' | 'shell' | 'slide' | 'flat' | 'dead' | 'hang' | 'swoop';
  timer: number;
  /** Spawn x (bees patrol around it) and spawn y (bees bob around it). */
  homeX: number;
  homeY: number;
  /** Enemies knocked out by one sliding shell (for chain scores). */
  chain: number;
  /** Grace period after a shell is kicked, so it cannot hurt the kicker. */
  grace: number;
}

export type ItemKind = 'berry' | 'pepper' | 'feather' | 'life';

export interface Item {
  kind: ItemKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  dir: number;
  /** Seconds left rising out of its block. */
  emerge: number;
}

export type ShotKind = 'spark' | 'acorn' | 'shard' | 'feather' | 'rock' | 'lava';

export interface Shot {
  kind: ShotKind;
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  life: number;
}

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
  /** Invulnerable flash after a hit. */
  hurt: number;
  /** Seconds since defeat (0 while alive). */
  dying: number;
  /** Number of attacks performed in the current pattern. */
  count: number;
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  life: number;
  color: string;
}

export interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  kind: 'brick' | 'gem' | 'rock';
  spin: number;
}

export interface Stats {
  stomps: number;
  bestChain: number;
  shellChain: number;
  levelsCleared: number;
  bosses: number;
  hitsThisLevel: number;
  flawless: number;
  gemsCollected: number;
}

export interface State extends BaseState {
  difficulty: DifficultySetting;
  levelIndex: number;
  startLevel: number;
  level: LevelData;
  /** Mutable copy of the level's tiles (bricks break, gifts empty). */
  grid: string[];
  phase: Phase;
  phaseTime: number;
  player: Player;
  power: 'none' | 'spark';
  /** Invulnerability after being hit. */
  invuln: number;
  /** Rainbow-feather invincibility. */
  star: number;
  lives: number;
  gems: number;
  timeLeft: number;
  /** Seconds since the level (attempt) began; drives platforms and wheels. */
  levelTime: number;
  respawn: { x: number; y: number } | null;
  enemies: Enemy[];
  items: Item[];
  sparks: Shot[];
  hostile: Shot[];
  popups: Popup[];
  bumps: { c: number; r: number; t: number }[];
  debris: Debris[];
  particles: Spark[];
  camera: number;
  arenaLocked: boolean;
  boss: Boss | null;
  /** The star key that appears when a boss is beaten. */
  orb: { x: number; y: number } | null;
  /** Stomps since Pip last touched the ground. */
  stompChain: number;
  /** Gems left in multi-gem bricks, by tile index. */
  gemBricks: Record<number, number>;
  /** Next cannon shot time, by tile index. */
  cannons: Record<number, number>;
  shake: number;
  won: boolean;
  /** Bonus awarded at the goal pole, for the tally screen. */
  poleBonus: number;
  /** Banner text shown over the play field. */
  banner: { text: string; sub: string; time: number } | null;
  stats: Stats;
  /** Set when the player has pressed fire this frame (edge). */
  prevBottom: number;
}
