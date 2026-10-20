import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'carrom',
  title: 'Carrom',
  category: 'board',
  difficulty: 'medium',
  icon: '🪙',
  tags: ['carrom', 'board', 'flick', 'striker', 'two-player', 'vs computer', 'physics', 'classic'],
  short: 'Flick the striker to pocket your coins and cover the queen — vs the computer or a friend.',
  full: 'The classic board game of carrom, played with realistic sliding and bouncing coins. Place your striker on your baseline, aim and flick it to knock your coins into the four corner pockets. Pocket the red queen and cover it with one of your own coins for bonus points, avoid pocketing the striker, and clear all nine of your coins before your opponent does. Play against a computer opponent with three skill levels, or pass the device between two players.',
  minutes: 10,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: ['← → move the striker along your baseline', '↑ ↓ turn the aim', 'Hold Space for power, release to shoot', 'Hold X or Shift for fine adjustment'],
    mouse: ['Drag the striker sideways to place it', 'Press anywhere else, pull back and release to shoot'],
    touch: ['Drag the striker sideways to place it', 'Touch anywhere else, pull back and let go to shoot'],
  },
  instructions: {
    objective: 'Pocket all nine of your coins before your opponent — and make sure the red queen has been covered.',
    howToPlay: [
      'You play the light coins from the bottom of the board; your opponent plays the dark coins from the top.',
      'Place the striker anywhere along your baseline (it may not touch a coin), aim, and flick it into the coins. The dotted guide shows where the striker will hit and which way the coin will go.',
      'Pocket one of your own coins and you shoot again. Pocketing your opponent’s coins helps them, not you.',
      'The red queen can be pocketed once you have pocketed at least one of your own coins. You must then cover it by pocketing one of your coins in the same or the next shot, or it goes back to the centre.',
      'Pocketing the striker is a foul: the coins you pocketed in that shot come back, and so does one penalty coin.',
      'You may not pocket your last coin while the queen is still uncovered. The first player to clear all their coins wins the board.',
    ],
    scoring: 'The winner of a board scores one point for every coin the opponent has left, plus three for the queen if they covered it. Your game score: 100 per coin you keep pocketed, 300 for covering the queen and 500 plus 50 per board point for a win.',
    difficultyNotes: 'Easy: the computer looks at few shots and aims loosely. Normal: steady and accurate. Hard: plans many shots ahead and rarely misses.',
    tips: [
      'Coins near the pockets are the easiest shots — plan to leave yours there and break up your opponent’s.',
      'Thin cuts need more power; straight shots need less.',
      'Use the cushions: a coin pressed against the rail runs along it into the corner.',
      'Choose "2 players" above the board to play a friend on the same device.',
    ],
    touchNotes: ['Drag the striker along the line to place it, then touch the board, pull back and let go to shoot.'],
  },
  achievements: [
    ['first-win', 'First Board', 'Beat the computer.', 1, '🪙', 15],
    ['queen', 'Royal Cover', 'Pocket and cover the queen.', 1, '👑', 15],
    ['double', 'Two in One', 'Pocket two coins with one shot.', 2, '🎯', 20],
    ['clean', 'Clean Game', 'Beat the computer without a foul.', 1, '✨', 20],
    ['whitewash', 'Whitewash', 'Beat the computer before it pockets a single coin.', 1, '🧹', 40],
    ['hard', 'Carrom Master', 'Beat the computer on Hard.', 1, '🏆', 50],
    ['boards', 'Regular', 'Play 10 boards.', 10, '🔟', 20],
  ],
  load: () => import('./CarromGame'),
});
