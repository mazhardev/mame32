import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'gomoku',
  title: 'Gomoku',
  category: 'board',
  difficulty: 'medium',
  icon: '⚪',
  tags: ['five in a row', 'stones', 'classic', 'ai', 'two player', 'strategy'],
  short: 'Get five stones in a row on a 15×15 board before your opponent.',
  full: 'Gomoku, also called five in a row, is played with black and white stones on the crossings of a 15×15 grid. Take turns placing one stone at a time; the first to make an unbroken line of five wins. Play the local computer at three strengths or a friend on the same device.',
  minutes: 8,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to a point and press Enter'],
    mouse: ['Click an empty point'],
    touch: ['Tap an empty point'],
  },
  instructions: {
    objective: 'Be first to make an unbroken line of five stones across, down or diagonally.',
    howToPlay: [
      'Black moves first. Players take turns placing one stone on an empty point.',
      'Stones never move or get captured.',
      'Five or more in a row, in any direction, wins.',
      'If the board fills up without a line of five, the game is a draw.',
    ],
    scoring: 'Beating the computer scores 1,000 minus 20 for each stone you used (minimum 100).',
    difficultyNotes: 'Easy: the computer picks among several good points and defends lightly. Normal: it takes the strongest point. Hard: it also checks what your best reply would be.',
    tips: ['An open four (four with both ends free) cannot be stopped.', 'Two open threes at once usually wins.', 'Always block an open three right away.'],
  },
  achievements: [
    ['win', 'Five Alive', 'Beat the computer.', 1, '⚪', 10],
    ['hard', 'Gomoku Master', 'Beat the computer on Hard.', 1, '🏆', 30],
    ['quick', 'Quick Five', 'Beat the computer using 12 stones or fewer.', 1, '⚡', 20],
  ],
  load: () => import('./GomokuGame'),
});
