import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'cloud-jumper',
  title: 'Cloud Jumper',
  category: 'arcade',
  difficulty: 'easy',
  icon: '☁️',
  tags: ['jumping', 'platform', 'endless', 'climb', 'tilt'],
  short: 'Bounce from cloud to cloud and climb as high as the sky goes.',
  full: 'An endless climb through the clouds. Your little jumper bounces all by itself — you just steer left and right. Drifting clouds, crumbling clouds and springy clouds keep you on your toes, and higher up grumpy storm monsters appear: stomp them from above, but don’t bump into them. Fly off one side of the screen to reappear on the other.',
  minutes: 3,
  controls: {
    keyboard: ['← / → steer'],
    mouse: ['Hold the button on the left or right half of the game to steer'],
    touch: ['Hold the left or right half of the game, or use ◀ ▶'],
  },
  instructions: {
    objective: 'Climb as high as possible.',
    howToPlay: [
      'The jumper bounces whenever it lands on a cloud while falling.',
      'Grey cracked clouds crumble — you fall straight through them.',
      'Clouds with a spring launch you much higher.',
      'Land on a storm monster to stomp it; touching it any other way ends the climb.',
      'Falling below the bottom of the screen ends the climb.',
    ],
    scoring: 'Your score is the height you reach, plus 50 per stomped monster.',
    difficultyNotes: 'Easy: clouds are close together. Hard: wider gaps.',
    tips: ['Aim for the cloud directly above rather than the nearest one.', 'Use the screen wrap to reach clouds on the far side quickly.'],
    touchNotes: ['Hold the left or right side of the game to steer.'],
  },
  achievements: [
    ['five-hundred', 'Head in the Clouds', 'Reach a height of 500.', 500, '☁️', 15],
    ['two-thousand', 'Stratosphere', 'Reach a height of 2,000.', 2000, '🌌', 40],
    ['stomp', 'Storm Stomper', 'Stomp 3 monsters in one climb.', 3, '⛈️', 25],
    ['games', 'Sky High', 'Play 25 climbs.', 25, '🪂', 20],
  ],
  load: () => import('./CloudJumperGame'),
});
