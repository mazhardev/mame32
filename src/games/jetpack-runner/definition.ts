import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'jetpack-runner',
  title: 'Jetpack Runner',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🚀',
  tags: ['runner', 'jetpack', 'hold', 'coins', 'endless', 'one button'],
  short: 'Hold to fly, let go to fall — jetpack through a lab full of zappers and rockets.',
  full: 'Strap on a jetpack and dash down an endless laboratory corridor. Hold to rise, release to drop, and thread your way between electric zappers. Rockets lock on to your height after a flashing warning, so keep moving. Grab coin trails for bonus points.',
  minutes: 3,
  controls: {
    keyboard: ['Hold Space or ↑ to fly up; release to fall'],
    mouse: ['Hold the mouse button to fly up'],
    touch: ['Touch and hold anywhere on the game to fly up'],
  },
  instructions: {
    objective: 'Travel as far as possible without touching a zapper or a rocket.',
    howToPlay: [
      'Holding makes the jetpack push you up; letting go lets gravity pull you down.',
      'Blue zappers are deadly beams; some later ones rotate.',
      'A red "!" on the right means a rocket is aiming at your height — move away before it fires.',
      'Coins add bonus points.',
    ],
    scoring: '1 point per 25 units flown plus 5 points per coin.',
    difficultyNotes: 'Easy: slower, with rare rockets. Hard: fast, with frequent rockets.',
    tips: ['Tap rapidly to hover at one height.', 'Dodge rockets at the last moment with a short burst.'],
    touchNotes: ['Hold a finger on the game to fly.'],
  },
  achievements: [
    ['distance', 'Lift Off', 'Fly 500 m in one flight.', 500, '🚀', 15],
    ['far', 'Deep Space', 'Fly 2,000 m in one flight.', 2000, '🌌', 40],
    ['coins', 'Coin Magnet', 'Collect 80 coins in one flight.', 80, '🧲', 25],
    ['flights', 'Test Pilot', 'Make 25 flights.', 25, '👩‍🚀', 20],
  ],
  load: () => import('./JetpackRunnerGame'),
});
