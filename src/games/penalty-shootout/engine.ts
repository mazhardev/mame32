import type { DifficultySetting } from '@/types';
import type { Vec2 } from '@/utils/collision';
import { createRng } from '@/utils/random';
import type { Rng } from '@/utils/random';
import { OscillatingMeter } from '../_shared/sports/physics';

export const WIDTH = 640;
export const HEIGHT = 400;
export const GOAL = { left: 170, right: 470, top: 90, bottom: 230 };
export const SPOT: Vec2 = { x: 320, y: 360 };
export const BALL_R = 10;
/** Shots this close to both a post and the bar cannot be reached by a keeper. */
const CORNER_X = 42;
const CORNER_Y = 32;
/** Meter value that produces a perfectly accurate shot. */
export const SWEET_SPOT = 0.7;
export const REGULATION_KICKS = 5;
export const MAX_KICKS = 10;

export type Column = -1 | 0 | 1;
export type Turn = 'shoot' | 'keep';
export type Phase = 'aim' | 'power' | 'windup' | 'flight' | 'result' | 'over';
export type KickOutcome = 'goal' | 'saved' | 'missed';
export type ShootoutEvent = 'kick' | 'goal' | 'save' | 'miss' | 'turn' | 'end';

export interface PenaltyConfig {
  meterSpeed: number;
  /** Pixels of scatter per unit of timing error on the power meter. */
  scatter: number;
  /** Chance the computer keeper reads your side correctly. */
  keeperRead: number;
  /** Chance a computer kick goes wide or over. */
  cpuMissChance: number;
  /** Seconds between the computer's kick and the ball reaching the goal. */
  cpuFlightTime: number;
  /** Chance the computer kicker switches sides after you commit early. */
  cpuAdapt: number;
}

export const DIFFICULTY_CONFIG: Record<DifficultySetting, PenaltyConfig> = {
  easy: {
    meterSpeed: 0.9,
    scatter: 150,
    keeperRead: 0.15,
    cpuMissChance: 0.25,
    cpuFlightTime: 0.95,
    cpuAdapt: 0,
  },
  normal: {
    meterSpeed: 1.3,
    scatter: 230,
    keeperRead: 0.3,
    cpuMissChance: 0.15,
    cpuFlightTime: 0.7,
    cpuAdapt: 0.35,
  },
  hard: {
    meterSpeed: 1.8,
    scatter: 320,
    keeperRead: 0.45,
    cpuMissChance: 0.08,
    cpuFlightTime: 0.5,
    cpuAdapt: 0.7,
  },
};

export interface Kick {
  by: 'player' | 'cpu';
  outcome: KickOutcome;
}

export function columnOf(x: number): Column {
  const third = (GOAL.right - GOAL.left) / 3;
  if (x < GOAL.left + third) return -1;
  if (x > GOAL.right - third) return 1;
  return 0;
}

export function isOnTarget(p: Vec2): boolean {
  return (
    p.x > GOAL.left + BALL_R &&
    p.x < GOAL.right - BALL_R &&
    p.y > GOAL.top + BALL_R &&
    p.y <= GOAL.bottom
  );
}

/** True for the top corners, which no keeper can reach. */
export function isTopCorner(p: Vec2): boolean {
  const nearPost = p.x - GOAL.left < CORNER_X || GOAL.right - p.x < CORNER_X;
  return nearPost && p.y - GOAL.top < CORNER_Y;
}

export function isSaved(p: Vec2, keeperCol: Column): boolean {
  return isOnTarget(p) && !isTopCorner(p) && columnOf(p.x) === keeperCol;
}

/**
 * Standard shootout rules: after five kicks each, stop as soon as one side
 * cannot catch up; then sudden death in pairs. Returns null while undecided.
 */
export function decideShootout(
  playerGoals: number,
  playerKicks: number,
  cpuGoals: number,
  cpuKicks: number,
): 'player' | 'cpu' | 'draw' | null {
  if (playerKicks <= REGULATION_KICKS && cpuKicks <= REGULATION_KICKS) {
    const playerLeft = REGULATION_KICKS - playerKicks;
    const cpuLeft = REGULATION_KICKS - cpuKicks;
    if (playerGoals + playerLeft < cpuGoals) return 'cpu';
    if (cpuGoals + cpuLeft < playerGoals) return 'player';
    if (playerKicks < REGULATION_KICKS || cpuKicks < REGULATION_KICKS) return null;
  }
  if (playerKicks !== cpuKicks) return null;
  if (playerGoals > cpuGoals) return 'player';
  if (cpuGoals > playerGoals) return 'cpu';
  return playerKicks >= MAX_KICKS ? 'draw' : null;
}

