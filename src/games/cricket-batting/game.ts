import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { fillRound, text } from '../_shared/arcade/draw';
import {
  BOWLER,
  FIELD_CFG,
  addOutcome,
  inningsOver,
  newInnings,
  oversText,
} from '../_shared/cricket/cricket';
import type { BowlerCfg, FieldCfg, Innings } from '../_shared/cricket/cricket';
import { drawFlow, newFlow, nextBall, resultDone, updateBatting } from '../_shared/cricket/flow';
import type { BallFlow } from '../_shared/cricket/flow';
import { drawScoreboard } from '../_shared/cricket/scoreboard';
import { pitchView } from '../_shared/cricket/view';

/** Chase a target in three overs against a computer bowler. */
export const W = 420;
export const H = 600;
const VIEW = pitchView(W, H);
export const TARGETS: Record<DifficultySetting, number> = { easy: 24, normal: 30, hard: 36 };

export interface State extends BaseState {
  inn: Innings;
  flow: BallFlow;
  bowler: BowlerCfg;
  field: FieldCfg;
}

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    inn: newInnings(3, 3, TARGETS[difficulty]),
    flow: newFlow(true),
    bowler: BOWLER[difficulty],
    field: FIELD_CFG[difficulty],
  };
}

export const won = (s: State) => s.inn.target !== null && s.inn.runs >= s.inn.target;

export function update(s: State, dt: number, input: Input, random: () => number) {
  const o = updateBatting(s.flow, dt, input, VIEW, s.bowler, s.field, random);
  s.events.push(...s.flow.events);
  s.flow.events.length = 0;
  if (o) {
    addOutcome(s.inn, o);
    s.score = s.inn.runs * 10 + s.inn.fours * 10 + s.inn.sixes * 20;
  }
  if (resultDone(s.flow)) {
    if (inningsOver(s.inn)) {
      if (won(s)) s.score += 200 + (s.inn.maxBalls - s.inn.balls) * 10;
      s.over = true;
      s.events.push(won(s) ? 'levelComplete' : 'gameOver');
      return;
    }
    nextBall(s.flow, true);
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  drawFlow(ctx, VIEW, s.flow, false);
  drawScoreboard(ctx, W, s.inn, 'YOU BATTING');
  if (s.flow.phase !== 'result') {
    fillRound(ctx, 12, H - 40, W - 24, 30, 8, 'rgba(15,23,42,0.7)');
    text(ctx, 'Space / tap: swing · ← leg ↑ loft → off (or tap left/top/right)', W / 2, H - 25, {
      size: 11,
      weight: 600,
    });
  }
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: `${s.inn.runs}/${s.inn.wickets}` },
    { label: 'Overs', value: oversText(s.inn.balls) },
    { label: 'Target', value: s.inn.target ?? '–' },
  ],
  result: (s) => ({
    score: s.score,
    won: won(s),
    lost: !won(s),
    title: won(s)
      ? `Target chased with ${s.inn.maxBalls - s.inn.balls} balls to spare!`
      : `Fell short: ${s.inn.runs}/${s.inn.wickets}`,
    details: [
      { label: 'Runs', value: `${s.inn.runs} off ${s.inn.balls} balls` },
      { label: 'Fours / sixes', value: `${s.inn.fours} / ${s.inn.sixes}` },
      { label: 'Wickets lost', value: String(s.inn.wickets) },
    ],
  }),
  onEnd: (s, difficulty) => {
    if (s.inn.fours) void reportProgress('cricket-batting.four', 1);
    if (s.inn.sixes) void reportProgress('cricket-batting.six', 1);
    void reportProgress('cricket-batting.runs', s.inn.runs);
    void incrementProgress('cricket-batting.sixes', s.inn.sixes);
    if (!won(s)) return;
    void reportProgress('cricket-batting.chase', 1);
    if (difficulty === 'hard') void reportProgress('cricket-batting.hard', 1);
  },
  touch: { pad: 'dpad', buttons: [{ action: 'action', label: 'Swing' }] },
  startHint:
    'Time your swing as the ball arrives. Hold ← / → to pick the side and ↑ to loft. Chase the target in 3 overs!',
};
