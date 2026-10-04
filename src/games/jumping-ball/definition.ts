import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'jumping-ball',
  title: 'Jumping Ball',
  category: 'casual',
  difficulty: 'easy',
  icon: '🏀',
  tags: ['timing', 'one button', 'endless', 'jump', 'casual'],
  short: 'A bouncing ball rolls on — time big leaps over walls and stay low under the bars.',
  full: 'The ball keeps bouncing with small hops all by itself. One tap turns the next bounce into a big leap. Small hops clear low hurdles, big leaps clear tall walls — but floating bars must be passed underneath, so jumping at the wrong moment is just as risky as not jumping. Collect coins for bonus points as the pace keeps rising.',
  minutes: 2,
  controls: {
    keyboard: ['Space, Enter or Up arrow queues a big leap'],
    mouse: ['Click to queue a big leap'],
    touch: ['Tap to queue a big leap'],
  },
  instructions: {
    objective: 'Travel as far as you can without touching an obstacle.',
    howToPlay: [
      'The ball hops automatically with small bounces.',
      'Tap to charge the ball (it turns orange); its next bounce becomes a big leap.',
      'Orange hurdles are low: a small hop clears them. Red walls need a big leap.',
      'Purple bars float in the air: stay low and pass underneath.',
    ],
    scoring: '10 points per obstacle passed and 25 per coin.',
    difficultyNotes: 'Higher difficulty starts faster. Speed increases over time on every level.',
    tips: ['Charge just after a bounce so the leap happens right before the wall.', 'Do not charge when a purple bar is coming.'],
    touchNotes: ['Tap anywhere on the play area.'],
  },
  achievements: [
    ['clear-20', 'Hopper', 'Clear 20 obstacles in one run.', 20, '🏀', 15],
    ['score-500', 'Bouncing High', 'Score 500 points in one run.', 500, '🏆', 25],
    ['coins-10', 'Coin Catcher', 'Collect 10 coins in one run.', 10, '🪙', 15],
    ['total', 'Rubber Legs', 'Clear 300 obstacles in total.', 300, '🎖️', 30],
  ],
  load: () => import('./JumpingBallGame'),
});