const RESULT_PAUSE = 1.3;
const WINDUP = 1.0;
const PLAYER_FLIGHT = 0.55;

export class PenaltyEngine {
  phase: Phase = 'aim';
  turn: Turn = 'shoot';
  aim: Vec2 = { x: 320, y: 160 };
  meter: OscillatingMeter;
  ball: Vec2 = { ...SPOT };
  /** Where the ball is heading during a flight. */
  target: Vec2 = { ...SPOT };
  keeperCol: Column = 0;
  /** 0..1 progress of the keeper's dive animation. */
  dive = 0;
  playerDive: Column | null = null;
  kicks: Kick[] = [];
  lastOutcome: KickOutcome | null = null;
  winner: 'player' | 'cpu' | 'draw' | null = null;
  saves = 0;
  topCorners = 0;

  private rng: Rng;
  private timer = 0;
  private flightTime = 0;
  private pending: KickOutcome = 'goal';
  private diveCommittedEarly = false;

  constructor(
    public readonly config: PenaltyConfig,
    seed: number | string = Date.now(),
  ) {
    this.rng = createRng(seed);
    this.meter = new OscillatingMeter(config.meterSpeed);
  }

  get playerGoals(): number {
    return this.kicks.filter((k) => k.by === 'player' && k.outcome === 'goal').length;
  }

  get cpuGoals(): number {
    return this.kicks.filter((k) => k.by === 'cpu' && k.outcome === 'goal').length;
  }

  get playerKicks(): number {
    return this.kicks.filter((k) => k.by === 'player').length;
  }

  get cpuKicks(): number {
    return this.kicks.filter((k) => k.by === 'cpu').length;
  }

  get score(): number {
    return this.playerGoals * 100 + this.saves * 100 + (this.winner === 'player' ? 300 : 0);
  }

  get suddenDeath(): boolean {
    return this.playerKicks >= REGULATION_KICKS && this.cpuKicks >= REGULATION_KICKS;
  }

  setAim(x: number, y: number): void {
    if (this.turn !== 'shoot' || (this.phase !== 'aim' && this.phase !== 'power')) return;
    this.aim = {
      x: Math.min(GOAL.right + 30, Math.max(GOAL.left - 30, x)),
      y: Math.min(GOAL.bottom, Math.max(GOAL.top - 30, y)),
    };
  }

  /** First press locks the aim and starts the meter; the second press kicks. */
  press(): ShootoutEvent[] {
    if (this.turn !== 'shoot') return [];
    if (this.phase === 'aim') {
      this.phase = 'power';
      this.meter.reset();
      return [];
    }
    if (this.phase === 'power') return this.kick(this.meter.value);
    return [];
  }

  /** Player kick with an explicit meter value (exposed for tests). */
  kick(meterValue: number): ShootoutEvent[] {
    if (this.turn !== 'shoot' || (this.phase !== 'aim' && this.phase !== 'power')) return [];
    // Distance from the sweet spot scatters the shot; overhitting lifts it.
    const error = Math.abs(meterValue - SWEET_SPOT);
    const spread = error * this.config.scatter;
    const theta = this.rng.range(0, Math.PI * 2);
    const lift = meterValue > 0.9 ? (meterValue - 0.9) * 400 : 0;
    this.target = {
      x: this.aim.x + Math.cos(theta) * spread * this.rng.next(),
      y: this.aim.y + Math.sin(theta) * spread * this.rng.next() * 0.6 - lift,
    };
    const readsIt = this.rng.bool(this.config.keeperRead);
    this.keeperCol = readsIt ? columnOf(this.target.x) : this.rng.pick<Column>([-1, 0, 1]);
    this.pending = !isOnTarget(this.target)
      ? 'missed'
      : isSaved(this.target, this.keeperCol)
        ? 'saved'
        : 'goal';
    if (this.pending === 'goal' && isTopCorner(this.target)) this.topCorners++;
    this.startFlight(PLAYER_FLIGHT);
    return ['kick'];
  }

