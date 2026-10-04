import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'keep-the-ball-up',
  title: 'Keep the Ball Up',
  category: 'casual',
  difficulty: 'easy',
  icon: '🎈',
  tags: ['timing', 'juggling', 'tap', 'endless', 'casual'],
  short: 'Keepy-uppy: tap the ball to kick it into the air and never let it touch the grass.',
  full: 'How many kicks can you manage? Tap the ball to send it flying. Where you tap decides the direction: hit the left side to send it right, the right side to send it left, or dead centre to go straight up. The ball bounces off the walls and comes down faster as the round goes on.',
  minutes: 1,
  mouse: true,
  controls: {
    keyboard: ['Space kicks the ball when it is in the lower half (a slightly random kick)'],
    mouse: ['Click the ball to kick it'],
    touch: ['Tap the ball to kick it'],
  },
  instructions: {
    objective: 'Kick the ball as many times as possible before it lands.',
    howToPlay: [
      'Tap or click on the ball to kick it upwards.',
      'Tapping off-centre sends the ball sideways, away from your finger.',
      'The ball bounces off the side walls and the top of the screen.',
      'If it touches the ground, the round ends.',
    ],
    scoring: 'One point per kick.',
    difficultyNotes: 'Higher difficulty means stronger gravity. Hard adds a shifting wind.',
    tips: ['Tap slightly below the centre of the ball for a straight kick.', 'Let the ball fall a little before kicking; there is more time than it seems.'],
    touchNotes: ['Tap directly on the ball; taps just outside it still count.'],
  },
  achievements: [
    ['kicks-10', 'Keepy-Uppy', 'Make 10 kicks in a row.', 10, '⚽', 10],
    ['kicks-50', 'Ball Juggler', 'Make 50 kicks in a row.', 50, '🏆', 30],
    ['total', 'Thousand Touches', 'Make 1,000 kicks in total.', 1000, '🎖️', 30],
  ],
  load: () => import('./KeepTheBallUpGame'),
});
