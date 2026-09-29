import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'color-switch',
  title: 'Color Switch',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🎨',
  tags: ['colours', 'timing', 'tap', 'endless', 'reflex'],
  short: 'Hop a coloured ball through spinning obstacles — you may only pass your own colour.',
  full: 'A fast timing game. Tap to hop your ball upwards through spinning rings and sliding bars, but only through the part that matches the ball’s colour. Collect the stars in the middle of each obstacle and grab the colour switchers, which give the ball a new colour.',
  minutes: 2,
  controls: {
    keyboard: ['Space or ↑ to hop'],
    mouse: ['Click to hop'],
    touch: ['Tap to hop'],
  },
  instructions: {
    objective: 'Climb as high as you can and collect stars.',
    howToPlay: [
      'Each tap makes the ball hop upwards; without taps it falls.',
      'Pass through obstacles only where the colour matches your ball — touching any other colour ends the game.',
      'The four-colour orbs between obstacles switch your ball to a new colour.',
      'Falling off the bottom of the screen also ends the game.',
    ],
    scoring: 'One point per star.',
    difficultyNotes: 'Easy: slow spins and more room between obstacles. Hard: fast spins and tighter spacing.',
    tips: ['Hover below an obstacle with small taps until your colour lines up.', 'Double rings spin in opposite directions — wait for both colours.'],
    touchNotes: ['Tap anywhere on the game to hop.'],
  },
  achievements: [
    ['ten', 'Colour Coded', 'Collect 10 stars in one game.', 10, '🎨', 15],
    ['thirty', 'Spectrum Master', 'Collect 30 stars in one game.', 30, '🌈', 40],
    ['stars', 'Stargazer', 'Collect 300 stars in total.', 300, '⭐', 30],
  ],
  load: () => import('./ColorSwitchGame'),
});
