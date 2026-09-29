import type { SoundName } from '@/services/audio';
import type { DifficultySetting } from '@/types';
import type { GameOverPayload } from '@/game-engine/context';
import type { HudItem } from '@/components/game/GameHud';

/**
 * Shared contract for real-time canvas games. A game is a set of pure-ish
 * functions over a plain state object, which keeps the rules testable
 * without a browser: create the world, advance it by dt with an input
 * snapshot, draw it, and describe the HUD and the result.
 */
export type Action = 'left' | 'right' | 'up' | 'down' | 'action' | 'action2';

export interface Pointer {
  x: number;
  y: number;
  /** Button or finger currently down. */
  down: boolean;
  /** Went down / up since the previous update. */
  pressed: boolean;
  released: boolean;
  /** The pointer has been over the canvas at least once. */
  active: boolean;
}

export interface Input {
  held: Set<Action>;
  /** Actions that started since the previous update (edge-triggered). */
  pressed: Set<Action>;
  /** Raw keys from the spec's customKeys pressed since the previous update. */
  keys: Set<string>;
  /** customKeys currently held down (e.g. a second player's controls). */
  keysHeld: Set<string>;
  pointer: Pointer;
}

/** Every arcade state carries these fields. */
export interface BaseState {
  score: number;
  over: boolean;
  /** Sounds requested during the last update; the runner plays and clears them. */
  events: SoundName[];
  /** Seconds since the round started. */
  time: number;
}

export interface TouchLayout {
  /** Direction controls shown on touch screens. */
  pad?: 'dpad' | 'horizontal' | 'vertical' | 'none';
  buttons?: { action: Action; label: string }[];
}

export interface ArcadeSpec<S extends BaseState> {
  width: number;
  height: number;
  create: (difficulty: DifficultySetting, random: () => number) => S;
  update: (s: S, dt: number, input: Input, random: () => number) => void;
  render: (ctx: CanvasRenderingContext2D, s: S) => void;
  hud: (s: S) => HudItem[];
  result: (s: S) => GameOverPayload;
  /** Called once when the round ends: report achievements here. */
  onEnd?: (s: S, difficulty: DifficultySetting) => void;
  touch?: TouchLayout;
  /** Shown on the start overlay. */
  startHint: string;
  /** Keys that move or act; defaults cover arrows, WASD, Space and Enter. */
  keys?: Record<string, Action>;
  /** Start as soon as the pointer is pressed on the canvas (default true). */
  pointerStarts?: boolean;
  /** Extra keys delivered raw through input.keys / keysHeld (e.g. '1'–'9'); letters in lower case. */
  customKeys?: string[];
}

export const DEFAULT_KEYS: Record<string, Action> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  a: 'left',
  A: 'left',
  d: 'right',
  D: 'right',
  w: 'up',
  W: 'up',
  s: 'down',
  S: 'down',
  ' ': 'action',
  Enter: 'action',
  x: 'action2',
  X: 'action2',
  Shift: 'action2',
};

export function emptyInput(): Input {
  return {
    held: new Set(),
    pressed: new Set(),
    keys: new Set(),
    keysHeld: new Set(),
    pointer: { x: 0, y: 0, down: false, pressed: false, released: false, active: false },
  };
}

/** Test helper: an input with some actions held and/or just pressed. */
export function inputWith(held: Action[] = [], pressed: Action[] = [], pointer: Partial<Pointer> = {}): Input {
  const input = emptyInput();
  held.forEach((a) => input.held.add(a));
  pressed.forEach((a) => {
    input.pressed.add(a);
    input.held.add(a);
  });
  Object.assign(input.pointer, pointer);
  return input;
}

/** Test helper: run a game for `seconds` in fixed steps with a constant input. */
export function simulate<S extends BaseState>(
  spec: Pick<ArcadeSpec<S>, 'update'>,
  s: S,
  seconds: number,
  input: Input = emptyInput(),
  random: () => number = Math.random,
  step = 1 / 60,
): S {
  for (let t = 0; t < seconds && !s.over; t += step) {
    // Mirrors ArcadeGame: the runner advances the clock before each update.
    s.time += step;
    spec.update(s, step, input, random);
    input.pressed.clear();
    input.keys.clear();
    input.pointer.pressed = false;
    input.pointer.released = false;
  }
  return s;
}

export function baseState(): BaseState {
  return { score: 0, over: false, events: [], time: 0 };
}

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function circleHit(ax: number, ay: number, ar: number, bx: number, by: number, br: number): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy <= (ar + br) * (ar + br);
}

export function rectHit(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function circleRectHit(cx: number, cy: number, r: number, rect: { x: number; y: number; w: number; h: number }): boolean {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r;
}
