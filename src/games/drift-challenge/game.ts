import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState } from '../_shared/arcade/kit';
import { fillRound, text } from '../_shared/arcade/draw';
import { buildTrack } from '../_shared/racing/track';
import { CAR, slipAngle, speedOf } from '../_shared/racing/car';
import type { CarParams } from '../_shared/racing/car';
import { createRace, playerControls, renderRace, ROAD_LOOK, updateRace } from '../_shared/racing/race';
import type { RaceCore } from '../_shared/racing/race';
import { DRIFT_PARK } from '../_shared/racing/tracks';

/**
 * Drift Challenge: 90 seconds on a twisty practice track. Points build up
 * while the car slides sideways at speed; holding a drift raises the
 * multiplier. Straighten up cleanly to bank the points — touch the grass or
 * the wall and the pending points are lost.
 */
export const W = 560;
export const H = 420;
export const TIME: Record<DifficultySetting, number> = { easy: 100, normal: 90, hard: 75 };
const DRIFT_CAR: CarParams = { ...CAR, grip: 3.2, turn: 3.2, maxSpeed: 320, accel: 280 };

export interface State extends BaseState {
  core: RaceCore;
  limit: number;
  pending: number;
  multiplier: number;
  driftTime: number;
  calm: number;
  bestDrift: number;
  drifting: boolean;
  lost: number;
  banked: number;
  flash: string;
  flashT: number;
}

const track = buildTrack(DRIFT_PARK, 140);

export function create(difficulty: DifficultySetting): State {
  const core = createRace(track, 99, ['You'], ['#f43f5e'], [null]);
  return { ...baseState(), core, limit: TIME[difficulty], pending: 0, multiplier: 1, driftTime: 0, calm: 0, bestDrift: 0, drifting: false, lost: 0, banked: 0, flash: '', flashT: 0 };
}

/** Is the car in a scoring drift right now? */
export const isDrifting = (slip: number, speed: number) => Math.abs(slip) > 0.25 && Math.abs(slip) < 1.6 && speed > 110;

export function bank(s: State) {
  if (s.pending <= 0) return;
  const pts = Math.round(s.pending * s.multiplier);
  s.score += pts;
  s.banked += 1;
  s.bestDrift = Math.max(s.bestDrift, pts);
  s.flash = `+${pts}`;
  s.flashT = 1.2;
  s.events.push(pts > 500 ? 'levelComplete' : 'coin');
  s.pending = 0;
  s.multiplier = 1;
  s.driftTime = 0;
}

export function lose(s: State) {
  if (s.pending <= 0) return;
  s.lost += 1;
  s.flash = 'Drift lost!';
  s.flashT = 1.2;
  s.events.push('failure');
  s.pending = 0;
  s.multiplier = 1;
  s.driftTime = 0;
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update(s, dt, input, random) {
    const r = s.core.racers[0];
    const events = updateRace(s.core, dt, playerControls(input, r.car, W, H), DRIFT_CAR, DRIFT_CAR, random);
    if (events.includes('go')) s.events.push('powerup');
    if (events.includes('tick')) s.events.push('blip');
    s.flashT = Math.max(0, s.flashT - dt);
    if (s.core.countdown > 0) return;
    const slip = slipAngle(r.car);
    const v = speedOf(r.car);
    if (events.includes('wall') || r.offTrack) {
      lose(s);
      s.drifting = false;
    } else if (isDrifting(slip, v)) {
      s.drifting = true;
      s.calm = 0;
      s.driftTime += dt;
      s.multiplier = Math.min(5, 1 + Math.floor(s.driftTime / 1.2));
      s.pending += Math.abs(slip) * v * dt * 0.6;
    } else if (s.drifting) {
      s.calm += dt;
      if (s.calm > 0.35) {
        bank(s);
        s.drifting = false;
      }
    }
    if (s.core.clock >= s.limit) {
      if (s.drifting) bank(s);
      s.over = true;
      s.events.push('levelComplete');
    }
  },
  render(ctx, s) {
    const c = s.core.racers[0].car;
    renderRace(ctx, s.core, W, H, c.x + c.vx * 0.2, c.y + c.vy * 0.2, { ...ROAD_LOOK, ground: '#334155', edgeAlt: '#f59e0b' }, (g) => {
      // Tyre marks while sliding.
      if (s.drifting) {
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(c.x - 2, c.y - 2, 4, 4);
      }
    });
    const left = Math.max(0, s.limit - s.core.clock);
    text(ctx, `${Math.ceil(left)}s`, W / 2, 26, { size: 22, color: left < 10 ? '#f87171' : '#fff' });
    if (s.pending > 0) {
      fillRound(ctx, W / 2 - 90, H - 64, 180, 40, 10, 'rgba(15,23,42,0.75)');
      text(ctx, `${Math.round(s.pending)} × ${s.multiplier}`, W / 2, H - 44, { size: 20, color: '#fde047' });
    }
    if (s.flashT > 0) text(ctx, s.flash, W / 2, 70, { size: 26, color: s.flash.startsWith('+') ? '#4ade80' : '#f87171' });
    if (s.core.countdown > 0) text(ctx, String(Math.ceil(s.core.countdown)), W / 2, H / 2 - 40, { size: 64, color: '#fde047' });
  },
  hud: (s) => [
    { label: 'Score', value: s.score },
    { label: 'Time', value: `${Math.ceil(Math.max(0, s.limit - s.core.clock))}s` },
    { label: 'Best drift', value: s.bestDrift },
  ],
  result: (s) => ({
    score: s.score,
    title: `${s.score.toLocaleString()} drift points`,
    details: [
      { label: 'Drifts banked', value: String(s.banked) },
      { label: 'Best single drift', value: String(s.bestDrift) },
      { label: 'Drifts lost', value: String(s.lost) },
    ],
  }),
  onEnd: (s) => {
    void reportProgress('drift-challenge.score-5000', s.score);
    void reportProgress('drift-challenge.score-15000', s.score);
    void reportProgress('drift-challenge.big', s.bestDrift);
    void incrementProgress('drift-challenge.total', s.banked);
  },
  touch: { pad: 'dpad', buttons: [{ action: 'action', label: 'Drift' }] },
  startHint: '↑ throttle, ← → steer, hold Space for the handbrake. Slide through corners, then straighten up to bank points.',
};
