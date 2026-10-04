import type { DifficultySetting } from '@/types';
import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import { baseState } from '../_shared/arcade/kit';
import type { ArcadeSpec, BaseState, Input } from '../_shared/arcade/kit';
import { fillRound, text } from '../_shared/arcade/draw';
import {
  BATTER,
  BOWLER,
  FIELD_CFG,
  addOutcome,
  inningsOver,
  newInnings,
  oversText,
} from '../_shared/cricket/cricket';
import type { Innings } from '../_shared/cricket/cricket';
import {
  drawFlow,
  newFlow,
  nextBall,
  resultDone,
  updateBatting,
  updateBowling,
} from '../_shared/cricket/flow';
import type { BallFlow } from '../_shared/cricket/flow';
import { drawScoreboard } from '../_shared/cricket/scoreboard';
import { pitchView } from '../_shared/cricket/view';

/**
 * A super over decider: bat one over with two wickets, then bowl one over
 * while the computer chases your total. Level scores go to boundary count.
 */
export const W = 420;
export const H = 600;
const VIEW = pitchView(W, H);
const METER: Record<DifficultySetting, number> = { easy: 0.55, normal: 0.75, hard: 0.95 };

export type Stage = 'bat' | 'break' | 'bowl';

export interface State extends BaseState {
  stage: Stage;
  stageT: number;
  mine: Innings;
  theirs: Innings;
  flow: BallFlow;
  difficulty: DifficultySetting;
}

export function create(difficulty: DifficultySetting): State {
  return {
    ...baseState(),
    stage: 'bat',
    stageT: 0,
    mine: newInnings(1, 2),
    theirs: newInnings(1, 2),
    flow: newFlow(true),
    difficulty,
  };
}

const boundaries = (i: Innings) => i.fours + i.sixes;

/** 1 = you win, −1 = computer wins, 0 = tie (only when the match is over). */
export function verdict(s: State): 1 | 0 | -1 {
  if (s.theirs.runs > s.mine.runs) return -1;
  if (s.theirs.runs < s.mine.runs) return 1;
  const b = boundaries(s.mine) - boundaries(s.theirs);
  return b > 0 ? 1 : b < 0 ? -1 : 0;
}

export function update(s: State, dt: number, input: Input, random: () => number) {
  s.stageT += dt;
  const d = s.difficulty;
  if (s.stage === 'break') {
    if (
      s.stageT > 2.6 ||
      (s.stageT > 0.6 && (input.pressed.has('action') || input.pointer.pressed))
    ) {
      s.stage = 'bowl';
      s.stageT = 0;
      s.flow = newFlow(false);
    }
    return;
  }
  const batting = s.stage === 'bat';
  const inn = batting ? s.mine : s.theirs;
  const o = batting
    ? updateBatting(s.flow, dt, input, VIEW, BOWLER[d], FIELD_CFG[d], random)
    : updateBowling(s.flow, dt, input, VIEW, BATTER[d], FIELD_CFG[d], 0.55, METER[d], random);
  s.events.push(...s.flow.events);
  s.flow.events.length = 0;
  if (o) {
    addOutcome(inn, o);
    s.score = s.mine.runs * 10 + s.theirs.wickets * 60;
  }
  if (resultDone(s.flow)) {
    if (inningsOver(inn)) {
      if (batting) {
        s.theirs.target = s.mine.runs + 1;
        s.stage = 'break';
        s.stageT = 0;
        return;
      }
      if (verdict(s) === 1) s.score += 400;
      s.over = true;
      s.events.push(verdict(s) === 1 ? 'levelComplete' : 'gameOver');
      return;
    }
    nextBall(s.flow, batting);
  }
}

export function render(ctx: CanvasRenderingContext2D, s: State) {
  const batting = s.stage === 'bat';
  drawFlow(ctx, VIEW, s.flow, !batting);
  drawScoreboard(
    ctx,
    W,
    batting ? s.mine : s.theirs,
    batting ? 'SUPER OVER · YOU BAT' : 'SUPER OVER · COMPUTER CHASING',
  );
  if (s.stage === 'break') {
    fillRound(ctx, 30, H / 2 - 70, W - 60, 140, 16, 'rgba(15,23,42,0.92)');
    text(ctx, `You made ${s.mine.runs}/${s.mine.wickets}`, W / 2, H / 2 - 32, { size: 22 });
    text(ctx, `The computer needs ${s.mine.runs + 1} to win`, W / 2, H / 2 + 4, {
      size: 17,
      color: '#fde68a',
    });
    text(ctx, 'Now you bowl — tap or Space', W / 2, H / 2 + 38, {
      size: 13,
      color: '#cbd5e1',
      weight: 500,
    });
  } else if (batting && s.flow.phase !== 'result') {
    fillRound(ctx, 12, H - 40, W - 24, 30, 8, 'rgba(15,23,42,0.7)');
    text(ctx, 'Space / tap: swing · ← leg ↑ loft → off', W / 2, H - 25, { size: 11, weight: 600 });
  }
}

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create,
  update,
  render,
  hud: (s) => [
    { label: 'You', value: `${s.mine.runs}/${s.mine.wickets}` },
    { label: 'Computer', value: s.stage === 'bat' ? '–' : `${s.theirs.runs}/${s.theirs.wickets}` },
    { label: 'Overs', value: oversText(s.stage === 'bat' ? s.mine.balls : s.theirs.balls) },
  ],
  result: (s) => {
    const v = verdict(s);
    const tieBreak = s.mine.runs === s.theirs.runs;
    return {
      score: s.score,
      won: v === 1,
      lost: v === -1,
      title:
        v === 1
          ? tieBreak
            ? 'Scores level — you win on boundaries!'
            : 'You win the super over!'
          : v === -1
            ? tieBreak
              ? 'Scores level — computer wins on boundaries'
              : 'The computer wins the super over'
            : 'A perfect tie!',
      details: [
        {
          label: 'You',
          value: `${s.mine.runs}/${s.mine.wickets} (${boundaries(s.mine)} boundaries)`,
        },
        {
          label: 'Computer',
          value: `${s.theirs.runs}/${s.theirs.wickets} (${boundaries(s.theirs)} boundaries)`,
        },
      ],
    };
  },
  onEnd: (s, difficulty) => {
    if (s.mine.sixes >= 2) void reportProgress('cricket-super-over.sixes', 1);
    void incrementProgress('cricket-super-over.played', 1);
    if (verdict(s) !== 1) return;
    void reportProgress('cricket-super-over.win', 1);
    if (s.mine.runs <= 8) void reportProgress('cricket-super-over.defend', 1);
    if (difficulty === 'hard') void reportProgress('cricket-super-over.hard', 1);
  },
  touch: {
    pad: 'dpad',
    buttons: [
      { action: 'action', label: 'Swing / Bowl' },
      { action: 'action2', label: 'Pace/Spin' },
    ],
  },
  pointerStarts: false,
  startHint:
    'Bat one over (2 wickets), then bowl one over to defend it. Level scores are decided by boundaries.',
};
