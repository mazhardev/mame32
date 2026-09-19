import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'go',
  title: 'Go',
  category: 'board',
  difficulty: 'hard',
  icon: '⚪',
  tags: ['territory', 'stones', 'classic', 'strategy', 'ai', 'two player', 'weiqi', 'baduk'],
  short: 'Surround territory and capture stones in the ancient game of Go.',
  full: 'The ancient strategy game of surrounding territory. Play 9×9 Go against a Monte Carlo computer opponent that runs in your browser, or play a friend on a 9×9, 13×13 or 19×19 board. Uses area scoring with 7.5 points of komi for White.',
  minutes: 15,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to a point and press Enter'],
    mouse: ['Click an empty point; use Pass when you have nothing useful left to play'],
    touch: ['Tap an empty point; tap Pass to pass'],
  },
  instructions: {
    objective: 'Control more of the board — your stones plus the empty points only you surround — than your opponent.',
    howToPlay: [
      'Black (you) plays first. Players take turns placing a stone on an empty point.',
      'A stone or group with no empty neighbouring points (liberties) is captured and removed.',
      'You may not play a move that leaves your own group with no liberties unless it captures first.',
      'Ko: you cannot immediately retake a single stone that just captured one of yours.',
      'When both players pass in a row, the game ends and the board is scored.',
      'Scoring counts stones on the board, so capture any dead enemy stones inside your area before you pass.',
    ],
    scoring: 'Winning scores 300 plus 10 per point of margin (doubled on Hard).',
    difficultyNotes: 'Difficulty sets how many random playouts the computer runs: about 250 on Easy, 2,500 on Normal and up to 9,000 on Hard.',
    tips: ['Corners are easiest to claim, then edges, then the centre.', 'A group with two separate eyes can never be captured.', 'Don’t pass while the opponent still has stones inside your area.'],
  },
  achievements: [
    ['win', 'First Territory', 'Beat the computer.', 1, '⚪', 15],
    ['hard', 'Go Master', 'Beat the computer on Hard.', 1, '🏆', 40],
    ['big', 'Landslide', 'Beat the computer by 20 or more points.', 1, '🌄', 20],
  ],
  load: () => import('./GoGame'),
});
