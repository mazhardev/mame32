import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'missile-defense',
  title: 'Missile Defense',
  category: 'arcade',
  difficulty: 'medium',
  icon: '🛡️',
  tags: ['defense', 'aim', 'waves', 'classic', 'strategy'],
  short: 'Launch interceptors to shield six cities from waves of falling missiles.',
  full: 'Defend six cities from waves of incoming missiles. Tap a spot in the sky to fire an interceptor from the nearest battery; it explodes into an expanding blast that destroys any missile inside. Lead your shots, catch several missiles with one blast, and ration your ammunition — later waves bring faster missiles that split in mid-air.',
  minutes: 5,
  controls: {
    keyboard: ['Arrow keys move the crosshair', 'Space fires at the crosshair'],
    mouse: ['Click where the interceptor should explode'],
    touch: ['Tap where the interceptor should explode'],
  },
  instructions: {
    objective: 'Survive as many waves as possible.',
    howToPlay: [
      'Each tap fires from the nearest battery that still has ammunition (shown under each battery).',
      'Interceptors explode where you aimed; the blast grows then fades.',
      'Missiles that reach the ground destroy a city or a battery. Batteries are rebuilt each wave; cities are not.',
      'From wave 3 some missiles split into three on the way down.',
    ],
    scoring: '25 points per missile. After each wave: 100 per surviving city and 5 per unused interceptor.',
    difficultyNotes: 'Easy: slow missiles. Hard: fast missiles from the first wave.',
    tips: ['Aim ahead of missiles — blasts take a moment to grow.', 'One well-placed blast can catch several missiles.'],
    touchNotes: ['Tap the sky wherever you want a blast.'],
  },
  achievements: [
    ['wave-5', 'Holding the Line', 'Reach wave 5.', 5, '🛡️', 20],
    ['wave-10', 'Iron Dome', 'Reach wave 10.', 10, '🏰', 40],
    ['kills', 'Sky Sweeper', 'Destroy 100 missiles in one game.', 100, '💥', 30],
    ['total', 'Guardian', 'Destroy 1,000 missiles in total.', 1000, '🎖️', 30],
  ],
  load: () => import('./MissileDefenseGame'),
});