  /** Player chooses a dive while keeping. Allowed during the run-up and flight. */
  diveTo(col: Column): void {
    if (this.turn !== 'keep' || this.playerDive !== null) return;
    if (this.phase !== 'windup' && this.phase !== 'flight') return;
    this.playerDive = col;
    this.keeperCol = col;
    this.diveCommittedEarly = this.phase === 'windup';
  }

  update(dt: number): ShootoutEvent[] {
    const events: ShootoutEvent[] = [];
    switch (this.phase) {
      case 'power':
        this.meter.update(dt);
        break;
      case 'windup':
        this.timer += dt;
        if (this.timer >= WINDUP) {
          this.cpuKick();
          events.push('kick');
        }
        break;
      case 'flight': {
        this.timer += dt;
        const t = Math.min(1, this.timer / this.flightTime);
        this.ball = {
          x: SPOT.x + (this.target.x - SPOT.x) * t,
          y: SPOT.y + (this.target.y - SPOT.y) * t - Math.sin(t * Math.PI) * 30,
        };
        const keeperActive = this.turn === 'shoot' || this.playerDive !== null;
        if (keeperActive) this.dive = Math.min(1, this.dive + dt * 3.5);
        if (t >= 1) this.finishKick(events);
        break;
      }
      case 'result':
        this.timer += dt;
        if (this.timer >= RESULT_PAUSE) this.nextTurn(events);
        break;
      default:
        break;
    }
    return events;
  }

  private startFlight(duration: number): void {
    this.phase = 'flight';
    this.timer = 0;
    this.flightTime = duration;
    this.dive = 0;
    this.ball = { ...SPOT };
  }

  private cpuKick(): void {
    let col = this.rng.pick<Column>([-1, 0, 1]);
    // A keeper who moves early gets punished by smarter kickers.
    if (this.diveCommittedEarly && this.playerDive === col && this.rng.bool(this.config.cpuAdapt)) {
      col = this.rng.pick(([-1, 0, 1] as Column[]).filter((c) => c !== col));
    }
    const third = (GOAL.right - GOAL.left) / 3;
    const centreX = GOAL.left + third * (col + 1) + third / 2;
    const high = this.rng.bool(0.4);
    let x = centreX + this.rng.range(-third * 0.35, third * 0.35);
    let y = high
      ? this.rng.range(GOAL.top + 20, GOAL.top + 60)
      : this.rng.range(GOAL.bottom - 50, GOAL.bottom - 12);
    if (this.rng.bool(this.config.cpuMissChance)) {
      // Wide of the post or over the bar.
      if (this.rng.bool()) x = col <= 0 ? GOAL.left - 25 : GOAL.right + 25;
      else y = GOAL.top - 25;
    }
    this.target = { x, y };
    this.startFlight(this.config.cpuFlightTime);
  }

  private finishKick(events: ShootoutEvent[]): void {
    let outcome: KickOutcome;
    if (this.turn === 'shoot') {
      outcome = this.pending;
    } else {
      const keeper = this.playerDive ?? 0;
      this.keeperCol = keeper;
      outcome = !isOnTarget(this.target)
        ? 'missed'
        : isSaved(this.target, keeper)
          ? 'saved'
          : 'goal';
      if (outcome === 'saved') this.saves++;
    }
    this.kicks.push({ by: this.turn === 'shoot' ? 'player' : 'cpu', outcome });
    this.lastOutcome = outcome;
    events.push(outcome === 'goal' ? 'goal' : outcome === 'saved' ? 'save' : 'miss');
    this.winner = decideShootout(this.playerGoals, this.playerKicks, this.cpuGoals, this.cpuKicks);
    this.phase = 'result';
    this.timer = 0;
  }

  private nextTurn(events: ShootoutEvent[]): void {
    if (this.winner) {
      this.phase = 'over';
      events.push('end');
      return;
    }
    this.turn = this.turn === 'shoot' ? 'keep' : 'shoot';
    this.ball = { ...SPOT };
    this.dive = 0;
    this.keeperCol = 0;
    this.playerDive = null;
    this.diveCommittedEarly = false;
    this.timer = 0;
    this.phase = this.turn === 'shoot' ? 'aim' : 'windup';
    events.push('turn');
  }
}
