import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'robot-shooter',
  title: 'Robot Shooter',
  category: 'action',
  difficulty: 'medium',
  icon: '🤖',
  tags: ['shooter', 'waves', 'cover', 'top-down', 'action'],
  short: 'Robots shoot back — use cover, let your shield recharge and pick them off.',
  full: 'A tactical top-down shooter. Robots fire at you, so standing in the open is a bad idea. Duck behind the cover blocks, which stop every bullet, and your shield recharges after a few quiet seconds. Drones fire single shots, gunners keep their distance and fire bursts, and chargers rush straight at you.',
  minutes: 5,
  controls: {
    keyboard: ['WASD or arrows move', 'Space fires in the direction you move'],
    mouse: ['Aim with the mouse, hold the button to fire'],
    touch: ['Direction pad moves', 'Touch and hold the play area to aim and fire'],
  },
  instructions: {
    objective: 'Destroy as many waves of robots as you can.',
    howToPlay: [
      'Your shield (blue ring) absorbs hits first; then your hull takes damage.',
      'Avoid damage for three seconds and the shield starts to recharge.',
      'Grey blocks stop all bullets — yours and theirs.',
      'Lose all four hull points and the game ends.',
    ],
    scoring: '20 points per drone or charger, 30 per gunner, plus a bonus for each wave.',
    difficultyNotes: 'Higher difficulty makes the robots aim more accurately.',
    tips: ['Peek out, fire, and duck back behind cover.', 'Deal with chargers first: they ignore cover and hit hard.'],
    touchNotes: ['Move with your left thumb and hold your right finger where you want to shoot.'],
  },
  achievements: [
    ['wave-5', 'Scrap Collector', 'Reach wave 5.', 5, '🤖', 15],
    ['wave-10', 'Robot Wrecker', 'Reach wave 10.', 10, '🏆', 30],
    ['kills-50', 'Circuit Breaker', 'Destroy 50 robots in one game.', 50, '⚡', 25],
    ['total', 'Recycling Plant', 'Destroy 500 robots in total.', 500, '🎖️', 30],
  ],
  load: () => import('./RobotShooterGame'),
});
