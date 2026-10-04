import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { burst, drawSparks, fillRound, text, updateSparks } from '../_shared/arcade/draw';
import type { Spark } from '../_shared/arcade/draw';
import { drawCar, drive, makeCar, speedOf } from '../_shared/racing/car';
import type { Car, CarParams } from '../_shared/racing/car';
import { CAR_L, CAR_W, corners, headingError, hitsRect, insideBay, outOfLot } from './engine';
import { LEVELS } from './levels';

/**
 * Parking Challenge: ten parking puzzles in a car park. Drive slowly into
 * the marked bay — some must be entered nose first, some reversed in — and
 * stop inside the lines. Touching another car, a wall or a cone costs a
 * life and restarts the level.
 */
export const W = 560;
export const H = 420;
const HOLD = 0.8;

export const PARK_CAR: CarParams = { accel: 150, brake: 320, maxSpeed: 150, reverseSpeed: 90, grip: 14, turn: 2.4, drag: 0.8 };

export interface State extends BaseState {
  level: number;
  car: Car;
  levelTime: number;
  lives: number;
  hold: number;
  between: number;
  collisions: number;
  clean: number;
  tolerance: number;
  sparks: Spark[];
}

const TOLERANCE: Record<DifficultySetting, number> = { easy: 0.25, normal: 0.15, hard: 0.08 };

function placeCar(s: State) {
  const l = LEVELS[s.level];
  s.car = makeCar(l.start.x, l.start.y, l.start.angle, '#2563eb');
  s.car.r = 13;
  s.levelTime = 0;
  s.hold = 0;
}

export function create(difficulty: DifficultySetting): State {
  const s = { ...baseState(), level: 0, lives: 3, between: 0, collisions: 0, clean: 0, tolerance: TOLERANCE[difficulty], sparks: [] } as unknown as State;
  placeCar(s);
  return s;
}

export const parked = (s: State) => {
  const l = LEVELS[s.level];
  return insideBay(corners(s.car.x, s.car.y, s.car.angle), l.bay) && headingError(s.car.angle, l.bay.angle, l.eitherWay) <= s.tolerance && speedOf(s.car) < 8;
};

export function update(s: State, dt: number, input: Input, random: () => number) {
  updateSparks(s.sparks, dt);
  if (s.between > 0) {
    s.between -= dt;
    if (s.between <= 0) {
      if (s.level >= LEVELS.length - 1) {
        s.over = true;
        s.events.push('levelComplete');
        return;
      }
      s.level += 1;
      placeCar(s);
    }
    return;
  }
  const throttle = (input.held.has('up') ? 1 : 0) - (input.held.has('down') ? 1 : 0);
  const steer = (input.held.has('right') ? 1 : 0) - (input.held.has('left') ? 1 : 0);
  drive(s.car, { throttle, steer, handbrake: input.held.has('action') }, PARK_CAR, dt);
  s.levelTime += dt;
  const l = LEVELS[s.level];
  const box = corners(s.car.x, s.car.y, s.car.angle);
  if (l.obstacles.some((o) => hitsRect(box, o)) || outOfLot(box, W, H)) {
    s.lives -= 1;
    s.collisions += 1;
    s.events.push('explosion');
    burst(s.sparks, s.car.x, s.car.y, '#f97316', 18, 150, random);
    if (s.lives <= 0) {
      s.over = true;
      s.events.push('gameOver');
      return;
    }
    placeCar(s);
    return;
  }
  if (parked(s)) {
    s.hold += dt;
    if (s.hold >= HOLD) {
      const pts = 200 + Math.max(0, Math.round((l.par - s.levelTime) * 20));
      s.score += pts;
      s.between = 1.5;
      s.events.push('levelComplete');
    }
  } else s.hold = 0;
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  ctx.fillStyle = '#4b5563';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  for (let x = 30; x < W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  const l = LEVELS[s.level];
  // Target bay, with an arrow showing which way to face.
  ctx.save();
  ctx.translate(l.bay.x, l.bay.y);
  ctx.rotate(l.bay.angle);
  const long = Math.max(l.bay.w, l.bay.h);
  const short = Math.min(l.bay.w, l.bay.h);
  ctx.fillStyle = s.hold > 0 ? 'rgba(34,197,94,0.45)' : 'rgba(250,204,21,0.22)';
  ctx.fillRect(-long / 2, -short / 2, long, short);
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.strokeRect(-long / 2, -short / 2, long, short);
  ctx.setLineDash([]);
  text(ctx, l.eitherWay ? '⇆' : '➜', 0, 0, { size: 20, color: '#fde047' });
  ctx.restore();
  for (const o of l.obstacles) {
    if (o.kind === 'wall') fillRound(ctx, o.x, o.y, o.w, o.h, 2, '#1f2937');
    else if (o.kind === 'cone') {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(o.x + o.w / 2, o.y - 2);
      ctx.lineTo(o.x + o.w + 2, o.y + o.h + 2);
      ctx.lineTo(o.x - 2, o.y + o.h + 2);
      ctx.fill();
    } else {
      fillRound(ctx, o.x, o.y, o.w, o.h, 6, o.color ?? '#64748b');
      ctx.fillStyle = 'rgba(15,23,42,0.6)';
      if (o.h > o.w) ctx.fillRect(o.x + 4, o.y + 10, o.w - 8, 10);
      else ctx.fillRect(o.x + 10, o.y + 4, 10, o.h - 8);
    }
  }
  drawCar(ctx, s.car, { length: CAR_L, width: CAR_W, outline: '#fde047' });
  drawSparks(ctx, s.sparks);
  text(ctx, `Level ${s.level + 1}: ${l.name}`, 10, 16, { size: 14, align: 'left' });
  text(ctx, `${'❤'.repeat(Math.max(0, s.lives))}`, W - 10, 16, { size: 15, align: 'right', color: '#f87171' });
  if (s.hold > 0) text(ctx, 'Hold still…', W / 2, H - 20, { size: 16, color: '#4ade80' });
  if (s.between > 0) text(ctx, 'Parked!', W / 2, H / 2, { size: 34, color: '#4ade80' });
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Level', value: `${s.level + 1}/${LEVELS.length}` },
    { label: 'Lives', value: s.lives },
    { label: 'Time', value: `${s.levelTime.toFixed(1)}s` },
    { label: 'Score', value: s.score },
  ],
  result: (s) => {
    const done = s.lives > 0 ? LEVELS.length : s.level;
    return {
      score: s.score,
      won: s.lives > 0,
      title: s.lives > 0 ? 'Every bay filled!' : `Stopped at level ${s.level + 1}`,
      details: [
        { label: 'Levels completed', value: `${done} / ${LEVELS.length}` },
        { label: 'Bumps', value: String(s.collisions) },
      ],
    };
  },
  onEnd: (s, difficulty) => {
    const done = s.lives > 0 ? LEVELS.length : s.level;
    void reportProgress('parking-challenge.level-5', done);
    void reportProgress('parking-challenge.all', done === LEVELS.length ? 1 : 0);
    if (done === LEVELS.length && s.collisions === 0) void reportProgress('parking-challenge.clean', 1);
    if (done === LEVELS.length && difficulty === 'hard') void reportProgress('parking-challenge.hard', 1);
    void incrementProgress('parking-challenge.total', done);
  },
  touch: { pad: 'dpad' },
  startHint: '↑ forward, ↓ reverse, ← → steer. Stop fully inside the yellow bay, facing the arrow.',
};
