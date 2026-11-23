import { reportProgress } from '@/achievements/AchievementService';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { render } from './draw';
import { H, W, ballsLeft, create, needed, update, type State } from './engine';

export const ID = 'cricket-fielding';

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create: (difficulty) => create(difficulty),
  update,
  render,
  hud: (s) => [
    { label: 'Score', value: `${s.total}/${s.wickets}` },
    { label: 'Need', value: `${needed(s)} off ${ballsLeft(s)}` },
    { label: 'Points', value: s.score.toLocaleString() },
  ],
  result: (s) => {
    const won = s.result === 'won';
    return {
      won,
      lost: !won,
      score: s.score,
      title: won ? 'Target defended! 🏏' : 'They chased it down',
      message: won
        ? s.wickets >= s.cfg.wickets
          ? `All out for ${s.total}: ${s.cfg.target - 1 - s.total} runs to spare.`
          : `Held them to ${s.total}/${s.wickets}, ${s.cfg.target - 1 - s.total} short of the target.`
        : `They reached ${s.total}/${s.wickets} with ${ballsLeft(s)} ball${ballsLeft(s) === 1 ? '' : 's'} left.`,
      details: [
        { label: 'Wickets', value: String(s.wickets) },
        { label: 'Catches', value: String(s.stats.catches) },
        { label: 'Run-outs', value: String(s.stats.runOuts) },
        { label: 'Dot balls', value: String(s.stats.dots) },
      ],
    };
  },
  onEnd: (s, difficulty) => {
    if (s.stats.catches > 0) void reportProgress(`${ID}.catch`, 1);
    if (s.stats.directHits > 0) void reportProgress(`${ID}.direct`, 1);
    if (s.result === 'won') void reportProgress(`${ID}.win`, 1);
    if (s.result === 'won' && difficulty === 'hard') void reportProgress(`${ID}.hard`, 1);
    if (s.wickets >= s.cfg.wickets) void reportProgress(`${ID}.allout`, 1);
    void reportProgress(`${ID}.dots`, s.stats.dots);
  },
  customKeys: ['k', 'b', '1', '2'],
  touch: {
    pad: 'dpad',
    buttons: [
      { action: 'action', label: 'Dive' },
      { action: 'action3', label: '▲ Bowler' },
      { action: 'action2', label: '▼ Keeper' },
    ],
  },
  pointerStarts: true,
  startHint:
    'The computer bats, you field. Drag on the field (or use the arrows / WASD) to run, Space to dive. Holding the ball? Tap a set of stumps, or press B (bowler’s end) or K (keeper’s end) to throw.',
};
