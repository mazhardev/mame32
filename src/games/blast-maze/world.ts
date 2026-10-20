import type { DifficultySetting } from '@/types';
import type { BaseState } from '../_shared/arcade/kit';
import type { Spark } from '../_shared/arcade/draw';
import { FLOOR, SOFT, WALL, cell, mid, tileX } from './maze';
import type { EnemyKind, ItemKind, StagePlan } from './stages';

/** Blast Maze world state and the small helpers shared by the rules and the AI. */
export type Mode = 'adventure' | 'battle';

export const FUSE = 2.4;
export const FLAME_T = 0.55;
export const CRUMBLE_T = 0.4;
export const REMOTE_T = 1e9;
export const MAX_BOMBS = 8;
export const MAX_FIRE = 8;
export const MAX_SPEED = 4;

export interface AiMemory {
  /** Seconds until the next goal decision. */
  think: number;
  goalDir: number;
  /** Seconds the bot waits before it may drop another bomb. */
  bombCool: number;
  /** Tile it last decided from; reaching a new tile prompts a fresh decision. */
  tile: number;
}

export interface Bomber {
  id: number;
  x: number;
  y: number;
  dir: number;
  moving: boolean;
  bombs: number;
  fire: number;
  speed: number;
  remote: boolean;
  kick: boolean;
  pass: boolean;
  bombPass: boolean;
  /** Seconds of invincibility left (vest, or after appearing). */
  vest: number;
  alive: boolean;
  deadT: number;
  cpu: boolean;
  anim: number;
  wins: number;
  kills: number;
  ai: AiMemory;
}

export interface Bomb {
  c: number;
  r: number;
  x: number;
  y: number;
  t: number;
  fire: number;
  /** Bomber id, or -1 for a boss's bomb. */
  owner: number;
  remote: boolean;
  /** Bombers still standing on the bomb since it was placed. */
  pass: number[];
  /** Direction it slides after a kick, or -1. */
  kick: number;
}

export interface Flame {
  c: number;
  r: number;
  t: number;
  dir: number;
  end: boolean;
  owner: number;
  boom: number;
}

export interface Enemy {
  kind: EnemyKind;
  x: number;
  y: number;
  tc: number;
  tr: number;
  dir: number;
  alive: boolean;
  deadT: number;
  anim: number;
}

export interface Boss {
  kind: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  invuln: number;
  t: number;
  spawn: number;
  /** 0 invisible … 1 fully visible (the phantom fades). */
  vis: number;
  state: number;
  alive: boolean;
  deadT: number;
}

export interface Drop {
  c: number;
  r: number;
  kind: ItemKind;
  /** Seconds while the block that hid it crumbles; flames cannot burn it yet. */
  safe: number;
}

export type Phase = 'intro' | 'play' | 'dying' | 'clear' | 'roundEnd' | 'done';

export interface State extends BaseState {
  mode: Mode;
  difficulty: DifficultySetting;
  plan: StagePlan;
  stage: number;
  grid: Uint8Array;
  hidden: Int8Array;
  /** Tiles turned into walls by sudden death. */
  pressure: Uint8Array;
  exit: { i: number; revealed: boolean; open: boolean; safe: number } | null;
  drops: Drop[];
  crumbles: { c: number; r: number; t: number }[];
  bombers: Bomber[];
  bombs: Bomb[];
  flames: Flame[];
  burning: Uint8Array;
  enemies: Enemy[];
  boss: Boss | null;
  phase: Phase;
  phaseT: number;
  clock: number;
  hurried: boolean;
  penaltyT: number;
  lives: number;
  boomId: number;
  booms: Record<number, number>;
  pops: { x: number; y: number; t: number; text: string }[];
  sparks: Spark[];
  shake: number;
  round: number;
  spiral: number[];
  spiralT: number;
  roundWinner: number;
  /** Seconds left before a battle round with one bomber standing is decided. */
  endT: number;
  won: boolean;
  reached: number;
  nextLife: number;
  stats: { bestChain: number; bosses: number; cleared: number; deaths: number; maxFire: number; roundsWon: number; matchWon: boolean };
}

export const speedOf = (b: Bomber) => 54 + 11 * b.speed;

export function bombAt(s: State, c: number, r: number): Bomb | undefined {
  for (const b of s.bombs) if (b.c === c && b.r === r) return b;
  return undefined;
}

export function activeBombs(s: State, id: number): number {
  let n = 0;
  for (const b of s.bombs) if (b.owner === id) n++;
  return n;
}

/** Tiles a bomber may not walk into. */
export function blockedFor(s: State, b: Bomber) {
  return (c: number, r: number): boolean => {
    const v = cell(s.grid, c, r);
    if (v === WALL) return true;
    if (v === SOFT && !b.pass) return true;
    const bomb = bombAt(s, c, r);
    return !!bomb && !b.bombPass && !bomb.pass.includes(b.id);
  };
}

export const tileOf = (p: { x: number; y: number }) => [tileX(p.x), tileX(p.y)] as const;

export function overlapsTile(p: { x: number; y: number }, c: number, r: number): boolean {
  return Math.abs(p.x - mid(c)) < 15 && Math.abs(p.y - mid(r)) < 15;
}

export const isFloor = (s: State, c: number, r: number) => cell(s.grid, c, r) === FLOOR;
