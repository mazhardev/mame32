import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'zombie-survival',
  title: 'Zombie Survival',
  category: 'action',
  difficulty: 'hard',
  icon: '🧟',
  tags: ['survival', 'waves', 'shooter', 'top-down', 'action'],
  short: 'Hold out against waves of cartoon zombies — and watch your ammo.',
  full: 'A top-down survival shooter with a cartoon look. Waves of shambling zombies close in from every side. Your pistol holds twelve rounds and spare ammo is limited, so aim carefully and reload at the right moment. Fast runners join from wave 2 and hulking brutes from wave 3. Supply crates after each wave restock ammo or patch you up.',
  minutes: 5,
  controls: {
    keyboard: ['WASD or arrows move', 'Space fires in the direction you move', 'X or Shift reloads'],
    mouse: ['Aim with the mouse, hold the button to fire'],
    touch: ['Direction pad moves', 'Touch and hold the play area to aim and fire', 'R reloads'],
  },
  instructions: {
    objective: 'Survive as many waves as you can.',
    howToPlay: [
      'Zombies walk towards you. Each touch costs one of your five hearts.',
      'Your magazine holds 12 rounds; reloading takes about a second and uses your reserve.',
      'Clear a wave to get a short breather and a supply crate.',
      'Runners are fast but fragile; brutes are slow and take many hits.',
    ],
    scoring: '10 points per walker, 15 per runner, 50 per brute, plus a bonus for every wave cleared.',
    difficultyNotes: 'Higher difficulty makes every zombie faster.',
    tips: ['Keep moving in wide circles so the crowd follows in a line.', 'Reload while there is space around you, not with a full magazine half-empty in a crowd.', 'Pick up the ammo zombies sometimes drop.'],
    touchNotes: ['Move with your left thumb and hold your right finger on the play area where you want to shoot.'],
  },
  achievements: [
    ['wave-5', 'Holding Out', 'Reach wave 5.', 5, '🧟', 15],
    ['wave-10', 'Last One Standing', 'Reach wave 10.', 10, '🏆', 30],
    ['kills-100', 'Hundred Down', 'Stop 100 zombies in one game.', 100, '🔫', 25],
    ['total', 'Apocalypse Veteran', 'Stop 1,000 zombies in total.', 1000, '🎖️', 30],
  ],
  load: () => import('./ZombieSurvivalGame'),
});
