import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'dino-runner',
  title: 'Dino Runner',
  category: 'arcade',
  difficulty: 'easy',
  icon: '🦖',
  tags: ['runner', 'jump', 'endless', 'reflex', 'one button'],
  short: 'Help a little dinosaur leap over cacti and duck under birds as the desert speeds up.',
  full: 'An endless desert dash. Your dinosaur runs by itself — jump over cacti, and duck or jump past birds swooping in at different heights. The pace keeps rising, and day turns to night the further you get.',
  minutes: 2,
  controls: {
    keyboard: ['Space or ↑ to jump', '↓ to duck (or to drop faster in the air)'],
    mouse: ['Click to jump'],
    touch: ['Tap the game or the Jump button to jump', 'Hold Duck to duck'],
  },
  instructions: {
    objective: 'Run as far as you can without hitting an obstacle.',
    howToPlay: [
      'Jump over cacti — some are tall, some come in groups.',
      'Birds fly low, in the middle or high: jump the low ones, duck under the high ones.',
      'Holding down in mid-air makes you fall faster, which helps with quick combinations.',
    ],
    scoring: 'One point for every 10 units of distance.',
    difficultyNotes: 'Easy: gentle starting speed and acceleration. Hard: fast from the start and much quicker to accelerate.',
    tips: ['Jump a little early at high speeds.', 'Watch the bird’s height before deciding to jump or duck.'],
    touchNotes: ['Tap anywhere on the game to jump; the Duck button sits beside Jump.'],
  },
  achievements: [
    ['score-500', 'Desert Dash', 'Score 500 in one run.', 500, '🦖', 15],
    ['night', 'Night Runner', 'Keep running until nightfall (700 points).', 1, '🌙', 20],
    ['score-1500', 'Fossil Fuel', 'Score 1,500 in one run.', 1500, '🏆', 40],
    ['birds', 'Bird Dodger', 'Dodge 15 birds in one run.', 15, '🐦', 25],
    ['runs', 'Marathon', 'Play 25 runs.', 25, '👟', 20],
  ],
  load: () => import('./DinoRunnerGame'),
});
