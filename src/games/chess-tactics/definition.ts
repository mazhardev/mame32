import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'chess-tactics',
  title: 'Chess Tactics',
  category: 'brain',
  difficulty: 'hard',
  icon: '♞',
  tags: ['chess', 'tactics', 'training', 'forks', 'pins', 'timed', 'puzzles'],
  short: 'Timed chess training: spot the move that wins material.',
  full: 'Sharpen your tactical vision. Each round gives you ten original chess positions where one move wins material — a fork, a pin, a skewer or a loose piece. Find it before the clock runs out. Every position was checked by a chess engine so the best move stands clearly above the rest.',
  minutes: 6,
  multiplayer: 'single',
  controls: {
    keyboard: ['Tab to a piece and press Enter, then Tab to a marked square and press Enter'],
    mouse: ['Click a piece, then click a marked square'],
    touch: ['Tap a piece, then tap a marked square'],
  },
  instructions: {
    objective: 'Find the winning move in as many of the ten positions as you can.',
    howToPlay: [
      'Press Start. The side to move is at the bottom of the board.',
      'You get one try per position. Play the move you think wins material.',
      'If you miss, or time runs out, the winning move is highlighted.',
      'Press Next to continue. After ten positions your round is scored.',
    ],
    scoring: '100 points per correct answer plus 2 points for every second left on the clock.',
    difficultyNotes: 'Easy: 60 seconds per position. Normal: 40 seconds. Hard: 25 seconds.',
    tips: ['Check every capture, check and threat.', 'Look for undefended pieces and pieces lined up with the enemy king.', 'Knights are masters of forks.'],
  },
  achievements: [
    ['round', 'In Training', 'Complete a round of tactics.', 1, '♞', 5],
    ['score', 'Sharp Eye', 'Find 8 tactics in a single round.', 8, '🎯', 20],
    ['streak', 'On a Roll', 'Find 5 tactics in a row.', 5, '🔥', 15],
    ['perfect', 'Tactical Genius', 'Score 10 out of 10 on Hard.', 1, '🏆', 40],
  ],
  load: () => import('./ChessTacticsGame'),
});
