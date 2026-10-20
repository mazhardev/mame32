import { incrementProgress, reportProgress } from '@/achievements/AchievementService';
import type { ArcadeSpec } from '../_shared/arcade/kit';
import { render } from './draw';
import { SIZE, create, label, pocketedOf, update } from './game';
import type { Mode, State } from './game';
import { COINS } from './rules';

const ID = 'carrom';

function queenText(s: State): string {
  const q = s.board.queen;
  if (q === 'board') return 'On board';
  if (q === 'pending') return 'Cover it!';
  return label(s, q);
}

export function makeSpec(mode: () => Mode): ArcadeSpec<State> {
  return {
    width: SIZE,
    height: SIZE,
    create: (difficulty, random) => create(difficulty, random, mode()),
    update,
    render,
    hud: (s) => [
      { label: label(s, 'white'), value: `${pocketedOf(s, 'white')}/${COINS}` },
      { label: label(s, 'black'), value: `${pocketedOf(s, 'black')}/${COINS}` },
      { label: 'Queen', value: queenText(s) },
      s.mode === 'ai' ? { label: 'Score', value: s.playerScore.toLocaleString() } : { label: 'Turn', value: label(s, s.board.turn) },
    ],
    result: (s) => {
      const w = s.board.winner;
      const details = [
        { label: `${label(s, 'white')} pocketed`, value: `${pocketedOf(s, 'white')} of ${COINS}` },
        { label: `${label(s, 'black')} pocketed`, value: `${pocketedOf(s, 'black')} of ${COINS}` },
        { label: 'Board points', value: String(s.board.points) },
      ];
      if (s.mode === 'local') return { score: s.board.points, title: `${label(s, w ?? 'white')} wins the board!`, details };
      return {
        won: w === 'white',
        lost: w !== 'white',
        score: s.playerScore,
        title: w === 'white' ? 'You win the board! 🏆' : 'The computer wins this board',
        details,
      };
    },
    onEnd: (s) => {
      void incrementProgress(`${ID}.boards`);
      if (s.stats.queen) void reportProgress(`${ID}.queen`, 1);
      void reportProgress(`${ID}.double`, s.stats.best);
      if (s.mode === 'ai' && s.won) {
        void reportProgress(`${ID}.first-win`, 1);
        if (pocketedOf(s, 'black') === 0) void reportProgress(`${ID}.whitewash`, 1);
        if (s.difficulty === 'hard') void reportProgress(`${ID}.hard`, 1);
        if (s.stats.fouls === 0) void reportProgress(`${ID}.clean`, 1);
      }
    },
    touch: { pad: 'none' },
    pointerStarts: true,
    startHint: 'Drag the striker along your baseline, then pull back and let go to shoot. Keyboard: ← → place, ↑ ↓ aim, hold Space for power.',
  };
}
