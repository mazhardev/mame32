import type { DifficultySetting } from '@/types';
import type { Vec2 } from '@/utils/collision';
import { createRng } from '@/utils/random';
import type { Rng } from '@/utils/random';
import {
  bounceOffFloor,
  bounceOffPoint,
  bounceOffVertical,
  integrate,
  launchVelocity,
} from '../_shared/sports/physics';
import type { Ball } from '../_shared/sports/physics';

export const WIDTH = 640;
export const HEIGHT = 400;
export const FLOOR_Y = 385;
export const GRAVITY = 900;
export const BALL_RADIUS = 11;
export const MIN_SPEED = 320;
export const MAX_SPEED = 920;
export const MIN_ANGLE = (10 * Math.PI) / 180;
export const MAX_ANGLE = (85 * Math.PI) / 180;
/** Horizontal distance from the rim beyond which a basket counts for 3. */
export const THREE_POINT_DISTANCE = 330;

const HOOP_X = 540;
const RIM_HALF = 26;
const BOARD_OFFSET = 34;
const MAX_FLIGHT = 5;

export interface BasketballConfig {
  roundSeconds: number;
  /** Seconds of trajectory preview dots shown while aiming. */
  guideSeconds: number;
  /** Vertical travel of the hoop in px; 0 keeps it fixed. */
  hoopSwing: number;
}

export const DIFFICULTY_CONFIG: Record<DifficultySetting, BasketballConfig> = {
  easy: { roundSeconds: 75, guideSeconds: 0.55, hoopSwing: 0 },
  normal: { roundSeconds: 60, guideSeconds: 0.25, hoopSwing: 0 },
  hard: { roundSeconds: 45, guideSeconds: 0, hoopSwing: 45 },
};

export type Phase = 'aiming' | 'flying' | 'over';
export type ShotEvent = 'rim' | 'board' | 'score' | 'miss' | 'end';

export interface ShotResult {
  made: boolean;
  points: number;
  swish: boolean;
}

export class BasketballEngine {
  phase: Phase = 'aiming';
  ball: Ball;
  start: Vec2 = { x: 120, y: FLOOR_Y - BALL_RADIUS };
  hoop: Vec2 = { x: HOOP_X, y: 170 };
  angle = Math.PI / 4;
  /** 0..1, mapped onto [MIN_SPEED, MAX_SPEED]. */
  power = 0.6;
  score = 0;
  made = 0;
  attempts = 0;
  streak = 0;
  bestStreak = 0;
  swishes = 0;
  threes = 0;
  timeLeft: number;
  lastShot: ShotResult | null = null;

  private rng: Rng;
  private clock = 0;
  private flightTime = 0;
  private touchedRim = false;
  private scored = false;
  private shotDistance = 0;

  constructor(
    public readonly config: BasketballConfig,
    seed: number | string = Date.now(),
  ) {
    this.rng = createRng(seed);
    this.timeLeft = config.roundSeconds;
    this.ball = { x: this.start.x, y: this.start.y, vx: 0, vy: 0, r: BALL_RADIUS };
    this.placeShooter();
  }

  get rimFront(): Vec2 {
    return { x: this.hoop.x - RIM_HALF, y: this.hoop.y };
  }

  get rimBack(): Vec2 {
    return { x: this.hoop.x + RIM_HALF, y: this.hoop.y };
  }

  get boardX(): number {
    return this.hoop.x + BOARD_OFFSET;
  }

  get accuracy(): number {
    return this.attempts === 0 ? 0 : this.made / this.attempts;
  }

  setAim(angle: number, power: number): void {
    if (this.phase !== 'aiming') return;
    this.angle = Math.min(MAX_ANGLE, Math.max(MIN_ANGLE, angle));
    this.power = Math.min(1, Math.max(0, power));
  }

  speed(power = this.power): number {
    return MIN_SPEED + (MAX_SPEED - MIN_SPEED) * power;
  }

