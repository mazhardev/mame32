import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'bottle-flip',
  title: 'Bottle Flip',
  category: 'casual',
  difficulty: 'medium',
  icon: '🍾',
  tags: ['physics', 'timing', 'one button', 'quick', 'casual'],
  short: 'Charge, release and flip the water bottle — land it standing upright.',
  full: 'The famous bottle-flip challenge, on screen. Hold to charge a bouncing power meter and release to toss the bottle. More power means a higher toss and a faster spin. It only lands upright if it has turned a whole number of times when it comes down. Find the sweet spot for a single flip, then go for a double.',
  minutes: 2,
  controls: {
    keyboard: ['Hold Space to charge, release to flip'],
    mouse: ['Hold the mouse button, release to flip'],
    touch: ['Hold your finger down, release to flip'],
  },
  instructions: {
    objective: 'Land as many flips in a row as you can before failing three times.',
    howToPlay: [
      'Hold to charge. The power meter rises and falls while you hold.',
      'Release to toss the bottle. Power controls height and spin together.',
      'The bottle must make at least one full turn and land upright.',
      'Three failed flips end the round.',
    ],
    scoring: '10 points per turn of a successful flip, multiplied by your streak (up to ×5). A double flip scores twice as much.',
    difficultyNotes: 'Higher difficulty narrows how close to upright the bottle must be.',
    tips: ['Note the meter height of your first good flip and repeat it.', 'Double flips need much more power; look for the band near the top of the meter.'],
    touchNotes: ['Press and hold anywhere on the play area.'],
  },
  achievements: [
    ['first', 'Flip It', 'Land your first flip.', 1, '🍾', 10],
    ['streak-5', 'Hot Streak', 'Land 5 flips in a row.', 5, '🔥', 20],
    ['double', 'Double Trouble', 'Land a double flip.', 1, '🌀', 20],
    ['total', 'Hydration Station', 'Land 100 flips in total.', 100, '🎖️', 30],
  ],
  load: () => import('./BottleFlipGame'),
});
