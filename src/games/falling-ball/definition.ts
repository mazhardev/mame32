import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'falling-ball',
  title: 'Falling Ball',
  category: 'casual',
  difficulty: 'medium',
  icon: '⚽',
  tags: ['falling', 'dodge', 'endless', 'reflex', 'casual'],
  short: 'Floors keep rising — steer the ball through the gaps before you hit the ceiling.',
  full: 'An endless fall. Floors with a single gap scroll up the screen, faster and faster. Roll left and right to drop through each gap. If the floors carry you up into the spiked ceiling, or you land on a red spiked floor, the run is over.',
  minutes: 2,
  controls: {
    keyboard: ['← → or A / D roll the ball'],
    mouse: ['Hold the left or right half of the play area'],
    touch: ['Hold the left or right half of the screen, or use the arrow buttons'],
  },
  instructions: {
    objective: 'Fall through as many floors as possible.',
    howToPlay: [
      'Each floor has one gap. Roll into it to drop to the next floor.',
      'Floors rise steadily and speed up over time.',
      'Touching the spiked ceiling ends the run.',
      'On Normal and Hard some floors are red and spiked: never land on them.',
    ],
    scoring: 'One point per floor you fall through.',
    difficultyNotes: 'Easy: wide gaps, slow floors, no spiked floors. Hard: narrow gaps, fast floors and more spikes.',
    tips: ['Look one floor ahead and start rolling early.', 'Stay low on the screen to give yourself time.'],
    touchNotes: ['Hold your thumb on the side you want to roll towards.'],
  },
  achievements: [
    ['floors-25', 'Going Down', 'Fall through 25 floors in one run.', 25, '⬇️', 15],
    ['floors-75', 'Freefall', 'Fall through 75 floors in one run.', 75, '🏆', 30],
    ['total', 'Gravity Fan', 'Fall through 500 floors in total.', 500, '🎖️', 30],
  ],
  load: () => import('./FallingBallGame'),
});
