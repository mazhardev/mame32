import { reportProgress } from '@/achievements/AchievementService';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { render } from './draw';
import { ALL_KEYS, H, W, create, opponent, update } from './game';
import type { Mode, State } from './game';

export const ID = 'dojo-duel';

export function makeSpec(mode: () => Mode, p1: () => string, p2: () => string): ArcadeSpec<State> {
  return {
    width: W,
    height: H,
    create: (difficulty) => create(difficulty, mode(), p1(), p2()),
    update,
    render,
    hud: (s) =>
      s.mode === 'arcade'
        ? [
            { label: 'Fighter', value: s.p1.name },
            { label: 'Opponent', value: opponent(s).name },
            { label: 'Fight', value: `${s.rung + 1}/${s.ladder.length}` },
            { label: 'Score', value: s.score.toLocaleString() },
          ]
        : [
            { label: 'Player 1', value: `${s.p1.name} · ${s.battle.f[0].wins}` },
            { label: 'Player 2', value: `${opponent(s).name} · ${s.battle.f[1].wins}` },
            { label: 'Round', value: String(s.battle.round) },
          ],
    result: (s) => {
      const f = s.battle.f[0];
      if (s.mode === 'versus') {
        const w = s.matchWinner;
        return {
          title: w < 0 ? 'Draw game!' : `${s.battle.f[w].def.name} (Player ${w + 1}) wins!`,
          details: [
            { label: 'Rounds', value: `${s.battle.f[0].wins} – ${s.battle.f[1].wins}` },
            { label: 'Best combo', value: `${Math.max(f.stats.bestCombo, s.battle.f[1].stats.bestCombo)} hits` },
          ],
        };
      }
      const details = [
        { label: 'Fighter', value: s.p1.name },
        { label: 'Opponents beaten', value: `${s.stats.beaten} of ${s.ladder.length}` },
        { label: 'Best combo', value: `${s.stats.bestCombo} hits` },
        { label: 'Perfect rounds', value: String(s.stats.perfects) },
      ];
      return s.won
        ? { won: true, score: s.score, title: 'Arcade champion! 🏆', message: `${s.p1.name} has conquered the Last Gate.`, details }
        : { lost: true, score: s.score, title: `Defeated by ${opponent(s).name}`, message: 'Press Play Again to take another run at the ladder.', details };
    },
    onEnd: (s, difficulty) => {
      if (s.mode === 'versus') {
        void reportProgress(`${ID}.versus`, 1);
        return;
      }
      if (s.stats.beaten > 0) void reportProgress(`${ID}.first`, 1);
      if (s.stats.perfects > 0) void reportProgress(`${ID}.perfect`, 1);
      if (s.stats.superFinish) void reportProgress(`${ID}.super`, 1);
      void reportProgress(`${ID}.combo`, s.stats.bestCombo);
      if (s.stats.bossBeaten) void reportProgress(`${ID}.boss`, 1);
      if (s.won && difficulty === 'hard') void reportProgress(`${ID}.hard`, 1);
    },
    keys: {},
    customKeys: ALL_KEYS,
    touch: {
      pad: 'dpad',
      grid: true,
      buttons: [
        { action: 'action', label: 'P' },
        { action: 'action2', label: 'K' },
        { action: 'action3', label: 'SP' },
        { action: 'action4', label: '★' },
      ],
    },
    pointerStarts: true,
    startHint:
      'Arrows or WASD move and jump, ↓ crouches, hold away from your opponent to block. J punch · K kick · L special (with → or ↓ for others) · Space super when the meter is full.',
  };
}
