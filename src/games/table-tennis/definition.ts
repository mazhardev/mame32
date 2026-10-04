import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'table-tennis',
  title: 'Table Tennis',
  category: 'sports',
  difficulty: 'easy',
  icon: '🏓',
  tags: ['ping pong', 'rally', 'ai', 'sports', 'paddle'],
  short: 'Rally against the computer in a game of table tennis to 11 points.',
  full: 'A fast game of table tennis seen from above. Slide along your end of the table and your paddle plays the ball automatically — where the ball meets the paddle, and the arrow you hold at contact, decide where your return lands. Each shot must bounce once on the other side; hit the net or miss the table and the point goes to your opponent. First to 11 points, win by two.',
  minutes: 4,
  multiplayer: 'vs-ai',
  controls: {
    keyboard: [
      '← → move',
      'Hold ← or → at contact to aim',
      '↑ deep shot, ↓ short shot',
      'Space serves',
    ],
    mouse: ['Move the mouse to slide; click to serve'],
    touch: ['Drag along the bottom of the table to move', 'Tap to serve'],
  },
  instructions: {
    objective: 'Win 11 points before the computer, with a two-point lead.',
    howToPlay: [
      'Get in line with the ball after it bounces on your side; your paddle plays it automatically.',
      'Balls caught on the edge of the paddle fly wider, and sometimes off the table.',
      'Hold ← or → as you hit to angle the return, ↑ for a deep shot or ↓ for a short one.',
      'Service changes every two points, and every point from 10–10.',
    ],
    scoring:
      '10 points per rally won, 2 per shot in your longest rally, and 100 for winning the game.',
    difficultyNotes:
      'On Hard the computer moves faster, hits harder, places the ball away from you and rarely misses. Easy shows where its shots will land.',
    tips: [
      'Angled shots from the paddle edge are the quickest winners — and the riskiest.',
      'Return to the middle after each shot.',
    ],
    touchNotes: ['Keep your finger low on the screen so you can see the ball.'],
  },
  achievements: [
    ['win', 'First Game', 'Beat the computer.', 1, '🏓', 15],
    ['rally', 'Marathon Rally', 'Play a rally of 15 shots.', 15, '🔁', 20],
    ['comeback', 'Comeback', 'Win after trailing by 5 points.', 1, '📈', 30],
    ['hard', 'Table Master', 'Win on Hard.', 1, '🏆', 35],
    ['wins', 'Club Champion', 'Win 10 games.', 10, '🎖️', 30],
  ],
  load: () => import('./TableTennisGame'),
});