  shoot(): boolean {
    if (this.phase !== 'aiming' || this.timeLeft <= 0) return false;
    const v = launchVelocity(this.angle, this.speed());
    this.ball = { x: this.start.x, y: this.start.y, vx: v.x, vy: v.y, r: BALL_RADIUS };
    this.phase = 'flying';
    this.flightTime = 0;
    this.touchedRim = false;
    this.scored = false;
    this.shotDistance = this.hoop.x - this.start.x;
    this.attempts++;
    return true;
  }

  /** Predicted ball path for the aiming guide (no collisions). */
  trajectory(seconds = this.config.guideSeconds, step = 1 / 30): Vec2[] {
    const v = launchVelocity(this.angle, this.speed());
    const b: Ball = { x: this.start.x, y: this.start.y, vx: v.x, vy: v.y, r: BALL_RADIUS };
    const points: Vec2[] = [];
    for (let t = 0; t < seconds; t += step) {
      integrate(b, step, GRAVITY);
      points.push({ x: b.x, y: b.y });
    }
    return points;
  }

  update(dt: number): ShotEvent[] {
    const events: ShotEvent[] = [];
    if (this.phase === 'over') return events;
    this.clock += dt;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    if (this.config.hoopSwing > 0) {
      this.hoop.y = 170 + Math.sin(this.clock * 1.3) * this.config.hoopSwing;
    }

    if (this.phase === 'flying') {
      // Sub-step so a fast ball cannot tunnel through the rim.
      const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
      const h = dt / steps;
      for (let i = 0; i < steps && this.phase === 'flying'; i++) {
        this.stepFlight(h, events);
      }
    }

    if (this.phase === 'aiming' && this.timeLeft <= 0) {
      this.phase = 'over';
      events.push('end');
    }
    return events;
  }

  private stepFlight(h: number, events: ShotEvent[]): void {
    const b = this.ball;
    const prevY = b.y;
    integrate(b, h, GRAVITY);
    this.flightTime += h;

    if (bounceOffPoint(b, this.rimFront, 0.55) || bounceOffPoint(b, this.rimBack, 0.55)) {
      if (!this.touchedRim) events.push('rim');
      this.touchedRim = true;
    }
    if (bounceOffVertical(b, this.boardX, this.hoop.y - 80, this.hoop.y + 12, -1, 0.6)) {
      events.push('board');
    }
    bounceOffFloor(b, FLOOR_Y, 0.55);

    const front = this.rimFront.x;
    const back = this.rimBack.x;
    if (
      !this.scored &&
      b.vy > 0 &&
      prevY < this.hoop.y &&
      b.y >= this.hoop.y &&
      b.x > front + 2 &&
      b.x < back - 2
    ) {
      this.scored = true;
      events.push('score');
    }

    const resting = b.y + b.r >= FLOOR_Y - 0.5 && b.vy === 0 && Math.abs(b.vx) < 25;
    const gone = b.x < -b.r * 2 || b.x > WIDTH + b.r * 2;
    if (gone || resting || this.flightTime > MAX_FLIGHT) this.resolveShot(events);
  }

  private resolveShot(events: ShotEvent[]): void {
    if (this.scored) {
      const three = this.shotDistance > THREE_POINT_DISTANCE;
      const swish = !this.touchedRim;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      const points = (three ? 3 : 2) + (swish ? 1 : 0) + (this.streak >= 3 ? 1 : 0);
      this.score += points;
      this.made++;
      if (three) this.threes++;
      if (swish) this.swishes++;
      this.lastShot = { made: true, points, swish };
    } else {
      this.streak = 0;
      this.lastShot = { made: false, points: 0, swish: false };
      events.push('miss');
    }
    this.phase = 'aiming';
    this.placeShooter();
    if (this.timeLeft <= 0) {
      this.phase = 'over';
      events.push('end');
    }
  }

  /** Test hook: put the shooter at an exact spot. */
  placeAt(x: number): void {
    this.start = { x, y: FLOOR_Y - BALL_RADIUS };
    this.ball = { x, y: this.start.y, vx: 0, vy: 0, r: BALL_RADIUS };
  }

  private placeShooter(): void {
    // Later shots drift further out so the round ramps up.
    const far = Math.min(1, this.attempts / 12);
    const x = this.rng.range(250 - far * 170, 330 - far * 150);
    this.placeAt(Math.round(x));
  }
}
