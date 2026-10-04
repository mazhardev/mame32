import type { SoundName } from '@/services/audio';
import { clamp } from '../arcade/kit';
import type { Input } from '../arcade/kit';
import { fillRound, text } from '../arcade/draw';
import { PITCH, aiDelivery, aiShot, arrival, ballAt, resolveBall } from './cricket';
import type { BatterCfg, BowlerCfg, Delivery, FieldCfg, Kind, Outcome, ShotInput } from './cricket';
import { drawFieldMap, drawPitch, drawResult, project, unproject } from './view';
import type { PitchView } from './view';

/**
 * One delivery at a time, for either side of the bat. Batting: the computer
 * runs in and bowls, you time your swing. Bowling: you set a target on the
 * pitch, pick pace or spin and stop the accuracy meter; the computer bats.
 */
export type Phase = 'setup' | 'runup' | 'flight' | 'result';
const RUNUP = 1.1;
const RESULT_TIME = 2.3;

export interface BallFlow {
  phase: Phase;
  t: number;
  delivery: Delivery | null;
  previous: Delivery | null;
  shot: ShotInput;
  swingT: number | null;
  outcome: Outcome | null;
  resultT: number;
  marker: { d: number; x: number };
  kind: Kind;
  meter: number;
  meterT: number;
  events: SoundName[];
}

export function newFlow(batting: boolean): BallFlow {
  return {
    phase: batting ? 'runup' : 'setup',
    t: -RUNUP,
    delivery: null,
    previous: null,
    shot: { swingAt: null, dir: 0, lofted: false },
    swingT: null,
    outcome: null,
    resultT: 0,
    marker: { d: 5, x: 0 },
    kind: 'pace',
    meter: 0,
    meterT: 0,
    events: [],
  };
}

export function nextBall(f: BallFlow, batting: boolean) {
  f.previous = f.delivery ?? f.previous;
  f.phase = batting ? 'runup' : 'setup';
  f.t = -RUNUP;
  f.delivery = null;
  f.shot = { swingAt: null, dir: 0, lofted: false };
  f.swingT = null;
  f.outcome = null;
  f.resultT = 0;
}

/** Shot direction and loft from keys or where the screen was tapped. */
function shotIntent(input: Input, w: number, h: number): { dir: -1 | 0 | 1; lofted: boolean } {
  const p = input.pointer;
  if (p.pressed) {
    const dir: -1 | 0 | 1 = p.x < w / 3 ? -1 : p.x > (w * 2) / 3 ? 1 : 0;
    return { dir, lofted: p.y < h * 0.45 };
  }
  const k = input.held;
  return { dir: k.has('left') ? -1 : k.has('right') ? 1 : 0, lofted: k.has('up') };
}

function finish(f: BallFlow, o: Outcome) {
  f.outcome = o;
  f.phase = 'result';
  f.resultT = 0;
  f.events.push(o.out ? 'gameOver' : o.runs >= 4 ? 'success' : o.quality >= 0 ? 'hit' : 'click');
}

/** You bat. Returns the outcome once the ball is decided. */
export function updateBatting(
  f: BallFlow,
  dt: number,
  input: Input,
  view: PitchView,
  bowler: BowlerCfg,
  field: FieldCfg,
  random: () => number,
): Outcome | null {
  f.t += dt;
  if (f.swingT !== null) f.swingT += dt;
  if (f.phase === 'runup') {
    if (f.t >= 0) {
      f.delivery = aiDelivery(bowler, random);
      f.phase = 'flight';
      f.events.push('whoosh');
    }
    return null;
  }
  if (f.phase === 'flight' && f.delivery) {
    const swing = input.pressed.has('action') || input.pointer.pressed;
    if (swing && f.shot.swingAt === null) {
      const intent = shotIntent(input, view.w, view.h);
      f.shot = { swingAt: f.t, ...intent };
      f.swingT = 0;
    }
    const arrive = arrival(f.delivery, 0);
    const contact = arrival(f.delivery, 0.8);
    const swungThrough = f.shot.swingAt !== null && f.t > f.shot.swingAt + 0.2;
    if ((swungThrough && f.t >= contact - 0.02) || f.t > arrive + 0.12) {
      const o = resolveBall(f.delivery, f.shot, field, random);
      finish(f, o);
      return o;
    }
    return null;
  }
  if (f.phase === 'result') f.resultT += dt;
  return null;
}

/** Accuracy of a release from the meter position (1 = dead centre). */
export const meterAccuracy = (m: number) => 1 - Math.abs(m - 0.5) * 2;

export function releaseDelivery(
  f: BallFlow,
  accuracy: number,
  random: () => number,
  turnLeft: boolean,
) {
  const miss = 1 - accuracy;
  const length = clamp(f.marker.d + (random() - 0.5) * 2 * miss * 2.2, 0.4, 11);
  const line = f.marker.x + (random() - 0.5) * 2 * miss * 0.6;
  const spin = f.kind === 'spin';
  const turn = spin ? (turnLeft ? -1 : 1) * (0.2 + accuracy * 0.15) : (random() - 0.5) * 0.14;
  f.delivery = {
    kind: f.kind,
    speed: spin ? 20 + accuracy * 4 : 29 + accuracy * 9,
    releaseX: spin ? 0.25 : 0.4,
    length,
    bounceX: line - turn * 0.5,
    turn,
  };
}

