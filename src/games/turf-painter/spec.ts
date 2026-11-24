import { reportProgress } from '@/achievements/AchievementService';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { render } from './draw';
import { H, W, create, update } from './engine';
import type { State } from './engine';

export const ID = 'turf-painter';
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

export const spec: ArcadeSpec<State> = {
  width: W,
  height: H,
  create: (difficulty, random) => create(difficulty, random),
  update,
  render,
  hud: (s) => [
    { label: 'Your land', value: pct(s.share) },
    { label: 'Goal', value: `${Math.round(s.cfg.goal * 100)}%` },
    { label: 'Knockouts', value: String(s.players[0].kills) },
  ],
  result: (s) => ({
    won: s.won,
    lost: !s.won,
    score: s.score,
    title: s.won ? 'The map is yours! 🎨' : 'Knocked out',
    message: s.won ? `You painted ${pct(s.share)} of the map.` : s.cause || 'Your run is over.',
    details: [
      { label: 'Best share', value: pct(s.best) },
      { label: 'Knockouts', value: String(s.players[0].kills) },
    ],
  }),
  onEnd: (s, difficulty) => {
    void reportProgress(`${ID}.share`, Math.round(s.best * 100));
    if (s.players[0].kills > 0) void reportProgress(`${ID}.ko`, 1);
    if (s.won) void reportProgress(`${ID}.win`, 1);
    if (s.won && difficulty === 'hard') void reportProgress(`${ID}.hard`, 1);
  },
  touch: { pad: 'dpad' },
  pointerStarts: true,
  startHint: 'Swipe on the map (or use the arrows / WASD) to turn. Leave your blue land, draw a loop and come back to claim it. Don’t let anyone touch your trail!',
};
