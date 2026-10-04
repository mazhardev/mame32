import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState, clamp } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import {
  BATTER,
  FIELD_CFG,
  addOutcome,
  inningsOver,
  newInnings,
  oversText,
} from '../_shared/cricket/cricket';
import type { BatterCfg, FieldCfg, Innings } from '../_shared/cricket/cricket';
import { drawFlow, newFlow, nextBall, resultDone, updateBowling } from '../_shared/cricket/flow';
import type { BallFlow } from '../_shared/cricket/flow';
import { drawScoreboard } from '../_shared/cricket/scoreboard';
import { pitchView } from '../_shared/cricket/view';

/** Defend a total over three overs against a computer batter. */
export const W = 420;
export const H = 600;
const VIEW = pitchView(W, H);
export const TARGETS: Record<DifficultySetting, number> = { easy: 26, normal: 30, hard: 34 };
const METER: Record<DifficultySetting, number> = { easy: 0.55, normal: 0.75, hard: 0.95 };

export interface State extends BaseState {
  inn: Innings;
  flow: BallFlow;
  batter: BatterCfg;
  field: FieldCfg;
  meter: number;
  bowled: number;
  maidens: number;
  overRuns: number;
  overBalls: number;
}

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    inn: newInnings(3, 3, TARGETS[difficulty]),
    flow: newFlow(false),
    batter: BATTER[difficulty],
    field: FIELD_CFG[difficulty],
    meter: METER[difficulty],
    bowled: 0,
    maidens: 0,
    overRuns: 0,
    overBalls: 0,
  };
}

export const defended = (s: State) => s.inn.target !== null && s.inn.runs < s.inn.target;

/** The computer swings harder as the required rate climbs. */
export function aggression(inn: Innings): number {
  const need = (inn.target ?? 0) - inn.runs;
  const left = Math.max(1, inn.maxBalls - inn.balls);
  return clamp((need / left) * 0.35, 0.1, 0.9);
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  const o = updateBowling(
    s.flow,
    dt,
    input,
    VIEW,
    s.batter,
    s.field,
    aggression(s.inn),
    s.meter,
    random,
  );
  s.events.push(...s.flow.events);
  s.flow.events.length = 0;
  if (o) {
    addOutcome(s.inn, o);
    if (o.out === 'bowled') s.bowled += 1;
    s.overRuns += o.runs + o.extras;
    if (!o.rebowl) s.overBalls += 1;
    if (s.overBalls === 6) {
      if (s.overRuns === 0) s.maidens += 1;
      s.overBalls = 0;
      s.overRuns = 0;
    }
    const dots = s.inn.log.filter((l) => l === '0').length;
    s.score = s.inn.wickets * 100 + dots * 10;
  }
  if (resultDone(s.flow)) {
    if (inningsOver(s.inn)) {
      if (defended(s)) s.score += 300 + ((s.inn.target ?? 0) - s.inn.runs) * 10;
      s.over = true;
      s.events.push(defended(s) ? 'levelComplete' : 'gameOver');
      return;
    }
    nextBall(s.flow, false);
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  drawFlow(ctx, VIEW, s.flow, true);
  drawScoreboard(ctx, W, s.inn, 'COMPUTER CHASING');
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Computer', value: `${s.inn.runs}/${s.inn.wickets}` },
    { label: 'Overs', value: oversText(s.inn.balls) },
    { label: 'Defending', value: (s.inn.target ?? 1) - 1 },
  ],
  result: (s) => ({
    score: s.score,
    won: defended(s),
    lost: !defended(s),
    title: defended(s)
      ? `Defended! The computer fell ${(s.inn.target ?? 0) - s.inn.runs} short`
      : 'The computer chased it down',
    details: [
      { label: 'Computer', value: `${s.inn.runs}/${s.inn.wickets} (${oversText(s.inn.balls)} ov)` },
      { label: 'Wickets', value: String(s.inn.wickets) },
      { label: 'Dot balls', value: String(s.inn.log.filter((l) => l === '0').length) },
    ],
  }),
  onEnd: (s, difficulty) => {
    if (s.inn.wickets > 0) void reportProgress('cricket-bowling.wicket', 1);
    if (s.bowled > 0) void reportProgress('cricket-bowling.bowled', 1);
    if (s.maidens > 0) void reportProgress('cricket-bowling.maiden', 1);
    void incrementProgress('cricket-bowling.wickets', s.inn.wickets);
    if (!defended(s)) return;
    void reportProgress('cricket-bowling.defend', 1);
    if (difficulty === 'hard') void reportProgress('cricket-bowling.hard', 1);
  },
  touch: {
    pad: 'dpad',
    buttons: [
      { action: 'action', label: 'Bowl' },
      { action: 'action2', label: 'Pace/Spin' },
    ],
  },
  pointerStarts: false,
  startHint:
    'Set your target on the pitch, choose pace or spin, then release in the green. Defend the total in 3 overs!',
};
