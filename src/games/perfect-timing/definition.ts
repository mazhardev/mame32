import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'perfect-timing',
  title: 'Perfect Timing',
  category: 'casual',
  difficulty: 'medium',
  icon: '⏱️',
  tags: ['timing', 'one button', 'precision', 'quick', 'casual'],
  short: 'Stop the sweeping needle inside the green zone — it gets smaller and faster every time.',
  full: 'A pure one-button timing test. A needle sweeps across a bar; tap to stop it inside the green target. Every hit shrinks the target, moves it somewhere new and speeds the needle up. Stop it in the yellow centre for a perfect worth double points. Miss three times and the game is over.',
  minutes: 2,
  controls: {
    keyboard: ['Space or Enter stops the needle'],
    mouse: ['Click to stop the needle'],
    touch: ['Tap to stop the needle'],
  },
  instructions: {
    objective: 'Score as many points as you can before missing three times.',
    howToPlay: [
      'Watch the white needle sweep back and forth.',
      'Tap when it is inside the green zone.',
      'After each stop the zone moves and the needle speeds up; hits also shrink the zone.',
      'Three misses end the game.',
    ],
    scoring: '10 points per hit, 20 for a perfect in the yellow centre. Every five hits in a row adds a multiplier.',
    difficultyNotes: 'Easy: slow needle and a wide zone. Hard: fast needle and a narrow zone that shrinks further.',
    tips: ['Tap as the needle approaches the zone, not when you see it inside — your reaction takes time.', 'Watch the direction the needle is moving.'],
  },
  achievements: [
    ['streak-10', 'In the Zone', 'Hit 10 in a row.', 10, '🎯', 15],
    ['perfect-5', 'Dead Centre', 'Get 5 perfects in one game.', 5, '⭐', 20],
    ['score-300', 'Clockwork', 'Score 300 points in one game.', 300, '🏆', 25],
    ['total', 'Precision Engineer', 'Get 100 perfects in total.', 100, '🎖️', 30],
  ],
  load: () => import('./PerfectTimingGame'),
});