/** You bowl. Returns the outcome once the computer's shot is decided. */
export function updateBowling(
  f: BallFlow,
  dt: number,
  input: Input,
  view: PitchView,
  batter: BatterCfg,
  field: FieldCfg,
  aggression: number,
  meterSpeed: number,
  random: () => number,
): Outcome | null {
  if (f.swingT !== null) f.swingT += dt;
  if (f.phase === 'setup') {
    const h = input.held;
    f.marker.d = clamp(
      f.marker.d + ((h.has('up') ? 1 : 0) - (h.has('down') ? 1 : 0)) * 5 * dt,
      0.5,
      10,
    );
    f.marker.x = clamp(
      f.marker.x + ((h.has('right') ? 1 : 0) - (h.has('left') ? 1 : 0)) * 1.2 * dt,
      -1.2,
      1.2,
    );
    if (input.pressed.has('action2')) f.kind = f.kind === 'pace' ? 'spin' : 'pace';
    const p = input.pointer;
    let go = input.pressed.has('action');
    if (p.pressed) {
      const at = unproject(view, p.x, p.y);
      if (at.d > 0 && at.d < PITCH - 2 && Math.abs(at.x) < 1.6) {
        const near = Math.abs(at.d - f.marker.d) < 0.9 && Math.abs(at.x - f.marker.x) < 0.3;
        if (near) go = true;
        f.marker = { d: clamp(at.d, 0.5, 10), x: clamp(at.x, -1.2, 1.2) };
      }
    }
    if (go) {
      f.phase = 'runup';
      f.t = -RUNUP * 1.6;
      f.meterT = 0;
    }
    return null;
  }
  if (f.phase === 'runup') {
    f.t += dt;
    f.meterT += dt * meterSpeed;
    f.meter = (Math.sin(f.meterT * Math.PI * 1.5 - Math.PI / 2) + 1) / 2;
    const release = input.pressed.has('action') || input.pointer.pressed;
    if (release || f.t >= 0.4) {
      const acc = release ? meterAccuracy(f.meter) : 0.2;
      releaseDelivery(f, acc, random, input.held.has('left'));
      f.t = 0;
      f.phase = 'flight';
      f.events.push('whoosh');
      if (f.delivery) f.shot = aiShot(f.delivery, f.previous, batter, field, aggression, random);
    }
    return null;
  }
  if (f.phase === 'flight' && f.delivery) {
    f.t += dt;
    if (f.shot.swingAt !== null && f.swingT === null && f.t >= f.shot.swingAt) f.swingT = 0;
    const contact = arrival(f.delivery, 0.8);
    const swungThrough = f.shot.swingAt !== null && f.t > f.shot.swingAt + 0.2;
    if ((swungThrough && f.t >= contact - 0.02) || f.t > arrival(f.delivery, 0) + 0.12) {
      const o = resolveBall(f.delivery, f.shot, field, random);
      finish(f, o);
      return o;
    }
    return null;
  }
  if (f.phase === 'result') f.resultT += dt;
  return null;
}

export const resultDone = (f: BallFlow) => f.phase === 'result' && f.resultT >= RESULT_TIME;

export function drawFlow(
  ctx: CanvasRenderingContext2D,
  view: PitchView,
  f: BallFlow,
  bowling: boolean,
) {
  const struck = f.outcome !== null && f.outcome.quality >= 0;
  drawPitch(ctx, view, {
    delivery: f.delivery,
    t: f.phase === 'result' ? (f.delivery ? arrival(f.delivery, 0) : 0) : f.t,
    swing: f.swingT,
    struck: struck || f.phase === 'result',
    bowled: f.outcome?.out === 'bowled',
    marker: bowling && (f.phase === 'setup' || f.phase === 'runup') ? f.marker : null,
  });
  if (f.phase === 'result' && f.outcome) {
    drawFieldMap(
      ctx,
      view.w / 2,
      view.h * 0.44,
      Math.min(view.w * 0.38, 150),
      f.outcome,
      f.resultT / 0.8,
    );
    drawResult(ctx, view.w, view.h * 0.75, f.outcome);
  }
  if (bowling && f.phase === 'setup') {
    fillRound(ctx, 12, view.h - 64, view.w - 24, 52, 10, 'rgba(15,23,42,0.85)');
    const len =
      f.marker.d < 1.4
        ? 'yorker'
        : f.marker.d < 3.5
          ? 'full'
          : f.marker.d <= 7
            ? 'good length'
            : 'short';
    text(
      ctx,
      `${f.kind === 'pace' ? 'Pace' : 'Spin'} · ${len} · ${f.marker.x > 0.25 ? 'outside off' : f.marker.x < -0.25 ? 'down leg' : 'at the stumps'}`,
      view.w / 2,
      view.h - 46,
      { size: 14 },
    );
    text(
      ctx,
      'Arrows / tap move the target · X pace/spin · Space or tap target to run in',
      view.w / 2,
      view.h - 26,
      { size: 11, color: '#cbd5e1', weight: 500 },
    );
  }
  if (bowling && f.phase === 'runup') {
    const w = view.w - 80;
    fillRound(ctx, 40, view.h - 46, w, 18, 9, '#334155');
    fillRound(ctx, 40 + w * 0.4, view.h - 46, w * 0.2, 18, 0, 'rgba(34,197,94,0.6)');
    const x = 40 + w * f.meter;
    fillRound(ctx, x - 3, view.h - 52, 6, 30, 3, '#facc15');
    text(ctx, 'Release in the green — Space / tap', view.w / 2, view.h - 64, { size: 13 });
  }
  if (!bowling && f.phase !== 'result') {
    const b = f.delivery && f.phase === 'flight' ? ballAt(f.delivery, f.t) : null;
    if (b && b.d > PITCH - 4) {
      const p = project(view, b.d, b.x, b.z);
      text(ctx, `${Math.round(f.delivery!.speed * 3.6)} km/h`, p.x, p.y - 24, {
        size: 12,
        color: '#0f172a',
      });
    }
  }
}
