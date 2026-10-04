import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../arcade/kit';
import type { ArcadeSpec, BaseState } from '../arcade/kit';
import { text } from '../arcade/draw';
import { buildTrack } from './track';
import type { Track } from './track';
import { speedOf } from './car';
import type { CarParams } from './car';
import { createRace, fmtTime, ordinal, playerControls, positionOf, renderRace, standings, updateRace } from './race';
import type { RaceCore, RaceLook } from './race';

/**
 * Builds a complete lap-race game from a little configuration: the track,
 * how many laps and rivals, the car handling and the look. Hooks let a game
 * add its own twist (slipstream, drift scoring…) without copying the rest.
 */
export interface LapRaceState extends BaseState {
  core: RaceCore;
  difficulty: DifficultySetting;
  trackIndex: number;
  bonus: number;
  message: string;
  messageT: number;
}

export interface LapRaceConfig {
  id: string;
  tracks: { name: string; points: [number, number][]; width: number }[];
  laps: number;
  rivals: { name: string; color: string }[];
  playerColor: string;
  player: CarParams;
  /** AI car per difficulty; skill spreads drivers around it. */
  ai: Record<DifficultySetting, CarParams>;
  skill: Record<DifficultySetting, number>;
  look: RaceLook;
  /** Points by finishing position (index 0 = 1st). */
  points: number[];
  /** Pick a track; defaults to the first. */
  chooseTrack?: (random: () => number) => number;
  /** Extra per-frame behaviour after the race update. */
  afterUpdate?: (s: LapRaceState, dt: number) => void;
  drawExtra?: (ctx: CanvasRenderingContext2D, s: LapRaceState) => void;
  startHint: string;
  unit?: string;
}

const trackCache = new Map<string, Track>();
function trackFor(cfg: LapRaceConfig, i: number): Track {
  const key = `${cfg.id}:${i}`;
  let t = trackCache.get(key);
  if (!t) {
    t = buildTrack(cfg.tracks[i].points, cfg.tracks[i].width);
    trackCache.set(key, t);
  }
  return t;
}

export function makeLapRaceSpec(cfg: LapRaceConfig, W = 560, H = 420): ArcadeSpec<LapRaceState> {
  const create = (difficulty: DifficultySetting, random: () => number): LapRaceState => {
    const trackIndex = cfg.chooseTrack?.(random) ?? 0;
    const base = cfg.skill[difficulty];
    const skills = cfg.rivals.map((_, i) => Math.max(0, Math.min(1, base + (i - (cfg.rivals.length - 1) / 2) * 0.12)));
    const core = createRace(
      trackFor(cfg, trackIndex),
      cfg.laps,
      [...cfg.rivals.map((r) => r.name), 'You'],
      [...cfg.rivals.map((r) => r.color), cfg.playerColor],
      [...skills, null],
    );
    return { ...baseState(), core, difficulty, trackIndex, bonus: 0, message: '', messageT: 0 };
  };

  const me = (s: LapRaceState) => s.core.racers[s.core.racers.length - 1];

  return {
    width: W,
    height: H,
    create,
    update(s, dt, input, random) {
      const player = me(s);
      const events = updateRace(s.core, dt, playerControls(input, player.car, W, H), cfg.player, cfg.ai[s.difficulty], random);
      for (const e of events) {
        if (e === 'tick') s.events.push('blip');
        if (e === 'go') s.events.push('powerup');
        if (e === 'wall') s.events.push('hit');
        if (e === 'bump') s.events.push('click');
        if (e === 'lap') {
          s.events.push('success');
          s.message = player.laps === cfg.laps - 1 ? 'Final lap!' : `Lap ${player.laps + 1}`;
          s.messageT = 1.5;
        }
      }
      s.messageT = Math.max(0, s.messageT - dt);
      cfg.afterUpdate?.(s, dt);
      if (player.finished !== null) {
        const pos = s.core.finishOrder.indexOf(s.core.racers.length - 1) + 1;
        s.score = (cfg.points[pos - 1] ?? 0) + s.bonus;
        s.over = true;
        s.events.push(pos === 1 ? 'levelComplete' : 'gameOver');
      }
    },
    render(ctx, s) {
      const p = me(s).car;
      // Look a little ahead in the direction of travel.
      renderRace(ctx, s.core, W, H, p.x + p.vx * 0.25, p.y + p.vy * 0.25, cfg.look, cfg.drawExtra ? (c) => cfg.drawExtra!(c, s) : undefined);
      const v = Math.round(speedOf(p) * 0.6);
      text(ctx, `${v} ${cfg.unit ?? 'km/h'}`, W - 52, H - 20, { size: 18, color: '#fff' });
      text(ctx, `${ordinal(positionOf(s.core, me(s)))}`, 40, 28, { size: 26, color: '#fde047' });
      if (s.core.countdown > 0) text(ctx, String(Math.ceil(s.core.countdown)), W / 2, H / 2 - 40, { size: 64, color: '#fde047' });
      else if (s.core.clock < 0.8) text(ctx, 'GO!', W / 2, H / 2 - 40, { size: 64, color: '#22c55e' });
      if (s.messageT > 0) text(ctx, s.message, W / 2, 60, { size: 24, color: '#fff' });
      if (me(s).offTrack) text(ctx, 'Off track', W / 2, H - 24, { size: 16, color: '#fca5a5' });
    },
    hud(s) {
      const p = me(s);
      return [
        { label: 'Pos', value: `${positionOf(s.core, p)}/${s.core.racers.length}` },
        { label: 'Lap', value: `${Math.min(cfg.laps, p.laps + 1)}/${cfg.laps}` },
        { label: 'Time', value: fmtTime(s.core.clock) },
        { label: 'Best', value: fmtTime(p.bestLap) },
      ];
    },
    result(s) {
      const p = me(s);
      const pos = s.core.finishOrder.indexOf(s.core.racers.length - 1) + 1;
      return {
        score: s.score,
        won: pos === 1,
        title: pos === 1 ? 'Victory!' : `You finished ${ordinal(pos)}`,
        details: [
          { label: 'Track', value: cfg.tracks[s.trackIndex].name },
          { label: 'Race time', value: fmtTime(p.finished) },
          { label: 'Best lap', value: fmtTime(p.bestLap) },
          { label: 'Winner', value: standings(s.core)[0].name },
        ],
      };
    },
    onEnd(s, difficulty) {
      const pos = s.core.finishOrder.indexOf(s.core.racers.length - 1) + 1;
      if (pos >= 1 && pos <= 3) void reportProgress(`${cfg.id}.podium`, 1);
      if (pos === 1) {
        void reportProgress(`${cfg.id}.win`, 1);
        if (difficulty === 'hard') void reportProgress(`${cfg.id}.hard`, 1);
      }
      void incrementProgress(`${cfg.id}.races`, 1);
    },
    touch: { pad: 'dpad', buttons: [{ action: 'action', label: 'Drift' }] },
    startHint: cfg.startHint,
  };
}
