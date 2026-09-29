import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'cannon-shooter',
  title: 'Cannon Shooter',
  category: 'arcade',
  difficulty: 'easy',
  icon: '💣',
  tags: ['cannon', 'shooter', 'physics', 'bounce', 'boulders', 'casual'],
  short: 'Slide your cannon under bouncing boulders and blast them to bits.',
  full: 'Numbered boulders drop into the valley and bounce around. Your cannon fires on its own — all you have to do is slide it underneath them. Every shot knocks a point off a boulder; at zero, big boulders split into two smaller ones. Clear every boulder to finish the level and power up your cannon. Just don’t let one land on you.',
  minutes: 5,
  controls: {
    keyboard: ['← / → or A / D move the cannon'],
    mouse: ['Move the mouse across the game to steer the cannon'],
    touch: ['Drag anywhere on the game, or use the ◀ ▶ buttons'],
  },
  instructions: {
    objective: 'Break every boulder in each level without getting squashed.',
    howToPlay: [
      'The cannon fires straight up automatically.',
      'The number on a boulder is how many hits it can take.',
      'Big boulders split into two smaller ones; the smallest simply shatter.',
      'A boulder landing on the cannon costs a life. You have three.',
      'The cannon fires faster every level and hits harder every three levels.',
    ],
    scoring: '1 point per hit, the boulder’s starting number when it breaks, and 25 × the level number for each level cleared.',
    difficultyNotes: 'Easy boulders take about 30% fewer hits; Hard boulders take about a third more.',
    tips: ['Stay under the highest boulder — it is the furthest from landing on you.', 'Small boulders bounce low: slip under them between bounces.'],
    touchNotes: ['Keep your finger on the game and slide it left and right.'],
  },
  achievements: [
    ['level-5', 'Demolition Crew', 'Reach level 5.', 5, '💣', 20],
    ['level-10', 'Boulder Buster', 'Reach level 10.', 10, '🏅', 40],
    ['score', 'Heavy Artillery', 'Score 3,000 points.', 3000, '🏆', 30],
    ['smashed', 'Rock Crusher', 'Break 500 boulders in total.', 500, '🪨', 30],
  ],
  load: () => import('./CannonShooterGame'),
});
