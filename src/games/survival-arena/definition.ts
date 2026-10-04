import { defineGame } from '../_shared/defineGame';

export const game = defineGame({
  id: 'survival-arena',
  title: 'Survival Arena',
  category: 'action',
  difficulty: 'hard',
  icon: '⚔️',
  tags: ['survival', 'waves', 'dash', 'combo', 'action'],
  short: 'No weapons, just a dash: zip through enemies to defeat them and survive the arena.',
  full: 'An arena survival game built around one move: the dash. Dashing makes you briefly untouchable and defeats every enemy you pass through, but it needs a moment to recharge — and between dashes you are vulnerable. Slimes split into two when hit, bats flutter around you and archers fire from a distance. Chain several enemies into one dash for a combo.',
  minutes: 4,
  controls: {
    keyboard: ['WASD or arrows move', 'Space dashes in the direction you are moving'],
    mouse: ['Click to dash towards the pointer'],
    touch: ['Direction pad moves', 'Tap the play area to dash towards your finger, or press Dash'],
  },
  instructions: {
    objective: 'Survive as long as possible and defeat as many enemies as you can.',
    howToPlay: [
      'Touching an enemy while not dashing costs a heart. You have three.',
      'Dash through enemies to defeat them. The ring around you turns green when the dash is ready.',
      'Slimes split into two smaller slimes. Archers shoot arrows, which a dash also passes through.',
      'Defeated enemies sometimes drop a heart.',
    ],
    scoring: 'Each enemy is worth 10 points times its place in the current dash combo.',
    difficultyNotes: 'Higher difficulty lengthens the dash cooldown.',
    tips: ['Let enemies bunch up, then dash through the line.', 'Dash away from danger as well as into it.'],
    touchNotes: ['Move with the pad and tap where you want to dash.'],
  },
  achievements: [
    ['survive-60', 'Gladiator', 'Survive 60 seconds.', 60, '⚔️', 20],
    ['combo-5', 'Whirlwind', 'Defeat 5 enemies in one dash combo.', 5, '🌪️', 25],
    ['kills-100', 'Arena Champion', 'Defeat 100 enemies in one game.', 100, '🏆', 30],
    ['total', 'Legend of the Arena', 'Defeat 1,000 enemies in total.', 1000, '🎖️', 30],
  ],
  load: () => import('./SurvivalArenaGame'),
});
