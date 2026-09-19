import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'hex',
  title: 'Hex',
  category: 'board',
  difficulty: 'medium',
  icon: '⬢',
  tags: ['connection', 'hexagon', 'classic', 'ai', 'two player', 'strategy'],
  short: 'Link your two sides of a diamond of hexagons before your opponent.',
  full: 'Hex is a pure connection game with no draws. Red tries to join the top and bottom edges with an unbroken chain of hexagons; Blue tries to join left and right. Play a local computer opponent or a friend on the same device, on a 7×7, 9×9 or 11×11 board.',
  minutes: 8,
  multiplayer: 'vs-ai',
  hasLevels: true,
  controls: {
    keyboard: ['Tab to a hexagon and press Enter or Space'],
    mouse: ['Click an empty hexagon'],
    touch: ['Tap an empty hexagon'],
  },
  instructions: {
    objective: 'Make an unbroken chain of your colour linking your two edges of the board.',
    howToPlay: [
      'Red (you) moves first and owns the top and bottom edges.',
      'Blue owns the left and right edges.',
      'Take turns filling one empty hexagon. Stones never move.',
      'Hexagons that share a side are connected. The first player to link their edges wins — a draw is impossible.',
    ],
    scoring: 'A win scores 150 points per board row, minus 10 for each stone you used (minimum 100).',
    difficultyNotes: 'Difficulty sets the board size: Easy 7×7, Normal 9×9, Hard 11×11. On Hard the computer also considers your best reply.',
    tips: [
      'Two stones with two shared empty neighbours form a “bridge” that cannot be cut.',
      'Blocking from a distance works better than blocking right next to a stone.',
      'The centre is the strongest opening.',
    ],
  },
  achievements: [
    ['win', 'Connected', 'Beat the computer.', 1, '⬢', 10],
    ['hard', 'Hex Master', 'Beat the computer on the 11×11 board.', 1, '🏆', 30],
    ['direct', 'Straight Shot', 'Win using at most two more stones than the board has rows.', 1, '➡️', 20],
  ],
  load: () => import('./HexGame'),
});
