import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'endless-jumper',
  title: 'Endless Jumper',
  category: 'casual',
  difficulty: 'medium',
  icon: '🦘',
  tags: ['one button', 'jump', 'endless', 'timing', 'casual'],
  short: 'Wall-jump up an endless shaft — leap between the walls to dodge the spikes.',
  full: 'A one-tap climbing game. Your kangaroo clings to a wall and climbs automatically. Tap to leap across to the opposite wall. Spikes jut out of both walls: jump away before you climb into one, and make sure the other side is clear before you land. Grab gems for bonus points as the climb speeds up.',
  minutes: 2,
  controls: {
    keyboard: ['Space, Enter or ← / → leaps to the other wall'],
    mouse: ['Click to leap'],
    touch: ['Tap to leap'],
  },
  instructions: {
    objective: 'Climb as high as you can.',
    howToPlay: [
      'You climb the wall you are clinging to automatically.',
      'Tap to leap across the shaft to the other wall.',
      'Touching spikes while clinging to a wall ends the run. You are safe in mid-air.',
      'Gems sit opposite some spikes; collect them for bonus points.',
    ],
    scoring: 'One point per metre climbed, plus 20 per gem.',
    difficultyNotes: 'Higher difficulty starts the climb faster. Speed increases over time on every level.',
    tips: ['Leap as soon as a spike appears above you, but check the other wall first.', 'A leap lasts about a third of a second; plan the landing.'],
    touchNotes: ['Tap anywhere on the play area.'],
  },
  achievements: [
    ['height-100', 'Climber', 'Climb 100 m.', 100, '🧗', 15],
    ['height-300', 'Sky Scraper', 'Climb 300 m.', 300, '🏆', 30],
    ['gems-10', 'Gem Hopper', 'Collect 10 gems in one run.', 10, '💎', 20],
    ['total', 'Mountain Roo', 'Climb 3,000 m in total.', 3000, '🎖️', 30],
  ],
  load: () => import('./EndlessJumperGame'),
});
