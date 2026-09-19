import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'reversi',
  title: 'Reversi',
  category: 'board',
  difficulty: 'medium',
  icon: '⚫',
  tags: ['flip', 'discs', 'classic', 'ai', 'two player', 'strategy'],
  short: 'Outflank and flip your opponent’s discs to own the board.',
  full: 'The classic disc-flipping strategy game. Place a disc so that it traps a line of your opponent’s discs between two of yours, and they all flip to your colour. Whoever has the most discs when the board fills wins.',
  minutes: 10,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['Tab to a square and press Enter'],
    mouse: ['Click a square marked with a dot'],
    touch: ['Tap a square marked with a dot'],
  },
  instructions: {
    objective: 'Have more discs of your colour than your opponent when neither player can move.',
    howToPlay: [
      'Black moves first. Dots show where you can play.',
      'A move must trap at least one straight line (across, down or diagonal) of opponent discs between your new disc and another of yours.',
      'All trapped discs flip to your colour.',
      'If you have no legal move, your turn passes automatically.',
      'The game ends when neither player can move.',
    ],
    scoring: 'A win against the computer scores 20 points for every disc you own at the end.',
    difficultyNotes: 'Easy: the computer looks one move ahead and sometimes plays randomly. Normal: three moves. Hard: up to six moves.',
    tips: ['Corners can never be flipped — grab them.', 'Avoid the squares right next to an empty corner.', 'Having more moves available matters more than having more discs early on.'],
  },
  achievements: [
    ['win', 'Flipped!', 'Beat the computer.', 1, '⚫', 10],
    ['hard', 'Reversi Master', 'Beat the computer on Hard.', 1, '🏆', 30],
    ['discs', 'Landslide', 'Finish a winning game with 45 or more discs.', 45, '🌊', 20],
  ],
  load: () => import('./ReversiGame'),
});
