import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'alien-invasion',
  title: 'Alien Invasion',
  category: 'action',
  difficulty: 'medium',
  icon: '👽',
  tags: ['shooter', 'waves', 'defense', 'aim', 'action'],
  short: 'Flying saucers bomb the city and beam up buildings — aim your turret and stop them.',
  full: 'Defend a little city from a cartoon alien invasion. Saucers zigzag across the sky dropping bombs, and green abductor ships hover over a building and slowly beam it away. Aim your turret freely and shoot them down; you can even shoot falling bombs out of the air. Rescue a building mid-abduction for a big bonus. The invasion wins when the last building is gone.',
  minutes: 5,
  controls: {
    keyboard: ['← → rotate the turret', 'Space fires'],
    mouse: ['Aim with the mouse, hold the button to fire'],
    touch: ['Touch and hold the sky to aim and fire', 'Or use the arrows and Fire button'],
  },
  instructions: {
    objective: 'Protect the city for as many waves as possible.',
    howToPlay: [
      'Grey saucers fly across dropping bombs. Each building survives three bomb hits.',
      'Green abductors hover over a building and lift it with a beam. Destroy them in time to drop the building back.',
      'Your bolts also destroy bombs in mid-air.',
      'A wave ends when all its ships are gone; surviving buildings earn a bonus.',
    ],
    scoring: '25 per saucer, 75 per abductor, 100 per rescued building, 5 per bomb shot down, and 100 per building alive after each wave.',
    difficultyNotes: 'Higher difficulty brings ships faster, bombing more often and abducting more quickly.',
    tips: ['Prioritise abductors: losing a whole building is worse than a bomb hit.', 'Lead your shots — saucers keep moving.'],
    touchNotes: ['Hold your finger where you want the turret to shoot.'],
  },
  achievements: [
    ['wave-5', 'City Defender', 'Reach wave 5.', 5, '👽', 20],
    ['rescue', 'Not on My Watch', 'Rescue 3 buildings from abduction in one game.', 3, '🏙️', 25],
    ['total', 'Saucer Smasher', 'Shoot down 300 ships in total.', 300, '🎖️', 30],
  ],
  load: () => import('./AlienInvasionGame'),
});
